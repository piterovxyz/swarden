package metrics

import (
	"errors"
	"fmt"
	"io"
	"os"
)

type SystemMetrics struct {
	Mem MemMetrics `json:"mem"`
	CPU CPUMetrics `json:"cpu"`
}

type Collector struct {
	buf      [8192]byte
	prevTick CPUTicks
}

func (m *Collector) Collect() (SystemMetrics, error) {
	memInfo, err := getInfo("/proc/meminfo", &m.buf)
	if err != nil {
		return SystemMetrics{}, err
	}

	mem, err := ParseMemMetrics(memInfo)
	if err != nil {
		return SystemMetrics{}, err
	}

	cpuInfo, err := getInfo("/proc/stat", &m.buf)
	if err != nil {
		return SystemMetrics{}, err
	}

	tick, err := ParseCPUTicks(cpuInfo)
	if err != nil {
		return SystemMetrics{}, err
	}

	cpuUsage := cpuUsagePercent(m.prevTick, tick)

	m.prevTick = tick

	return SystemMetrics{
		Mem: mem,
		CPU: CPUMetrics{
			UsagePercent: cpuUsage,
		},
	}, nil
}

func NewCollector() Collector {
	return Collector{}
}

func getInfo(path string, buf *[8192]byte) ([]byte, error) {
	file, err := os.Open(path)
	if err != nil {
		return nil, fmt.Errorf("opening %s: %w", path, err)
	}
	defer func() { _ = file.Close() }()

	readBytes := 0

	for {
		bytes, err := file.Read(buf[readBytes:])
		readBytes += bytes
		if err != nil {
			if errors.Is(err, io.EOF) {
				break
			}
			return nil, fmt.Errorf("reading %s: %w", path, err)
		}
		if readBytes == len(buf) {
			break
		}
	}

	return buf[:readBytes], nil
}

func cpuUsagePercent(prev, curr CPUTicks) float64 {
	if prev != (CPUTicks{}) && curr.Total > prev.Total && curr.Idle >= prev.Idle {
		deltaTotal := float64(curr.Total - prev.Total)
		deltaIdle := float64(curr.Idle - prev.Idle)
		if deltaTotal > deltaIdle {
			return (deltaTotal - deltaIdle) / deltaTotal * 100
		}
	}
	return 0
}
