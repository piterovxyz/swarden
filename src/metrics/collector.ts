import * as fs from 'node:fs';
import type { CpuMetrics, CpuTicks } from './cpu';
import { cpuUsagePercent, parseCpuTick } from './cpu';
import type { MemMetrics } from './mem';
import { parseMemMetrics } from './mem';

export interface SystemMetrics {
  cpu: CpuMetrics;
  mem: MemMetrics;
}

export class Collector {
  private buf = new Uint8Array(8192);
  private prevTick: CpuTicks = { total: 0, idle: 0 };

  public collect(): SystemMetrics {
    const cpuInfo = this.getInfo('/proc/stat');
    const cpuTick = parseCpuTick(cpuInfo);
    const cpuUsage = cpuUsagePercent(this.prevTick, cpuTick);

    this.prevTick = cpuTick;

    const memInfo = this.getInfo('/proc/meminfo');
    const memMetrics = parseMemMetrics(memInfo);

    return { cpu: { usage_percent: cpuUsage }, mem: memMetrics };
  }

  private getInfo(path: string): Uint8Array {
    const fd = fs.openSync(path, 'r');
    let totalBytes = 0;

    try {
      while (totalBytes < this.buf.length) {
        const bytesRead = fs.readSync(fd, this.buf, totalBytes, this.buf.length - totalBytes, null);

        if (bytesRead === 0) {
          break;
        }

        totalBytes += bytesRead;
      }
    } finally {
      fs.closeSync(fd);
    }

    return this.buf.subarray(0, totalBytes);
  }
}
