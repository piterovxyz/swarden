import { Collector } from './src/metrics/collector';
import { broadcast } from './src/server';

const collector = new Collector();

while (true) {
  await Bun.sleep(500);
  const metrics = collector.collect();
  broadcast(metrics);
}
