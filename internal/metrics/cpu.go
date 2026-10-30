package metrics

import (
	"bytes"
	"errors"
	"strconv"
	"strings"
)

type CpuMetrics struct {
	UsagePercent float64 `json:"usage_percent"`
}

type CpuTicks struct {
	Total uint64 `json:"total"`
	Idle  uint64 `json:"idle"`
}

func ParseCpuTicks(s []byte) (CpuTicks, error) {
	cpuStat, _, _ := bytes.Cut(s, []byte("\n"))
	parts := strings.Fields(string(cpuStat))

	if len(parts) < 9 || parts[0] != "cpu" {
		return CpuTicks{}, errors.New("parsing /proc/stat: invalid format")
	}

	var ticks CpuTicks

	for i := 1; i <= 8; i++ {
		val, err := strconv.ParseUint(parts[i], 10, 64)
		if err != nil {
			return CpuTicks{}, err
		}

		ticks.Total += val

		if i == 4 || i == 5 {
			ticks.Idle += val
		}
	}

	if ticks.Total == 0 {
		return CpuTicks{}, errors.New("parsing /proc/stat: total ticks is 0")
	}

	return ticks, nil
}
