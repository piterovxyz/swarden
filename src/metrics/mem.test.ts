import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { parseMemMetrics } from './mem.ts';

const encode = (s: string) => new TextEncoder().encode(s);

const procMeminfoError = (error: unknown) =>
  error instanceof Error && error.message.includes('/proc/meminfo');

const typicalMeminfo = `MemTotal:       16318412 kB
MemFree:         1234567 kB
MemAvailable:    8765432 kB
Buffers:          123456 kB
Cached:          4567890 kB
SwapTotal:       2097148 kB
SwapFree:        2097148 kB
`;

describe('parseMemMetrics', () => {
  test('parses MemTotal and MemAvailable from a typical /proc/meminfo', () => {
    assert.deepEqual(parseMemMetrics(encode(typicalMeminfo)), {
      total: 16318412,
      available: 8765432,
    });
  });

  test('finds the lines regardless of their order', () => {
    const raw = encode('Buffers: 1 kB\nMemAvailable: 200 kB\nCached: 3 kB\nMemTotal: 100 kB\n');

    assert.deepEqual(parseMemMetrics(raw), { total: 100, available: 200 });
  });

  test('works without a trailing newline', () => {
    const raw = encode('MemTotal: 100 kB\nMemAvailable: 50 kB');

    assert.deepEqual(parseMemMetrics(raw), { total: 100, available: 50 });
  });

  test('works with tabs and extra spaces', () => {
    const raw = encode('MemTotal:\t  2048 kB\nMemAvailable:    1024   kB\n');

    assert.deepEqual(parseMemMetrics(raw), { total: 2048, available: 1024 });
  });

  test('throws if MemAvailable is missing', () => {
    assert.throws(
      () => parseMemMetrics(encode('MemTotal: 100 kB\nMemFree: 50 kB\n')),
      procMeminfoError,
    );
  });

  test('throws if MemTotal is missing', () => {
    assert.throws(
      () => parseMemMetrics(encode('MemAvailable: 100 kB\nMemFree: 50 kB\n')),
      procMeminfoError,
    );
  });

  test('throws on empty input', () => {
    assert.throws(() => parseMemMetrics(new Uint8Array(0)), procMeminfoError);
  });

  test('throws if a value is 0', () => {
    assert.throws(
      () => parseMemMetrics(encode('MemTotal: 0 kB\nMemAvailable: 100 kB\n')),
      procMeminfoError,
    );
    assert.throws(
      () => parseMemMetrics(encode('MemTotal: 100 kB\nMemAvailable: 0 kB\n')),
      procMeminfoError,
    );
  });

  test('throws if a line has no value', () => {
    assert.throws(
      () => parseMemMetrics(encode('MemTotal:\nMemAvailable: 100 kB\n')),
      procMeminfoError,
    );
  });
});
