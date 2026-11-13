import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import * as fs from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Collector, getInfo } from './collector';

let dir: string;

beforeAll(() => {
  dir = fs.mkdtempSync(join(tmpdir(), 'collector-test-'));
});

afterAll(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});

describe('Collector.collect', () => {
  test('collects cpu delta across calls and memory metrics', () => {
    const statPath = join(dir, 'stat');
    const memPath = join(dir, 'meminfo');

    fs.writeFileSync(statPath, 'cpu  1000 0 0 500 0 0 0 0\n');
    fs.writeFileSync(memPath, 'MemTotal: 16000 kB\nMemAvailable: 8000 kB\n');

    const collector = new Collector({ stat: statPath, meminfo: memPath });

    expect(collector.collect()).toEqual({
      cpu: { usage_percent: 0 },
      mem: { total: 16000, available: 8000 },
    });

    fs.writeFileSync(statPath, 'cpu  1100 0 0 600 0 0 0 0\n');

    expect(collector.collect()).toEqual({
      cpu: { usage_percent: 50 },
      mem: { total: 16000, available: 8000 },
    });
  });

  test('throws on missing file', () => {
    const collector = new Collector({
      stat: join(dir, 'missing'),
      meminfo: join(dir, 'missing2'),
    });

    expect(() => collector.collect()).toThrow();
  });
});

describe('getInfo', () => {
  test('cuts off files larger than buffer and leaves no tail on shorter reads', () => {
    const buf = new Uint8Array(8192);
    const largePath = join(dir, 'large');
    const shortPath = join(dir, 'short');

    fs.writeFileSync(largePath, new Uint8Array(10000).fill(0x41));
    fs.writeFileSync(shortPath, new Uint8Array(5).fill(0x42));

    const large = getInfo(buf, largePath);
    expect(large.length).toBe(8192);

    const short = getInfo(buf, shortPath);
    expect(short).toEqual(new Uint8Array(5).fill(0x42));
  });
});
