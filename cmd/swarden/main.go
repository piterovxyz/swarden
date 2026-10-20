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
				log.Fatal("error get metrics", err)
			}
			broadcast.Publish(metrics)
			time.Sleep(time.Millisecond * 200)
		}
	}()

	static, err := server.GetAssets("/")
	if err != nil {
		log.Fatal("error get assets", err)
	}
	http.Handle("/", http.FileServerFS(static))

	http.HandleFunc("/metrics", (&server.Handler{Broadcast: broadcast}).MetricsHandler)

	port := os.Getenv("PORT")
	log.Println("server is running on :", port)

	if err := http.ListenAndServe(":"+port, nil); err != nil {
		log.Fatal(err.Error())
	}
}
