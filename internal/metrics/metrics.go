package metrics

import (
	"errors"
	"fmt"
	"io"
	"os"
)

type SystemMetrics struct {
	Mem MemMetrics `json:"mem"`
	Cpu CpuMetrics `json:"cpu"`
}

type MetricsCollector struct {
	buf      [8192]byte
	prevTick CpuTicks
}

func (m *MetricsCollector) Collect() (SystemMetrics, error) {
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

	tick, err := ParseCpuTicks(cpuInfo)
	if err != nil {
		return SystemMetrics{}, err
	}

	var cpuUsage float64

	if m.prevTick != (CpuTicks{}) {
		deltaTotal := float64(tick.Total - m.prevTick.Total)
		deltaIdle := float64(tick.Idle - m.prevTick.Idle)

		if deltaTotal > 0 {
			cpuUsage = (deltaTotal - deltaIdle) / deltaTotal * 100
		} else {
			cpuUsage = 0
		}
	} else {
		cpuUsage = 0
	}

	m.prevTick = tick

	return SystemMetrics{
		Mem: mem,
		Cpu: CpuMetrics{
			UsagePercent: cpuUsage,
		},
	}, nil
}

func NewCollector() MetricsCollector {
	return MetricsCollector{}
}

func getInfo(path string, buf *[8192]byte) ([]byte, error) {
	file, err := os.Open(path)
	if err != nil {
		return []byte{}, fmt.Errorf("opening %s: %w", path, err)
	}
	defer file.Close()

	readBytes := 0

	for {
		bytes, err := file.Read(buf[readBytes:])
		readBytes += bytes
		if err != nil {
			if errors.Is(err, io.EOF) {
				break
			}
			return []byte{}, fmt.Errorf("reading %s: %w", path, err)
		}
		if readBytes == len(buf) {
			break
		}
	}

	return buf[:readBytes], nil
}
