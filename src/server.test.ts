import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import { type AddressInfo, createServer as createTcpServer, Server as NetServer } from 'node:net';
import { afterEach, beforeEach, describe, mock, test } from 'node:test';
import { setTimeout as sleep } from 'node:timers/promises';
import type { SystemMetrics } from './metrics/collector.ts';
import { broadcast, connectedClients, parsePort, startServer } from './server.ts';

interface Client {
  response: Response;
  abort: () => void;
}

const DEFAULT_PORT = 6701;
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

const urlOf = (server: Server, path = '/') => `http://127.0.0.1:${portOf(server)}${path}`;

function getFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const probe = createTcpServer();
    probe.once('error', reject);
    probe.listen(0, () => {
      const { port } = probe.address() as AddressInfo;
      probe.close(() => resolve(port));
    });
  });
}

async function waitUntil(condition: () => boolean, timeoutMs = 2000) {
  const deadline = Date.now() + timeoutMs;
  while (!condition()) {
    if (Date.now() > deadline) {
      throw new Error('condition was not met in time');
    }
    await sleep(20);
  }
}

async function subscribe(server: Server, path = '/'): Promise<Client> {
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

describe('startServer', () => {
  let originalPort: string | undefined;

  beforeEach(() => {
    originalPort = process.env.PORT;
  });

  afterEach(() => {
    mock.restoreAll();
    if (originalPort === undefined) {
      delete process.env.PORT;
    } else {
      process.env.PORT = originalPort;
    }
  });

  test('sends SSE headers and status 200 on GET /', async () => {
    const server = await listen(0);
    const { response } = await subscribe(server);

    assert.equal(response.status, 200);
    assert.equal(response.headers.get('content-type'), 'text/event-stream');
    assert.equal(response.headers.get('cache-control'), 'no-cache');
    assert.equal(response.headers.get('connection'), 'keep-alive');
    assert.equal(response.headers.get('content-length'), null);
  });

  test('handles GET / with query parameters as an SSE stream', async () => {
    const server = await listen(0);
    const { response } = await subscribe(server, '/?token=1');

    assert.equal(response.status, 200);
    assert.equal(response.headers.get('content-type'), 'text/event-stream');
  });

  test('responds 404 to unknown paths', async () => {
    const server = await listen(0);
    const response = await fetch(urlOf(server, '/metrics'));

    assert.equal(response.status, 404);
    assert.equal(response.headers.get('content-type'), 'text/plain; charset=utf-8');
    assert.equal(await response.text(), 'not found');
  });

  test('uses the passed port', async () => {
    const port = await getFreePort();

    assert.equal(portOf(await listen(port)), port);
  });

  test('uses the port from the PORT environment variable', async () => {
    const port = await getFreePort();
    process.env.PORT = String(port);

    assert.equal(portOf(await listen()), port);
  });

  for (const value of ['abc', '-1', '65536', '3.14', '']) {
    test(`does not crash on invalid PORT=${JSON.stringify(value)} and falls back to the default port`, async () => {
      process.env.PORT = value;
      const listenPorts: number[] = [];
      mock.method(
        NetServer.prototype,
        'listen',
        function (this: NetServer, port: number, callback: () => void) {
          listenPorts.push(port);
          callback();
          return this;
        },
      );

      await assert.doesNotReject(startServer());
      assert.deepEqual(listenPorts, [DEFAULT_PORT]);
    });
  }

  describe('parsePort', () => {
    const cases: [string | undefined, number][] = [
      [undefined, DEFAULT_PORT],
      ['', DEFAULT_PORT],
      ['1024', DEFAULT_PORT],
      ['1025', 1025],
      ['8080', 8080],
      ['65535', 65535],
      ['abc', DEFAULT_PORT],
      ['-1', DEFAULT_PORT],
      ['65536', DEFAULT_PORT],
      ['3.14', DEFAULT_PORT],
    ];

    for (const [value, expected] of cases) {
      test(`parsePort(${JSON.stringify(value)}) returns ${expected}`, () => {
        assert.equal(parsePort(value), expected);
      });
    }
  });
});
