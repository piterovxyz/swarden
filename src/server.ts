import type { SystemMetrics } from './metrics/collector';

const clients = new Set<ReadableStreamDefaultController>();

export function broadcast(message: SystemMetrics) {
  const messageString = JSON.stringify(message);
  for (const client of clients) {
    client.enqueue(`data: ${messageString}\n\n`);
  }
}

Bun.serve({
  port: 6701,
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
