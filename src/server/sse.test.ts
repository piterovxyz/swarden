import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterEach, describe, test } from 'node:test';
import { setTimeout as sleep } from 'node:timers/promises';
import type { SystemMetrics } from '../metrics/collector.ts';
import { startServer } from './server.ts';
import { broadcast, connectedClients } from './sse.ts';

interface Client {
  response: Response;
  abort: () => void;
}

const SSE_PREFIX = 'data: ';

const servers: Server[] = [];

const metrics = (usage: number): SystemMetrics => ({
  cpu: { usage_percent: usage },
  mem: { total: 16318412, available: 8765432 },
});

const sseEvent = (message: SystemMetrics) => `${SSE_PREFIX}${JSON.stringify(message)}\n\n`;

const countEvents = (text: string) => text.split('\n\n').length - 1;

async function listen(port?: number): Promise<Server> {
  const server = await startServer(port);
  servers.push(server);
  return server;
}

const portOf = (server: Server) => (server.address() as AddressInfo).port;

const urlOf = (server: Server, path = '/sse') => `http://127.0.0.1:${portOf(server)}${path}`;

async function waitUntil(condition: () => boolean, timeoutMs = 2000) {
  const deadline = Date.now() + timeoutMs;
  while (!condition()) {
    if (Date.now() > deadline) {
      throw new Error('condition was not met in time');
    }
    await sleep(20);
  }
}

async function subscribe(server: Server, path = '/sse'): Promise<Client> {
  const controller = new AbortController();
  const response = await fetch(urlOf(server, path), { signal: controller.signal });
  return { response, abort: () => controller.abort() };
}

function readerOf(client: Client) {
  if (!client.response.body) {
    throw new Error('response has no body');
  }
  return client.response.body.getReader();
}

async function readEvents(
  reader: { read(): Promise<{ done: boolean; value?: Uint8Array }> },
  count: number,
): Promise<string> {
  const decoder = new TextDecoder();
  let text = '';
  while (countEvents(text) < count) {
    const { value, done } = await reader.read();
    if (done) {
      break;
    }
    text += decoder.decode(value, { stream: true });
  }
  return text;
}

function closeServer(server: Server): Promise<void> {
  server.closeAllConnections();
  return new Promise((resolve) => {
    server.close(() => resolve());
  });
}

afterEach(async () => {
  for (const server of servers.splice(0)) {
    await closeServer(server);
  }
  await waitUntil(() => connectedClients() === 0);
});

describe('broadcast', () => {
  test('does not throw when there are no connected clients', () => {
    assert.doesNotThrow(() => broadcast(metrics(1)));
  });

  test('sends the message strictly in SSE format: "data: <json>\\n\\n"', async () => {
    const server = await listen(0);
    const client = await subscribe(server);
    const message = metrics(42.5);

    broadcast(message);

    assert.equal(await readEvents(readerOf(client), 1), sseEvent(message));
  });

  test('separates multiple messages with a blank line', async () => {
    const server = await listen(0);
    const client = await subscribe(server);
    const first = metrics(1);
    const second = metrics(2);

    broadcast(first);
    broadcast(second);

    assert.equal(await readEvents(readerOf(client), 2), sseEvent(first) + sseEvent(second));
  });

  test('broadcasts the same message to all connected clients', async () => {
    const server = await listen(0);
    const clients = [await subscribe(server), await subscribe(server), await subscribe(server)];
    const message = metrics(10);

    broadcast(message);

    for (const client of clients) {
      assert.equal(await readEvents(readerOf(client), 1), sseEvent(message));
    }
  });

  test('a disconnected client does not stop broadcasting to the others', async () => {
    const server = await listen(0);
    const gone = await subscribe(server);
    const healthy = [await subscribe(server), await subscribe(server)];

    gone.abort();
    await waitUntil(() => connectedClients() === healthy.length);

    const first = metrics(1);
    const second = metrics(2);
    broadcast(first);
    broadcast(second);

    for (const client of healthy) {
      assert.equal(await readEvents(readerOf(client), 2), sseEvent(first) + sseEvent(second));
    }
  });

  test('broadcast does not throw when all clients have disconnected', async () => {
    const server = await listen(0);
    const clients = [await subscribe(server), await subscribe(server)];

    for (const client of clients) {
      client.abort();
    }
    await waitUntil(() => connectedClients() === 0);

    assert.doesNotThrow(() => broadcast(metrics(1)));
  });

  test('under a large message flood, no messages are lost and they arrive in order', {
    timeout: 30_000,
  }, async () => {
    const server = await listen(0);
    const clients = [await subscribe(server), await subscribe(server)];
    const total = 10_000;

    for (let i = 0; i < total; i++) {
      broadcast(metrics(i));
    }

    const expected = Array.from({ length: total }, (_, i) => sseEvent(metrics(i))).join('');
    for (const client of clients) {
      assert.equal(await readEvents(readerOf(client), total), expected);
    }
  });
});
