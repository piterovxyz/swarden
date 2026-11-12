import { describe, expect, test } from 'bun:test';
import { cpuUsagePercent, parseCpuTick } from './cpu';

const encode = (s: string) => new TextEncoder().encode(s);

const statSample = `cpu  100 20 30 400 50 6 7 8 0 0
cpu0 50 10 15 200 25 3 3 4 0 0
cpu1 50 10 15 200 25 3 4 4 0 0
intr 123456 0 1 2 3
ctxt 987654
`;

describe('parseCpuTick', () => {
  test('sums all ticks and takes idle = idle + iowait from the first cpu line', () => {
    expect(parseCpuTick(encode(statSample))).toEqual({ total: 621, idle: 450 });
  });

  test('ignores cpu0/cpu1 lines and the rest of the output', () => {
    expect(parseCpuTick(encode('cpu  1 1 1 1 1 1 1 1\ncpu0 9 9 9 9 9 9 9 9\n'))).toEqual({
      total: 8,
      idle: 2,
    });
  });

  test('does not count guest and guest_nice (they are already included in user/nice)', () => {
    expect(parseCpuTick(encode('cpu 1 2 3 4 5 6 7 8 999 999\n'))).toEqual({
      total: 36,
      idle: 9,
    });
  });

  test('works without a trailing newline', () => {
    expect(parseCpuTick(encode('cpu 1 2 3 4 5 6 7 8'))).toEqual({ total: 36, idle: 9 });
  });

  test('throws if the first line does not start with cpu', () => {
    expect(() => parseCpuTick(encode('intr 1 2 3 4 5 6 7 8 9\n'))).toThrow('/proc/stat');
  });

  test('throws on a per-core cpu0 line without the aggregate cpu line', () => {
    expect(() => parseCpuTick(encode('cpu0 1 2 3 4 5 6 7 8\n'))).toThrow('/proc/stat');
  });

  test('throws if there are fewer than 8 fields', () => {
    expect(() => parseCpuTick(encode('cpu 1 2 3 4 5 6 7\n'))).toThrow('/proc/stat');
  });

  test('throws on empty input', () => {
    expect(() => parseCpuTick(new Uint8Array(0))).toThrow('/proc/stat');
  });

  test('throws if all ticks are 0', () => {
    expect(() => parseCpuTick(encode('cpu 0 0 0 0 0 0 0 0\n'))).toThrow('/proc/stat');
  });
});

describe('cpuUsagePercent', () => {
  test('computes busy percentage from deltas', () => {
    expect(cpuUsagePercent({ total: 1000, idle: 500 }, { total: 1200, idle: 550 })).toBe(75);
  });

  test('100% if idle did not grow', () => {
    expect(cpuUsagePercent({ total: 1000, idle: 500 }, { total: 1100, idle: 500 })).toBe(100);
  });

  test('0% if the CPU was idle the whole time', () => {
    expect(cpuUsagePercent({ total: 1000, idle: 500 }, { total: 1200, idle: 700 })).toBe(0);
  });

  test('0 on the first call (no previous ticks)', () => {
    expect(cpuUsagePercent({ total: 0, idle: 0 }, { total: 1200, idle: 550 })).toBe(0);
  });

  test('0 if ticks did not change', () => {
    expect(cpuUsagePercent({ total: 1000, idle: 500 }, { total: 1000, idle: 500 })).toBe(0);
  });

  test('0 if counters went down', () => {
    expect(cpuUsagePercent({ total: 1000, idle: 500 }, { total: 900, idle: 400 })).toBe(0);
    expect(cpuUsagePercent({ total: 1000, idle: 500 }, { total: 1200, idle: 400 })).toBe(0);
  });
});
