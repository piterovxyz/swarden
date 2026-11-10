export interface CpuTicks {
  total: number;
  idle: number;
}

export interface CpuMetrics {
  usage_percent: number;
}

export function parseCpuTick(raw: Uint8Array): CpuTicks {
  const newlineindex = raw.indexOf(10);
  const cpuLine = newlineindex !== -1 ? raw.subarray(0, newlineindex) : raw;
  const parts = new TextDecoder().decode(cpuLine).trim().split(/\s+/);

  if (parts.length < 9 || parts[0] !== 'cpu') {
    throw new Error('parsing /proc/stat: invalid format');
  }

  const ticks: CpuTicks = { total: 0, idle: 0 };

  for (let i = 1; i <= 8; i++) {
    ticks.total += parseInt(parts[i] ?? '', 10);
    if (i === 4 || i === 5) {
      ticks.idle += parseInt(parts[i] ?? '', 10);
    }
  }

  if (ticks.total === 0) {
    throw new Error('parsing /proc/stat: total ticks is 0');
  }

  return ticks;
}

export function cpuUsagePercent(prev: CpuTicks, curr: CpuTicks): number {
  if ((prev.total !== 0 || prev.idle !== 0) && curr.total > prev.total && curr.idle >= prev.idle) {
    const deltaTotal = curr.total - prev.total;
    const deltaIdle = curr.idle - prev.idle;
    if (deltaTotal > deltaIdle) {
      return ((deltaTotal - deltaIdle) / deltaTotal) * 100;
    }
  }
  return 0;
}
