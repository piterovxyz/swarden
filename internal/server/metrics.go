package server

import (
	"encoding/json/v2"
	"log"
	"net/http"
)

func (h *Handler) MetricsHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("Access-Control-Allow-Origin", "*")

	clientGone := r.Context().Done()

	metricsChan := h.Broadcast.Subscribe()
	defer h.Broadcast.Unsubscribe(metricsChan)

	for {
		select {
		case <-clientGone:
			return
		case metrics := <-metricsChan:
			data, err := json.Marshal(metrics)
			if err != nil {
				log.Println("error marshalling metrics", err)
				return
			}
			if err := flushSseMetrics(w, data); err != nil {
				log.Println("error flushing metrics", err)
				return
			}
		}
	}
}

func flushSseMetrics(w http.ResponseWriter, data []byte) error {
	if _, err := w.Write([]byte("data: ")); err != nil {
		return err
	}
	if _, err := w.Write(data); err != nil {
		return err
	}
	if _, err := w.Write([]byte("\n\n")); err != nil {
		return err
	}
	if f, ok := w.(http.Flusher); ok {
		f.Flush()
	}
	return nil
}
