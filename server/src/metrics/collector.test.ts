import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, describe, test } from 'node:test';
import { Collector, getInfo } from './collector.ts';

let dir: string;

before(() => {
  dir = fs.mkdtempSync(join(tmpdir(), 'collector-test-'));
});

after(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});

describe('Collector.collect', async () => {
  test('collects cpu delta across calls and memory metrics', async () => {
    const statPath = join(dir, 'stat');
    const memPath = join(dir, 'meminfo');

    await fs.promises.writeFile(statPath, 'cpu  1000 0 0 500 0 0 0 0\n');
    await fs.promises.writeFile(memPath, 'MemTotal: 16000 kB\nMemAvailable: 8000 kB\n');

    const collector = new Collector({ stat: statPath, meminfo: memPath });

    assert.deepEqual(await collector.collect(), {
      cpu: { usage_percent: 0 },
      mem: { total: 16000, available: 8000 },
    });

    await fs.promises.writeFile(statPath, 'cpu  1100 0 0 600 0 0 0 0\n');

    assert.deepEqual(await collector.collect(), {
      cpu: { usage_percent: 50 },
      mem: { total: 16000, available: 8000 },
    });
  });

  test('throws on missing file', async () => {
    const collector = new Collector({
      stat: join(dir, 'missing'),
      meminfo: join(dir, 'missing2'),
    });

    await assert.rejects(async () => {
      await collector.collect();
    });
  });
});

describe('getInfo', async () => {
  test('cuts off files larger than buffer and leaves no tail on shorter reads', async () => {
    const buf = new Uint8Array(8192);
    const largePath = join(dir, 'large');
    const shortPath = join(dir, 'short');

    fs.writeFileSync(largePath, new Uint8Array(10000).fill(0x41));
    fs.writeFileSync(shortPath, new Uint8Array(5).fill(0x42));

    const large = await getInfo(buf, largePath);
    assert.equal(large.length, 8192);

    const short = await getInfo(buf, shortPath);
    assert.deepEqual(short, new Uint8Array(5).fill(0x42));
  });
});
