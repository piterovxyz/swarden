import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { cpuUsagePercent, parseCpuTick } from './cpu.ts';

const encode = (s: string) => new TextEncoder().encode(s);

const procStatError = (error: unknown) =>
  error instanceof Error && error.message.includes('/proc/stat');

const statSample = `cpu  100 20 30 400 50 6 7 8 0 0
cpu0 50 10 15 200 25 3 3 4 0 0
cpu1 50 10 15 200 25 3 4 4 0 0
intr 123456 0 1 2 3
ctxt 987654
`;

describe('parseCpuTick', () => {
  test('sums all ticks and takes idle = idle + iowait from the first cpu line', () => {
    assert.deepEqual(parseCpuTick(encode(statSample)), { total: 621, idle: 450 });
  });

  test('ignores cpu0/cpu1 lines and the rest of the output', () => {
    assert.deepEqual(parseCpuTick(encode('cpu  1 1 1 1 1 1 1 1\ncpu0 9 9 9 9 9 9 9 9\n')), {
      total: 8,
      idle: 2,
    });
  });

  test('does not count guest and guest_nice (they are already included in user/nice)', () => {
    assert.deepEqual(parseCpuTick(encode('cpu 1 2 3 4 5 6 7 8 999 999\n')), {
      total: 36,
      idle: 9,
    });
  });

  test('works without a trailing newline', () => {
    assert.deepEqual(parseCpuTick(encode('cpu 1 2 3 4 5 6 7 8')), { total: 36, idle: 9 });
  });

  test('throws if the first line does not start with cpu', () => {
    assert.throws(() => parseCpuTick(encode('intr 1 2 3 4 5 6 7 8 9\n')), procStatError);
  });

  test('throws on a per-core cpu0 line without the aggregate cpu line', () => {
    assert.throws(() => parseCpuTick(encode('cpu0 1 2 3 4 5 6 7 8\n')), procStatError);
  });

  test('throws if there are fewer than 8 fields', () => {
    assert.throws(() => parseCpuTick(encode('cpu 1 2 3 4 5 6 7\n')), procStatError);
  });

  test('throws on empty input', () => {
    assert.throws(() => parseCpuTick(new Uint8Array(0)), procStatError);
  });

  test('throws if all ticks are 0', () => {
    assert.throws(() => parseCpuTick(encode('cpu 0 0 0 0 0 0 0 0\n')), procStatError);
  });
});

describe('cpuUsagePercent', () => {
  test('computes busy percentage from deltas', () => {
    assert.equal(cpuUsagePercent({ total: 1000, idle: 500 }, { total: 1200, idle: 550 }), 75);
  });

  test('100% if idle did not grow', () => {
    assert.equal(cpuUsagePercent({ total: 1000, idle: 500 }, { total: 1100, idle: 500 }), 100);
  });

  test('0% if the CPU was idle the whole time', () => {
    assert.equal(cpuUsagePercent({ total: 1000, idle: 500 }, { total: 1200, idle: 700 }), 0);
  });

  test('0 on the first call (no previous ticks)', () => {
    assert.equal(cpuUsagePercent({ total: 0, idle: 0 }, { total: 1200, idle: 550 }), 0);
  });

  test('0 if ticks did not change', () => {
    assert.equal(cpuUsagePercent({ total: 1000, idle: 500 }, { total: 1000, idle: 500 }), 0);
  });

  test('0 if counters went down', () => {
    assert.equal(cpuUsagePercent({ total: 1000, idle: 500 }, { total: 900, idle: 400 }), 0);
    assert.equal(cpuUsagePercent({ total: 1000, idle: 500 }, { total: 1200, idle: 400 }), 0);
  });
});
