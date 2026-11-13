import type { Server } from 'node:http';
import { setInterval as every } from 'node:timers/promises';
import { Collector } from './src/metrics/collector.ts';
import { broadcast, parsePort, startServer } from './src/server.ts';

if (process.platform !== 'linux') {
  console.error('this daemon can only be run on linux');
  process.exit(1);
}

let server: Server;
try {
  const port = parsePort(process.env.PORT);
  server = await startServer(port);
  console.log(`Server started on port ${port}`);

  const shutdown = () => {
    server.closeAllConnections();
    server.close(() => process.exit(0));
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
    broadcast(collector.collect());
  } catch (error) {
    console.error('error collecting metrics: ', error);
  }
}
