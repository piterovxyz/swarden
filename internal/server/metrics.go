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

	clientGone := r.Context().Done()

	metricsChan := h.Broadcast.Subscribe()
	defer h.Broadcast.Unsubscribe(metricsChan)

	for {
		select {
		case <-clientGone:
			return
		case metrics := <-metricsChan:
			json, err := json.Marshal(metrics)
			if err != nil {
				log.Println("error marshalling metrics", err)
				return
			}
			if _, err := w.Write(json); err != nil {
				log.Println("error writing metrics", err)
				return
			}
			if f, ok := w.(http.Flusher); ok {
				f.Flush()
			}
		}
	}
}
