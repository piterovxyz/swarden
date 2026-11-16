import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import { type AddressInfo, createServer as createTcpServer, Server as NetServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, mock, test } from 'node:test';
import { setTimeout as sleep } from 'node:timers/promises';
import type { FastifyInstance } from 'fastify';
import { parsePort, startServer } from './server.ts';
import { connectedClients } from './sse.ts';

interface Client {
  response: Response;
  abort: () => void;
}

const DEFAULT_PORT = 8888;

const apps: FastifyInstance[] = [];

async function listen(port?: number, webDir?: string): Promise<FastifyInstance> {
  const app = await startServer(port, webDir);
  apps.push(app);
  return app;
}

const portOf = (app: FastifyInstance) => (app.server.address() as AddressInfo).port;

const urlOf = (app: FastifyInstance, path = '/') => `http://127.0.0.1:${portOf(app)}${path}`;

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

async function subscribe(app: FastifyInstance, path = '/api/sse'): Promise<Client> {
  const controller = new AbortController();
  const response = await fetch(urlOf(app, path), { signal: controller.signal });
  return { response, abort: () => controller.abort() };
}

afterEach(async () => {
  for (const app of apps.splice(0)) {
    await app.close();
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

  test('sends SSE headers and status 200 on GET /api/sse', async () => {
    const app = await listen(0);
    const { response } = await subscribe(app, '/api/sse');

    assert.equal(response.status, 200);
    assert.equal(response.headers.get('content-type'), 'text/event-stream');
    assert.equal(response.headers.get('cache-control'), 'no-cache');
    assert.equal(response.headers.get('connection'), 'keep-alive');
    assert.equal(response.headers.get('content-length'), null);
  });

  test('handles GET /api/sse with query parameters as an SSE stream', async () => {
    const app = await listen(0);
    const { response } = await subscribe(app, '/api/sse?token=1');

    assert.equal(response.status, 200);
    assert.equal(response.headers.get('content-type'), 'text/event-stream');
  });

  test('responds 404 to the old /sse path', async () => {
    const app = await listen(0);
    const response = await fetch(urlOf(app, '/sse'));

    assert.equal(response.status, 404);
    assert.equal(response.headers.get('content-type'), 'text/plain; charset=utf-8');
    assert.equal(await response.text(), 'not found');
  });

  test('responds 404 to unknown paths', async () => {
    const app = await listen(0);
    const response = await fetch(urlOf(app, '/metrics'));

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
      const originalListen = NetServer.prototype.listen;
      mock.method(
        NetServer.prototype,
        'listen',
        function (this: NetServer, options: { port: number; host: string }, ...rest: unknown[]) {
          listenPorts.push(options.port);
          return Reflect.apply(originalListen, this, [{ ...options, port: 0 }, ...rest]);
        },
      );

      await assert.doesNotReject(listen());
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

  describe('with a web directory', () => {
    let webDir: string;

    beforeEach(() => {
      webDir = fs.mkdtempSync(join(tmpdir(), 'swarden-web-'));
      fs.writeFileSync(join(webDir, 'index.html'), '<main>app</main>');
      fs.mkdirSync(join(webDir, 'assets'));
      fs.writeFileSync(join(webDir, 'assets', 'app.js'), 'console.log(1);');
    });

    afterEach(() => {
      fs.rmSync(webDir, { recursive: true, force: true });
    });

    test('serves index.html on /', async () => {
      const app = await listen(0, webDir);
      const response = await fetch(urlOf(app, '/'));

      assert.equal(response.status, 200);
      assert.equal(await response.text(), '<main>app</main>');
    });

    test('serves static assets', async () => {
      const app = await listen(0, webDir);
      const response = await fetch(urlOf(app, '/assets/app.js'));

      assert.equal(response.status, 200);
      assert.equal(await response.text(), 'console.log(1);');
    });

    test('falls back to index.html for client-side routes', async () => {
      const app = await listen(0, webDir);
      const response = await fetch(urlOf(app, '/some/route'));

      assert.equal(response.status, 200);
      assert.equal(await response.text(), '<main>app</main>');
    });

    test('responds 404 to unknown api paths instead of index.html', async () => {
      const app = await listen(0, webDir);
      const response = await fetch(urlOf(app, '/api/unknown'));

      assert.equal(response.status, 404);
      assert.equal(response.headers.get('content-type'), 'text/plain; charset=utf-8');
      assert.equal(await response.text(), 'not found');
    });

    test('still serves SSE on /api/sse', async () => {
      const app = await listen(0, webDir);
      const { response } = await subscribe(app, '/api/sse');

      assert.equal(response.status, 200);
      assert.equal(response.headers.get('content-type'), 'text/event-stream');
    });
  });
});
