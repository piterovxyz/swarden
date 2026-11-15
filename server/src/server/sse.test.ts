import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import { afterEach, describe, test } from 'node:test';
import { setTimeout as sleep } from 'node:timers/promises';
import type { SystemMetrics } from '@swarden/shared';
import type { FastifyInstance } from 'fastify';
import { startServer } from './server.ts';
import { broadcast, connectedClients } from './sse.ts';

interface Client {
  response: Response;
  abort: () => void;
}

const SSE_PREFIX = 'data: ';

const apps: FastifyInstance[] = [];

const metrics = (usage: number): SystemMetrics => ({
  cpu: { usage_percent: usage },
  mem: { total: 16318412, available: 8765432 },
});

const sseEvent = (message: SystemMetrics) => `${SSE_PREFIX}${JSON.stringify(message)}\n\n`;

const countEvents = (text: string) => text.split('\n\n').length - 1;

async function listen(port?: number): Promise<FastifyInstance> {
  const app = await startServer(port);
  apps.push(app);
  return app;
}

const portOf = (app: FastifyInstance) => (app.server.address() as AddressInfo).port;

const urlOf = (app: FastifyInstance, path = '/api/sse') => `http://127.0.0.1:${portOf(app)}${path}`;

async function waitUntil(condition: () => boolean, timeoutMs = 2000) {
  const deadline = Date.now() + timeoutMs;
  while (!condition()) {
    if (Date.now() > deadline) {
      throw new Error('condition was not met in time');
    }
    await sleep(20);
  }
}

async function subscribe(app: FastifyInstance, path = '/api/sse'): Promise<Client> {
  const controller = new AbortController();
  const response = await fetch(urlOf(app, path), { signal: controller.signal });
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

afterEach(async () => {
  for (const app of apps.splice(0)) {
    await app.close();
  }
  await waitUntil(() => connectedClients() === 0);
});

describe('broadcast', () => {
  test('does not throw when there are no connected clients', () => {
    assert.doesNotThrow(() => broadcast(metrics(1)));
  });

  test('sends the message strictly in SSE format: "data: <json>\\n\\n"', async () => {
    const app = await listen(0);
    const client = await subscribe(app);
    const message = metrics(42.5);

    broadcast(message);

    assert.equal(await readEvents(readerOf(client), 1), sseEvent(message));
  });

  test('separates multiple messages with a blank line', async () => {
    const app = await listen(0);
    const client = await subscribe(app);
    const first = metrics(1);
    const second = metrics(2);

    broadcast(first);
    broadcast(second);

    assert.equal(await readEvents(readerOf(client), 2), sseEvent(first) + sseEvent(second));
  });

  test('broadcasts the same message to all connected clients', async () => {
    const app = await listen(0);
    const clients = [await subscribe(app), await subscribe(app), await subscribe(app)];
    const message = metrics(10);

    broadcast(message);

    for (const client of clients) {
      assert.equal(await readEvents(readerOf(client), 1), sseEvent(message));
    }
  });

  test('a disconnected client does not stop broadcasting to the others', async () => {
    const app = await listen(0);
    const gone = await subscribe(app);
    const healthy = [await subscribe(app), await subscribe(app)];

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
    const app = await listen(0);
    const clients = [await subscribe(app), await subscribe(app)];

    for (const client of clients) {
      client.abort();
    }
    await waitUntil(() => connectedClients() === 0);

    assert.doesNotThrow(() => broadcast(metrics(1)));
  });

  test('under a large message flood, no messages are lost and they arrive in order', {
    timeout: 30_000,
  }, async () => {
    const app = await listen(0);
    const clients = [await subscribe(app), await subscribe(app)];
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
