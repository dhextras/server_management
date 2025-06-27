package main

import (
	"log"
	"time"

	"central-server/http"
	"central-server/storage"
	"central-server/tcp"
	"central-server/types"
	"central-server/websocket"
)

const version = "v0.1.0"

func main() {
	log.Println("🔧 Starting Tmux Monitor Central Server")

	serverManager := types.NewServerManager()
	dataStorage := storage.NewDataStorage()

	serverManager.SetStorage(dataStorage)

	log.Println("📂 Loading existing data from disk...")
	if err := serverManager.LoadFromStorage(); err != nil {
		log.Printf("⚠️  Failed to load existing data: %v", err)
	} else {
		servers := serverManager.GetAllServers()
		log.Printf("📂 Loaded %d servers from persistent storage", len(servers))
	}

	hub := websocket.NewHub(serverManager)
	go hub.Run()

	broadcaster := make(chan types.ServerData, 100)

	go func() {
		for range broadcaster {
			hub.BroadcastServerUpdate()
		}
	}()

	go func() {
		ticker := time.NewTicker(5 * time.Second)
		defer ticker.Stop()

		for range ticker.C {
			serverManager.UpdateServerStates()
			hub.BroadcastServerUpdate()
		}
	}()

	tcpServer := tcp.NewTCPServer("8080", serverManager, broadcaster)
	go func() {
		if err := tcpServer.Start(); err != nil {
			log.Fatalf("TCP server failed: %v", err)
		}
	}()

	httpServer := http.NewHTTPServer("8081", serverManager, hub)
	if err := httpServer.Start(); err != nil {
		log.Fatalf("HTTP server failed: %v", err)
	}
}
