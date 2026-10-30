package main

import (
	"context"
	"errors"
	"fmt"
	"log"
	"net"
	"net/http"
	"os"
	"os/signal"
	"swarden/internal/metrics"
	"swarden/internal/server"
	"syscall"
	"time"
)

func main() {
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	collector := metrics.NewCollector()
	broadcast := server.NewBroadcast()

	go func() {
		ticker := time.NewTicker(time.Millisecond * 500)
		defer ticker.Stop()

		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				m, err := collector.Collect()
				if err != nil {
					log.Println("error collecting metrics: ", err)
					continue
				}
				broadcast.Publish(m)
			}
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

	srv := &http.Server{
		Addr:    net.JoinHostPort(host, port),
		Handler: mux,
	}

	go func() {
		log.Println("server is running on ", srv.Addr)
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Fatalf("server listen err: %s", err.Error())
		}
	}()

	<-ctx.Done()
	fmt.Println("shutting down swarden...")

	shutCtx, cancel := context.WithTimeout(context.Background(), time.Second*5)
	defer cancel()

	if err := srv.Shutdown(shutCtx); err != nil {
		log.Printf("error shut server: %s", err.Error())
	}

	log.Printf("goodbye!")
}
