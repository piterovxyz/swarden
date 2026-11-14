import { createServer, type Server } from 'node:http';
import { handleSse } from './sse.ts';

const DEFAULT_PORT = 6701;

export function startServer(port?: number): Promise<Server> {
  const listenPort = port ?? parsePort(process.env.PORT);

  const server = createServer((req, res) => {
    const url = new URL(req.url ?? '/', 'http://localhost');

    if (req.method === 'GET' && url.pathname === '/sse') {
      handleSse(res);
      return;
    }

    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('not found');
  });

  server.requestTimeout = 0;

  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(listenPort, () => resolve(server));
  });
}

export function parsePort(value: string | undefined): number {
  if (!value || !/^\d+$/.test(value.trim())) {
    return DEFAULT_PORT;
  }

  const port = Number(value);
  if (port <= 1024 || port > 65535) {
    return DEFAULT_PORT;
  }

  return port;
}
