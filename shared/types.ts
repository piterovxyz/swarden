export interface CpuMetrics {
  usage_percent: number;
}

export interface MemMetrics {
  total: number;
  available: number;
}

export interface SystemMetrics {
  cpu: CpuMetrics;
  mem: MemMetrics;
}
