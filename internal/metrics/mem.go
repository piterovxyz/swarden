package metrics

type MemMetrics struct {
	Total     uint64 `json:"total"`
	Available uint64 `json:"available"`
}
