package main

import (
	"log"
	"net"
	"net/http"
	"os"
	"swarden/internal/metrics"
	"swarden/internal/server"
	"time"
)

func main() {
	collector := metrics.NewCollector()
	broadcast := server.NewBroadcast()

	go func() {
		for {
			metrics, err := collector.Collect()
			if err != nil {
				log.Println("error collecting metrics: ", err)
			}
			broadcast.Publish(metrics)
			time.Sleep(time.Millisecond * 200)
		}
	}()

	mux := http.NewServeMux()
	mux.HandleFunc("GET /", (&server.Handler{Broadcast: broadcast}).MetricsHandler)

	host := os.Getenv("SWARDEN_HOST")
	if host == "" {
		host = "127.0.0.1"
	}

	port := os.Getenv("SWARDEN_PORT")
	if port == "" {
		port = "6701"
	}

	addr := net.JoinHostPort(host, port)

	log.Println("server is running on ", addr)

	if err := http.ListenAndServe(addr, mux); err != nil {
		log.Fatal(err)
	}
}
