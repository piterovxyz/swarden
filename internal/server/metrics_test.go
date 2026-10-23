package server

import (
	"bytes"
	"context"
	"encoding/json/v2"
	"errors"
	"io"
	"log"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"swarden/internal/metrics"
)

func TestFlushSseMetrics(t *testing.T) {
	payload := []byte(`{"mem":{"total":1}}`)
	want := "data: " + string(payload) + "\n\n"

	t.Run("frames and flushes", func(t *testing.T) {
		rec := httptest.NewRecorder()
		if err := flushSseMetrics(rec, payload); err != nil {
			t.Fatalf("flushSseMetrics: %v", err)
		}
		if rec.Body.String() != want {
			t.Fatalf("body = %q, want %q", rec.Body.String(), want)
		}
		if !rec.Flushed {
			t.Fatal("expected Flush")
		}
	})

	t.Run("writer without flush", func(t *testing.T) {
		var buf bytes.Buffer
		if err := flushSseMetrics(&bufWriter{buf: &buf}, payload); err != nil {
			t.Fatalf("flushSseMetrics: %v", err)
		}
		if buf.String() != want {
			t.Fatalf("body = %q, want %q", buf.String(), want)
		}
	})

	t.Run("write error", func(t *testing.T) {
		for _, failOn := range []int{1, 2, 3} {
			w := &failWriter{failOn: failOn}
			err := flushSseMetrics(w, payload)
			if !errors.Is(err, errWriteFailed) {
				t.Fatalf("failOn %d: error = %v", failOn, err)
			}
		}
	})
}

func TestMetricsHandler(t *testing.T) {
	sample := metrics.SystemMetrics{
		Mem: metrics.MemMetrics{Total: 100, Available: 40},
		Cpu: metrics.CpuMetrics{UsagePercent: 12.5},
	}

	t.Run("event", func(t *testing.T) {
		h := &Handler{Broadcast: NewBroadcast()}
		mux := http.NewServeMux()
		mux.HandleFunc("GET /metrics", h.MetricsHandler)
		srv := httptest.NewServer(mux)
		t.Cleanup(srv.Close)

		ctx, cancel := context.WithCancel(context.Background())
		t.Cleanup(cancel)

		req, err := http.NewRequestWithContext(ctx, http.MethodGet, srv.URL+"/metrics", nil)
		if err != nil {
			t.Fatal(err)
		}

		type result struct {
			resp *http.Response
			err  error
		}
		gotResp := make(chan result, 1)
		go func() {
			resp, err := (&http.Client{}).Do(req)
			gotResp <- result{resp, err}
		}()

		waitSubscribers(t, h.Broadcast, 1)
		h.Broadcast.Publish(sample)

		var resp *http.Response
		select {
		case res := <-gotResp:
			if res.err != nil {
				t.Fatal(res.err)
			}
			resp = res.resp
		case <-time.After(time.Second):
			t.Fatal("no response")
		}
		t.Cleanup(func() { resp.Body.Close() })

		assertSSEHeaders(t, resp.Header)

		body := readSSEEvent(t, resp.Body)
		payload, ok := strings.CutPrefix(body, "data: ")
		if !ok {
			t.Fatalf("body = %q", body)
		}
		payload, ok = strings.CutSuffix(payload, "\n\n")
		if !ok {
			t.Fatalf("body = %q", body)
		}

		var got metrics.SystemMetrics
		if err := json.Unmarshal([]byte(payload), &got); err != nil {
			t.Fatalf("unmarshal %q: %v", payload, err)
		}
		if got != sample {
			t.Fatalf("metrics = %+v, want %+v", got, sample)
		}
	})

	t.Run("client gone", func(t *testing.T) {
		ctx, cancel := context.WithCancel(context.Background())
		req := httptest.NewRequest(http.MethodGet, "/metrics", nil).WithContext(ctx)
		h := &Handler{Broadcast: NewBroadcast()}

		done := make(chan struct{})
		go func() {
			h.MetricsHandler(httptest.NewRecorder(), req)
			close(done)
		}()

		waitSubscribers(t, h.Broadcast, 1)
		cancel()
		waitHandler(t, done)
		waitSubscribers(t, h.Broadcast, 0)
	})

	t.Run("write error", func(t *testing.T) {
		logs := log.Writer()
		log.SetOutput(io.Discard)
		t.Cleanup(func() { log.SetOutput(logs) })

		ctx, cancel := context.WithCancel(context.Background())
		defer cancel()
		req := httptest.NewRequest(http.MethodGet, "/metrics", nil).WithContext(ctx)
		h := &Handler{Broadcast: NewBroadcast()}

		done := make(chan struct{})
		go func() {
			h.MetricsHandler(&failWriter{failOn: 1}, req)
			close(done)
		}()

		waitSubscribers(t, h.Broadcast, 1)
		h.Broadcast.Publish(sample)
		waitHandler(t, done)
		waitSubscribers(t, h.Broadcast, 0)
	})
}

func assertSSEHeaders(t *testing.T, h http.Header) {
	t.Helper()
	checks := []struct {
		key  string
		want string
	}{
		{"Content-Type", "text/event-stream"},
		{"Cache-Control", "no-cache"},
		{"Connection", "keep-alive"},
		{"Access-Control-Allow-Origin", "*"},
	}
	for _, c := range checks {
		if got := h.Get(c.key); got != c.want {
			t.Fatalf("%s = %q, want %q", c.key, got, c.want)
		}
	}
}

func readSSEEvent(t *testing.T, r io.Reader) string {
	t.Helper()
	var buf bytes.Buffer
	tmp := make([]byte, 256)
	deadline := time.Now().Add(time.Second)
	for !bytes.Contains(buf.Bytes(), []byte("\n\n")) {
		if time.Now().After(deadline) {
			t.Fatalf("body = %q", buf.Bytes())
		}
		n, err := r.Read(tmp)
		buf.Write(tmp[:n])
		if err != nil {
			t.Fatalf("read: %v, body = %q", err, buf.Bytes())
		}
	}
	return buf.String()
}

func waitHandler(t *testing.T, done <-chan struct{}) {
	t.Helper()
	select {
	case <-done:
	case <-time.After(time.Second):
		t.Fatal("handler did not return")
	}
}

func waitSubscribers(t *testing.T, b *Broadcast, want int) {
	t.Helper()
	deadline := time.Now().Add(time.Second)
	for {
		b.mu.Lock()
		got := len(b.subscribers)
		b.mu.Unlock()
		if got == want {
			return
		}
		if time.Now().After(deadline) {
			t.Fatalf("subscribers = %d, want %d", got, want)
		}
		time.Sleep(time.Millisecond)
	}
}

var errWriteFailed = errors.New("write failed")

type bufWriter struct {
	buf *bytes.Buffer
}

func (w *bufWriter) Header() http.Header { return http.Header{} }
func (w *bufWriter) Write(p []byte) (int, error) {
	return w.buf.Write(p)
}
func (w *bufWriter) WriteHeader(int) {}

type failWriter struct {
	failOn int
	writes int
}

func (w *failWriter) Header() http.Header { return make(http.Header) }
func (w *failWriter) WriteHeader(int)     {}
func (w *failWriter) Write(p []byte) (int, error) {
	w.writes++
	if w.writes == w.failOn {
		return 0, errWriteFailed
	}
	return len(p), nil
}
