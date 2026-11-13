import { createServer, type Server, type ServerResponse } from 'node:http';
import type { SystemMetrics } from './metrics/collector.ts';

const clients = new Set<ServerResponse>();

const DEFAULT_PORT = 6701;

export function broadcast(message: SystemMetrics) {
  const payload = `data: ${JSON.stringify(message)}\n\n`;
  for (const res of clients) {
    res.write(payload);
  }
}

export function connectedClients(): number {
  return clients.size;
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

export function startServer(port?: number): Promise<Server> {
  const listenPort = port ?? parsePort(process.env.PORT);

  const server = createServer((req, res) => {
    const url = new URL(req.url ?? '/', 'http://localhost');

    if (url.pathname !== '/') {
      res.writeHead(404, { 'Content-Type': 'text/plain' }).end('not found');
      return;
    }

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });

    res.flushHeaders();
    clients.add(res);
    res.on('close', () => clients.delete(res));
  });

  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(listenPort, () => resolve(server));
  });
}
