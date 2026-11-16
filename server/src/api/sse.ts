import type { ServerResponse } from 'node:http';
import type { SystemMetrics } from '@swarden/shared';

const clients = new Set<ServerResponse>();

export function broadcast(message: SystemMetrics) {
  const payload = `data: ${JSON.stringify(message)}\n\n`;
  for (const res of clients) {
    res.write(payload);
  }
}

export function connectedClients(): number {
  return clients.size;
}

export function handleSse(res: ServerResponse): void {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });

  res.flushHeaders();
  clients.add(res);
  res.on('close', () => clients.delete(res));
  res.on('error', () => clients.delete(res));
}
