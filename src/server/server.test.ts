import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import { type AddressInfo, createServer as createTcpServer, Server as NetServer } from 'node:net';
import { afterEach, beforeEach, describe, mock, test } from 'node:test';
import { setTimeout as sleep } from 'node:timers/promises';
import { parsePort, startServer } from './server.ts';
import { connectedClients } from './sse.ts';

interface Client {
  response: Response;
  abort: () => void;
}

const DEFAULT_PORT = 6701;

const servers: Server[] = [];

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

  test('sends SSE headers and status 200 on GET /sse', async () => {
    const server = await listen(0);
    const { response } = await subscribe(server, '/sse');

    assert.equal(response.status, 200);
    assert.equal(response.headers.get('content-type'), 'text/event-stream');
    assert.equal(response.headers.get('cache-control'), 'no-cache');
    assert.equal(response.headers.get('connection'), 'keep-alive');
    assert.equal(response.headers.get('content-length'), null);
  });

  test('handles GET /sse with query parameters as an SSE stream', async () => {
    const server = await listen(0);
    const { response } = await subscribe(server, '/sse?token=1');

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
