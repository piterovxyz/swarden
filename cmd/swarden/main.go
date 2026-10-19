package main

import (
	"fmt"
	"log"
	"swarden/internal/metrics"
)

func main() {
	collector := metrics.NewCollector()
	metrics, err := collector.Collect()
	if err != nil {
		log.Fatalln("error get metrics", err)
	}

	fmt.Println(metrics.Mem.Available)
	fmt.Println(metrics.Mem.Total)
	fmt.Println(metrics.Cpu.UsagePercent)
}
