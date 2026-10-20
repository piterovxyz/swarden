package server

import (
	"swarden/internal/metrics"
	"sync"
)

type Broadcast struct {
	subscribers map[chan metrics.SystemMetrics]bool
	mu          sync.RWMutex
}

func NewBroadcast() *Broadcast {
	return &Broadcast{
		subscribers: make(map[chan metrics.SystemMetrics]bool),
	}
}

func (b *Broadcast) Subscribe() chan metrics.SystemMetrics {
	b.mu.Lock()
	defer b.mu.Unlock()

	ch := make(chan metrics.SystemMetrics, 10)
	b.subscribers[ch] = true

	return ch
}

func (b *Broadcast) Unsubscribe(ch chan metrics.SystemMetrics) {
	b.mu.Lock()
	defer b.mu.Unlock()

	if b.subscribers[ch] {
		delete(b.subscribers, ch)
		close(ch)
	}
}

func (b *Broadcast) Publish(m metrics.SystemMetrics) {
	b.mu.RLock()
	defer b.mu.RUnlock()

	for ch := range b.subscribers {
		select {
		case ch <- m:
		default:
		}
	}
}
