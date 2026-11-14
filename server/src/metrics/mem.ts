import type { MemMetrics } from '@swarden/shared';

export function parseMemMetrics(raw: Uint8Array): MemMetrics {
  const mem: MemMetrics = { total: 0, available: 0 };
  const decoder = new TextDecoder();

  for (const line of byteLines(raw)) {
    const parts = decoder.decode(line).trim().split(/\s+/);
    const memValue = parseInt(parts[1] ?? '0', 10);

    if (parts[0] === 'MemTotal:') {
      mem.total = memValue;
    } else if (parts[0] === 'MemAvailable:') {
      mem.available = memValue;
    }

    if (mem.total !== 0 && mem.available !== 0) {
      break;
    }
  }

  if (mem.total === 0 || mem.available === 0) {
    throw new Error('parsing /proc/meminfo: total or available is 0');
  }

  return mem;
}

function* byteLines(data: Uint8Array): Generator<Uint8Array> {
  let start = 0;

  while (start < data.length) {
    const nl = data.indexOf(0x0a, start);
    const end = nl === -1 ? data.length : nl + 1;
    yield data.subarray(start, end);
    start = end;
  }
}
