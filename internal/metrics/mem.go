package metrics

import (
	"bytes"
	"errors"
	"strconv"
	"strings"
)

type MemMetrics struct {
	Total     uint64 `json:"total"`
	Available uint64 `json:"available"`
}

func ParseMemMetrics(s []byte) (MemMetrics, error) {
	var err error
	var total, available uint64

	for line := range bytes.Lines(s) {
		parts := strings.Fields(string(line))

		if len(parts) < 2 {
			continue
		}

		switch parts[0] {
		case "MemTotal:":
			total, err = strconv.ParseUint(parts[1], 10, 64)
			if err != nil {
				return MemMetrics{}, err
			}
		case "MemAvailable:":
			available, err = strconv.ParseUint(parts[1], 10, 64)
			if err != nil {
				return MemMetrics{}, err
			}
		}

		if total > 0 && available > 0 {
			break
		}
	}

	if total > 0 && available > 0 {
		return MemMetrics{
			Total:     total,
			Available: available,
		}, nil
	} else {
		return MemMetrics{}, errors.New("parsing /proc/meminfo: total or available is 0")
	}
}
