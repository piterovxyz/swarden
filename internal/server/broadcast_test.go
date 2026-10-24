package server

import (
	"sync"
	"testing"

	"swarden/internal/metrics"
)

func TestBroadcast(t *testing.T) {
	sample := metrics.SystemMetrics{
		Mem: metrics.MemMetrics{Total: 100, Available: 40},
		Cpu: metrics.CpuMetrics{UsagePercent: 12.5},
	}

	t.Run("fan-out", func(t *testing.T) {
		b := NewBroadcast()
		a := b.Subscribe()
		c := b.Subscribe()

		b.Publish(sample)

		if got := <-a; got != sample {
			t.Fatalf("subscriber a = %+v, want %+v", got, sample)
		}
		if got := <-c; got != sample {
			t.Fatalf("subscriber c = %+v, want %+v", got, sample)
		}
	})

	t.Run("drops when full", func(t *testing.T) {
		b := NewBroadcast()
		ch := b.Subscribe()

		for i := 1; i <= 11; i++ {
			b.Publish(metrics.SystemMetrics{Mem: metrics.MemMetrics{Total: uint64(i)}})
		}

		for i := 1; i <= 10; i++ {
			got := <-ch
			if got.Mem.Total != uint64(i) {
				t.Fatalf("value %d = %d, want %d", i, got.Mem.Total, i)
			}
		}
		select {
		case got := <-ch:
			t.Fatalf("extra value %+v", got)
		default:
		}
	})

	t.Run("unsubscribe", func(t *testing.T) {
		b := NewBroadcast()
		ch := b.Subscribe()
		foreign := make(chan metrics.SystemMetrics)

		b.Unsubscribe(ch)
		b.Unsubscribe(ch)
		b.Unsubscribe(foreign)

		if _, ok := <-ch; ok {
			t.Fatal("channel still open")
		}
		select {
		case _, ok := <-foreign:
			if !ok {
				t.Fatal("closed foreign channel")
			}
		default:
		}

		b.mu.Lock()
		n := len(b.subscribers)
		b.mu.Unlock()
		if n != 0 {
			t.Fatalf("subscribers = %d, want 0", n)
		}

		b.Publish(sample)
	})

	t.Run("publish with no subscribers", func(t *testing.T) {
		b := NewBroadcast()
		b.Publish(sample)

		b.mu.Lock()
		n := len(b.subscribers)
		b.mu.Unlock()
		if n != 0 {
			t.Fatalf("subscribers = %d, want 0", n)
		}
	})

	t.Run("concurrent", func(t *testing.T) {
		b := NewBroadcast()
		var wg sync.WaitGroup
		for range 4 {
			wg.Add(1)
			go func() {
				defer wg.Done()
				for range 100 {
					b.Publish(sample)
				}
			}()
		}
		for range 4 {
			wg.Add(1)
			go func() {
				defer wg.Done()
				for range 100 {
					ch := b.Subscribe()
					select {
					case <-ch:
					default:
					}
					b.Unsubscribe(ch)
				}
			}()
		}
		wg.Wait()

		b.mu.Lock()
		n := len(b.subscribers)
		b.mu.Unlock()
		if n != 0 {
			t.Fatalf("subscribers = %d, want 0", n)
		}
	})
}
