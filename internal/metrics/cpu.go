package metrics

type CpuMetrics struct {
	Usage float64 `json:"usage"`
}

type CpuTicks struct {
	Total uint64 `json:"total"`
	Idle  uint64 `json:"idle"`
}
