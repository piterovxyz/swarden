import { Collector } from './src/metrics/collector';
import { broadcast } from './src/server';

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
