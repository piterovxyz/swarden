import { Collector } from './src/metrics/collector';
import { broadcast, startServer } from './src/server';

if (process.platform !== 'linux') {
  console.error('this daemon can only be run on linux');
  process.exit(1);
}

try {
  const server = startServer();
  console.log(`Server started on port ${server.port}`);

  const shutdown = async () => {
    await server.stop(true);
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
} catch (error) {
  console.error('error starting server: ', error);
  process.exit(1);
}

const collector = new Collector();
let metrics = collector.collect();

while (true) {
  await Bun.sleep(500);

  try {
    metrics = collector.collect();
  } catch (error) {
    console.error('error collecting metrics: ', error);
    continue;
  }

  broadcast(metrics);
}
