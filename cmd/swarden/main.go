package main

import (
	"log"
	"net/http"
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
				log.Fatal("error get metrics", err)
			}
			broadcast.Publish(metrics)
			time.Sleep(time.Millisecond * 200)
		}
	}()

	http.HandleFunc("/metrics", (&server.Handler{Broadcast: broadcast}).MetricsHandler)

	log.Println("server is running on port 8080")
	if err := http.ListenAndServe(":8080", nil); err != nil {
		log.Fatal(err.Error())
	}
}
