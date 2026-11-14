import * as fs from 'node:fs';
import type { SystemMetrics } from '@swarden/shared';
import type { CpuTicks } from './cpu.ts';
import { cpuUsagePercent, parseCpuTick } from './cpu.ts';
import { parseMemMetrics } from './mem.ts';

export interface CollectorPaths {
  stat: string;
  meminfo: string;
}

const DEFAULT_PATHS: CollectorPaths = {
  stat: '/proc/stat',
  meminfo: '/proc/meminfo',
};

export class Collector {
  private buf = new Uint8Array(8192);
  private prevTick: CpuTicks = { total: 0, idle: 0 };
  private readonly paths: CollectorPaths;

  constructor(paths: CollectorPaths = DEFAULT_PATHS) {
    this.paths = paths;
  }

  public collect(): SystemMetrics {
    const cpuInfo = getInfo(this.buf, this.paths.stat);
    const cpuTick = parseCpuTick(cpuInfo);
    const cpuUsage = cpuUsagePercent(this.prevTick, cpuTick);

    const memInfo = getInfo(this.buf, this.paths.meminfo);
    const memMetrics = parseMemMetrics(memInfo);

    this.prevTick = cpuTick;

    return { cpu: { usage_percent: cpuUsage }, mem: memMetrics };
  }
}

export function getInfo(buf: Uint8Array, path: string): Uint8Array {
  const fd = fs.openSync(path, 'r');
  let totalBytes = 0;

  try {
    while (totalBytes < buf.length) {
      const bytesRead = fs.readSync(fd, buf, totalBytes, buf.length - totalBytes, null);

      if (bytesRead === 0) {
        break;
      }

      totalBytes += bytesRead;
    }
  } finally {
    fs.closeSync(fd);
  }

  return buf.subarray(0, totalBytes);
}
