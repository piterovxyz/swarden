package metrics

import (
	"errors"
	"strconv"
	"testing"
)

func mustParseMemMetrics(t *testing.T, s string) MemMetrics {
	t.Helper()
	metrics, err := ParseMemMetrics([]byte(s))
	if err != nil {
		t.Fatalf("ParseMemMetrics(%q): %v", s, err)
	}
	return metrics
}

func TestParseMemMetrics(t *testing.T) {
	const zeroErr = "parsing /proc/meminfo: total or available is 0"

	t.Run("typical meminfo", func(t *testing.T) {
		metrics := mustParseMemMetrics(t, "MemTotal:       16384 kB\nMemFree:         1024 kB\nMemAvailable:    8192 kB\nBuffers:          256 kB\n")
		if metrics.Total != 16384 || metrics.Available != 8192 {
			t.Fatalf("metrics = %+v, want total 16384 available 8192", metrics)
		}
	})

	t.Run("available before total", func(t *testing.T) {
		metrics := mustParseMemMetrics(t, "MemAvailable: 4096 kB\nMemTotal: 8192 kB\n")
		if metrics.Total != 8192 || metrics.Available != 4096 {
			t.Fatalf("metrics = %+v, want total 8192 available 4096", metrics)
		}
	})

	t.Run("skips noise and stops early", func(t *testing.T) {
		metrics := mustParseMemMetrics(t, "\nshort\nMemTotal: 100 kB\nMemAvailable: 40 kB\nMemTotal: 1 kB\nMemAvailable: 1 kB\n")
		if metrics.Total != 100 || metrics.Available != 40 {
			t.Fatalf("metrics = %+v, want total 100 available 40", metrics)
		}
	})

	t.Run("empty", func(t *testing.T) {
		_, err := ParseMemMetrics(nil)
		if err == nil || err.Error() != zeroErr {
			t.Fatalf("error = %v", err)
		}
	})

	t.Run("missing available", func(t *testing.T) {
		_, err := ParseMemMetrics([]byte("MemTotal: 16384 kB\nMemFree: 1024 kB\n"))
		if err == nil || err.Error() != zeroErr {
			t.Fatalf("error = %v", err)
		}
	})

	t.Run("missing total", func(t *testing.T) {
		_, err := ParseMemMetrics([]byte("MemAvailable: 8192 kB\n"))
		if err == nil || err.Error() != zeroErr {
			t.Fatalf("error = %v", err)
		}
	})

	t.Run("zero total", func(t *testing.T) {
		_, err := ParseMemMetrics([]byte("MemTotal: 0 kB\nMemAvailable: 8192 kB\n"))
		if err == nil || err.Error() != zeroErr {
			t.Fatalf("error = %v", err)
		}
	})

	t.Run("zero available", func(t *testing.T) {
		_, err := ParseMemMetrics([]byte("MemTotal: 16384 kB\nMemAvailable: 0 kB\n"))
		if err == nil || err.Error() != zeroErr {
			t.Fatalf("error = %v", err)
		}
	})

	t.Run("non numeric field", func(t *testing.T) {
		_, err := ParseMemMetrics([]byte("MemTotal: x kB\n"))
		if _, ok := errors.AsType[*strconv.NumError](err); !ok {
			t.Fatalf("error = %v, want a number parse error", err)
		}
	})
}
