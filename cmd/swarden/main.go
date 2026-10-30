package main

import (
	"log"
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

	port := os.Getenv("PORT")

	if port == "" {
		port = "6701"
	}

	log.Println("server is running on :", port)

	if err := http.ListenAndServe(":"+port, mux); err != nil {
		log.Fatal(err)
	}
}
