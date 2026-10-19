package metrics

type SystemMetrics struct {
	Memory MemMetrics
	Cpu    CpuMetrics
}

type MetricsCollector struct {
	buf      [8192]byte
	prevTick CpuTicks
}
