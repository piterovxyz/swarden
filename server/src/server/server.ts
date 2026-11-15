import Fastify, { type FastifyInstance } from 'fastify';
import { handleSse } from './sse.ts';

const DEFAULT_PORT = 6701;

export async function startServer(port?: number): Promise<FastifyInstance> {
  const listenPort = port ?? parsePort(process.env.PORT);

  const app = Fastify({ requestTimeout: 0, forceCloseConnections: true });

  app.register(
    async (api) => {
      api.get('/sse', (_req, res) => {
        res.hijack();
        handleSse(res.raw);
      });
    },
    { prefix: '/api' },
  );

  app.setNotFoundHandler((_request, reply) => {
    reply.code(404).type('text/plain; charset=utf-8').send('not found');
  });

  await app.listen({ port: listenPort, host: '0.0.0.0' });

  return app;
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
