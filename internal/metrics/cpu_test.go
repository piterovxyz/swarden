package metrics

import (
	"errors"
	"strconv"
	"testing"
)

func mustParseCpuTicks(t *testing.T, s string) CpuTicks {
	t.Helper()
	ticks, err := ParseCpuTicks([]byte(s))
	if err != nil {
		t.Fatalf("ParseCpuTicks(%q): %v", s, err)
	}
	return ticks
}

func TestCpuUsagePercent(t *testing.T) {
	tests := []struct {
		name string
		prev string
		curr string
		want float64
	}{
		{
			name: "20 percent",
			prev: "cpu 10 0 10 70 10\n",
			curr: "cpu 20 0 20 140 20\n",
			want: 20,
		},
		{
			name: "50 percent",
			prev: "cpu 10 0 10 70 10\n",
			curr: "cpu 12 0 10 72 10\n",
			want: 50,
		},
		{
			name: "100 percent",
			prev: "cpu 10 0 10 70 10\n",
			curr: "cpu 14 0 10 70 10\n",
			want: 100,
		},
		{
			name: "idle only",
			prev: "cpu 10 0 10 70 10\n",
			curr: "cpu 10 0 10 72 12\n",
			want: 0,
		},
		{
			name: "no previous sample",
			curr: "cpu 10 0 10 70 10\n",
			want: 0,
		},
		{
			name: "total did not grow",
			prev: "cpu 10 0 10 70 10\n",
			curr: "cpu 10 0 10 70 10\n",
			want: 0,
		},
		{
			name: "idle decreased",
			prev: "cpu 10 0 10 70 10\n",
			curr: "cpu 30 0 10 60 10\n",
			want: 0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var prev CpuTicks
			if tt.prev != "" {
				prev = mustParseCpuTicks(t, tt.prev)
			}
			curr := mustParseCpuTicks(t, tt.curr)
			got := cpuUsagePercent(prev, curr)
			if got != tt.want {
				t.Fatalf("usage = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestParseCpuTicks(t *testing.T) {
	t.Run("full line", func(t *testing.T) {
		ticks := mustParseCpuTicks(t, "cpu  1 2 3 4 5 6 7 8 9 10\ncpu0 100 100 100 100 100\n")
		if ticks.Total != 55 || ticks.Idle != 9 {
			t.Fatalf("ticks = %+v, want total 55 idle 9", ticks)
		}
	})

	t.Run("missing cpu prefix", func(t *testing.T) {
		_, err := ParseCpuTicks([]byte("cpu0 1 2 3 4 5\n"))
		if err == nil || err.Error() != "parsing /proc/stat: invalid format" {
			t.Fatalf("error = %v", err)
		}
	})

	t.Run("too few fields", func(t *testing.T) {
		_, err := ParseCpuTicks([]byte("cpu 1 2 3 4\n"))
		if err == nil || err.Error() != "parsing /proc/stat: invalid format" {
			t.Fatalf("error = %v", err)
		}
	})

	t.Run("non numeric field", func(t *testing.T) {
		_, err := ParseCpuTicks([]byte("cpu 1 2 x 4 5\n"))
		if _, ok := errors.AsType[*strconv.NumError](err); !ok {
			t.Fatalf("error = %v, want a number parse error", err)
		}
	})
}
