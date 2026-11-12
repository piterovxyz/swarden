import { afterAll, afterEach, beforeAll, describe, expect, mock, spyOn, test } from 'bun:test';
import * as fs from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Collector } from './collector';

const BUF_SIZE = 8192;

let dir: string;
let counter = 0;

interface CollectorInternals {
  buf: Uint8Array;
  getInfo(path: string): Uint8Array;
}

function internals(collector: Collector): CollectorInternals {
  return collector as unknown as CollectorInternals;
}

function getInfo(collector: Collector, path: string): Uint8Array {
  return internals(collector).getInfo(path);
}

function writeFileOf(size: number, fill: number): string {
  const path = join(dir, `file-${counter++}`);
  fs.writeFileSync(path, new Uint8Array(size).fill(fill));
  return path;
}

beforeAll(() => {
  dir = fs.mkdtempSync(join(tmpdir(), 'collector-test-'));
});

afterAll(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});

afterEach(() => {
  mock.restore();
});

describe('Collector.getInfo: reading and closing the file', () => {
  test('returns file contents', () => {
    const path = writeFileOf(5, 0x61);

    expect(getInfo(new Collector(), path)).toEqual(new Uint8Array(5).fill(0x61));
  });

  test('closes the fd after a successful read', () => {
    const path = writeFileOf(10, 0x62);
    const openSpy = spyOn(fs, 'openSync');
    const closeSpy = spyOn(fs, 'closeSync');

    getInfo(new Collector(), path);

    expect(closeSpy).toHaveBeenCalledTimes(1);
    expect(closeSpy).toHaveBeenCalledWith(openSpy.mock.results[0]?.value);
  });

  test('closes the fd if the read fails', () => {
    const openSpy = spyOn(fs, 'openSync');
    const closeSpy = spyOn(fs, 'closeSync');

    expect(() => getInfo(new Collector(), dir)).toThrow();

    expect(openSpy).toHaveBeenCalledTimes(1);
    expect(closeSpy).toHaveBeenCalledTimes(1);
    expect(closeSpy).toHaveBeenCalledWith(openSpy.mock.results[0]?.value);
  });

  test('closes the fd if readSync throws (via spy)', () => {
    const path = writeFileOf(10, 0x63);
    const closeSpy = spyOn(fs, 'closeSync');
    spyOn(fs, 'readSync').mockImplementation(() => {
      throw new Error('read failed');
    });

    expect(() => getInfo(new Collector(), path)).toThrow('read failed');
    expect(closeSpy).toHaveBeenCalledTimes(1);
  });

  test('does not call closeSync if open fails (no fd obtained)', () => {
    const closeSpy = spyOn(fs, 'closeSync');

    expect(() => getInfo(new Collector(), join(dir, 'missing-file'))).toThrow();
    expect(closeSpy).not.toHaveBeenCalled();
  });
});

describe('Collector.getInfo: buffer', () => {
  test('file larger than the buffer: returns at most the buffer size without overflow', () => {
    const collector = new Collector();
    const path = writeFileOf(BUF_SIZE * 3, 0x41);

    const result = getInfo(collector, path);

    expect(result.length).toBe(BUF_SIZE);
    expect(result).toEqual(new Uint8Array(BUF_SIZE).fill(0x41));
    expect(internals(collector).buf.length).toBe(BUF_SIZE);
  });

  test('file exactly the buffer size is read in full', () => {
    const path = writeFileOf(BUF_SIZE, 0x42);

    expect(getInfo(new Collector(), path)).toEqual(new Uint8Array(BUF_SIZE).fill(0x42));
  });

  test('short file after a long one contains no tail of the previous read', () => {
    const collector = new Collector();
    const long = writeFileOf(BUF_SIZE - 1, 0x58);
    const short = writeFileOf(6, 0x59);

    getInfo(collector, long);
    const result = getInfo(collector, short);

    expect(result).toEqual(new Uint8Array(6).fill(0x59));
  });

  test('empty file after a non-empty one returns an empty result', () => {
    const collector = new Collector();
    const full = writeFileOf(100, 0x5a);
    const empty = writeFileOf(0, 0);

    getInfo(collector, full);

    expect(getInfo(collector, empty).length).toBe(0);
  });

  test('sequence of reads of different sizes always returns correct data', () => {
    const collector = new Collector();
    const sizes = [1, 8191, 0, BUF_SIZE, 100, BUF_SIZE * 2, 7, 4096, 1];

    for (const size of sizes) {
      const fill = (counter % 200) + 30;
      const path = writeFileOf(size, fill);
      const expected = new Uint8Array(Math.min(size, BUF_SIZE)).fill(fill);

      expect(getInfo(collector, path)).toEqual(expected);
    }

    expect(internals(collector).buf.length).toBe(BUF_SIZE);
  });
});
