import { afterEach, beforeEach, describe, expect, mock, spyOn, test } from 'bun:test';
import type { SystemMetrics } from './metrics/collector';
import { broadcast, parsePort, startServer } from './server';

type Server = ReturnType<typeof startServer>;

interface Client {
  response: Promise<Response>;
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

function listen(port?: number): Server {
  const server = startServer(port);
  servers.push(server);
  return server;
}

const urlOf = (server: Server, path = '/') => `http://127.0.0.1:${server.port}${path}`;

function getFreePort(): number {
  const probe = Bun.serve({ port: 0, fetch: () => new Response() });
  const port = probe.port;
  probe.stop(true);
  if (port === undefined) {
    throw new Error('probe server has no TCP port');
  }
  return port;
}

async function waitUntil(condition: () => boolean, timeoutMs = 2000) {
  const deadline = Date.now() + timeoutMs;
  while (!condition()) {
    if (Date.now() > deadline) {
      throw new Error('condition was not met in time');
    }
    await Bun.sleep(20);
  }
}

async function subscribe(server: Server, path = '/'): Promise<Client> {
  const controller = new AbortController();
  const before = server.pendingRequests;
  const response = fetch(urlOf(server, path), { signal: controller.signal });
  response.catch(() => undefined);
  await waitUntil(() => server.pendingRequests > before);
  return { response, abort: () => controller.abort() };
}

async function readerOf(client: Client) {
  const response = await client.response;
  if (!response.body) {
    throw new Error('response has no body');
  }
  return response.body.getReader();
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
  for (const server of servers.splice(0)) {
    await server.stop(true);
  }
});

describe('broadcast', () => {
  test('does not throw when there are no connected clients', () => {
    expect(() => broadcast(metrics(1))).not.toThrow();
  });

  test('sends the message strictly in SSE format: "data: <json>\\n\\n"', async () => {
    const server = listen(0);
    const client = await subscribe(server);
    const message = metrics(42.5);

    broadcast(message);

    expect(await readEvents(await readerOf(client), 1)).toBe(sseEvent(message));
  });

  test('separates multiple messages with a blank line', async () => {
    const server = listen(0);
    const client = await subscribe(server);
    const first = metrics(1);
    const second = metrics(2);

    broadcast(first);
    broadcast(second);

    expect(await readEvents(await readerOf(client), 2)).toBe(sseEvent(first) + sseEvent(second));
  });

  test('broadcasts the same message to all connected clients', async () => {
    const server = listen(0);
    const clients = [await subscribe(server), await subscribe(server), await subscribe(server)];
    const message = metrics(10);

    broadcast(message);

    for (const client of clients) {
      expect(await readEvents(await readerOf(client), 1)).toBe(sseEvent(message));
    }
  });

  test('a disconnected client does not stop broadcasting to the others', async () => {
    const server = listen(0);
    const gone = await subscribe(server);
    const healthy = [await subscribe(server), await subscribe(server)];

    gone.abort();
    await waitUntil(() => server.pendingRequests === healthy.length);

    const first = metrics(1);
    const second = metrics(2);
    broadcast(first);
    broadcast(second);

    for (const client of healthy) {
      expect(await readEvents(await readerOf(client), 2)).toBe(sseEvent(first) + sseEvent(second));
    }
  });

  test('broadcast does not throw when all clients have disconnected', async () => {
    const server = listen(0);
    const clients = [await subscribe(server), await subscribe(server)];

    for (const client of clients) {
      client.abort();
    }
    await waitUntil(() => server.pendingRequests === 0);

    expect(() => broadcast(metrics(1))).not.toThrow();
  });

  test('under a large message flood, no messages are lost and they arrive in order', async () => {
    const server = listen(0);
    const clients = [await subscribe(server), await subscribe(server)];
    const total = 10_000;

    for (let i = 0; i < total; i++) {
      broadcast(metrics(i));
    }

    const expected = Array.from({ length: total }, (_, i) => sseEvent(metrics(i))).join('');
    for (const client of clients) {
      expect(await readEvents(await readerOf(client), total)).toBe(expected);
    }
  }, 30_000);
});

describe('startServer', () => {
  let originalPort: string | undefined;

  beforeEach(() => {
    originalPort = process.env.PORT;
  });

  afterEach(() => {
    mock.restore();
    if (originalPort === undefined) {
      delete process.env.PORT;
    } else {
      process.env.PORT = originalPort;
    }
  });

  test('sends SSE headers and status 200 on GET /', async () => {
    const server = listen(0);
    const client = await subscribe(server);
    broadcast(metrics(1));

    const response = await client.response;

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('text/event-stream');
    expect(response.headers.get('cache-control')).toBe('no-cache');
    expect(response.headers.get('connection')).toBe('keep-alive');
    expect(response.headers.get('content-length')).toBeNull();
  });

  test('handles GET / with query parameters as an SSE stream', async () => {
    const server = listen(0);
    const client = await subscribe(server, '/?token=1');
    broadcast(metrics(1));

    const response = await client.response;

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('text/event-stream');
  });

  test('responds 404 to unknown paths', async () => {
    const response = await fetch(urlOf(listen(0), '/metrics'));

    expect(response.status).toBe(404);
    expect(await response.text()).toBe('not found');
  });

  test('uses the passed port', () => {
    const port = getFreePort();

    expect(listen(port).port).toBe(port);
  });

  test('uses the port from the PORT environment variable', () => {
    const port = getFreePort();
    process.env.PORT = String(port);

    expect(listen().port).toBe(port);
  });

  test.each([['abc'], ['-1'], ['65536'], ['3.14'], ['']])(
    'does not crash on invalid PORT=%s and falls back to the default port',
    (value) => {
      process.env.PORT = value;
      const serve = spyOn(Bun, 'serve').mockImplementation(((options: { port: number }) => ({
        port: options.port,
      })) as unknown as typeof Bun.serve);

      expect(() => startServer()).not.toThrow();
      expect(serve.mock.calls[0]?.[0]).toMatchObject({ port: DEFAULT_PORT });
    },
  );

  describe('parsePort', () => {
    test.each([
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
    ])('parsePort(%p) returns %p', (value, expected) => {
      expect(parsePort(value)).toBe(expected);
    });
  });
});
