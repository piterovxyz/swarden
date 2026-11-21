import { setInterval as every } from 'node:timers/promises';
import type { FastifyInstance } from 'fastify';
import { parsePort, startServer } from './src/api/server.ts';
import { broadcast } from './src/api/sse.ts';
import { Collector } from './src/metrics/collector.ts';

if (process.platform !== 'linux') {
  console.error('this daemon can only be run on linux');
  process.exit(1);
}

let app: FastifyInstance;
try {
  const port = parsePort(process.env.PORT);
  app = await startServer(port, process.env.WEB_DIST);
  console.log(`Server started on port ${port}`);

  const shutdown = () => {
    app.close().then(() => process.exit(0));
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
} catch (error) {
  console.error('error starting server: ', error);
  process.exit(1);
}

const collector = new Collector();

for await (const _ of every(500)) {
  try {
    broadcast(await collector.collect());
  } catch (error) {
    console.error('error collecting metrics: ', error);
  }
}
