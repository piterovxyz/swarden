import type { SystemMetrics } from './metrics/collector';

const clients = new Set<ReadableStreamDefaultController>();

const DEFAULT_PORT = 6701;

export function broadcast(message: SystemMetrics) {
  const messageString = JSON.stringify(message);
  for (const client of clients) {
    try {
      client.enqueue(`data: ${messageString}\n\n`);
    } catch (error) {
      console.error('error sending message to client:', error);
      clients.delete(client);
    }
  }
}

export function startServer(port?: number): Bun.Server<WebSocket> {
  let listenPort = port ?? parseInt(process.env.PORT ?? '', 10);

  if (
    listenPort === undefined ||
    Number.isNaN(listenPort) ||
    listenPort <= 1024 ||
    listenPort > 65535
  ) {
    listenPort = DEFAULT_PORT;
  }

  return Bun.serve({
    port: listenPort,
    fetch(req) {
      const url = new URL(req.url);
      if (url.pathname === '/') {
        let streamController: ReadableStreamDefaultController;
        const stream = new ReadableStream({
          start(controller) {
            streamController = controller;
            clients.add(streamController);
          },
          cancel() {
            clients.delete(streamController);
          },
        });

        return new Response(stream, {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
          },
        });
      }
      return new Response('not found', { status: 404 });
    },
  });
}
