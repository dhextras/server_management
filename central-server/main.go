package main

import (
	"central-server/http"
	"central-server/storage"
	"central-server/tcp"
	"central-server/types"
	"central-server/websocket"
	"crypto/md5"
	"fmt"
	"log"
	bhttp "net/http"
	_ "net/http/pprof"
	"time"
)

const version = "v0.1.0"

func main() {
	log.Println(" Starting Tmux Monitor Central Server")

	go func() {
		log.Println(" Starting pprof server on :6060")
		log.Println(bhttp.ListenAndServe("localhost:6060", nil))
	}()

	serverManager := types.NewServerManager()
	dataStorage := storage.NewDataStorage()

	serverManager.SetStorage(dataStorage)

	log.Println(" Loading existing data from disk...")
	if err := serverManager.LoadFromStorage(); err != nil {
		log.Printf("  Failed to load existing data: %v", err)
	} else {
		servers := serverManager.GetAllServers()
		log.Printf(" Loaded %d servers from persistent storage", len(servers))
	}

	hub := websocket.NewHub(serverManager)
	go hub.Run()

	dataChanged := make(chan bool, 10)

	broadcaster := make(chan types.ServerData, 100)
	go func() {
		for range broadcaster {
			select {
			case dataChanged <- true:
			default:
			}
		}
	}()

	go func() {
		ticker := time.NewTicker(2 * time.Second) // Try 2 seconds
		defer ticker.Stop()

		var lastHash string
		forceUpdate := false
		lastForceUpdate := time.Now()

		for {
			select {
			case <-dataChanged:
				forceUpdate = true

			case <-ticker.C:
				serverManager.UpdateServerStates()
				shouldBroadcast := false

				servers := serverManager.GetAllServers()
				currentHash := generateDataHash(servers)

				if currentHash != lastHash {
					shouldBroadcast = true
					log.Printf(" Data changed, broadcasting (hash: %s)", currentHash[:8])
				} else if time.Since(lastForceUpdate) > 10*time.Second {
					shouldBroadcast = true
					forceUpdate = true
					log.Printf(" Force broadcast (10s interval)")
				}

				if shouldBroadcast {
					hub.BroadcastServerUpdate()
					lastHash = currentHash
					if forceUpdate {
						lastForceUpdate = time.Now()
						forceUpdate = false
					}
				}
			}
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

func generateDataHash(servers map[string]*types.ServerInfo) string {
	data := fmt.Sprintf("%+v", servers)
	hash := md5.Sum([]byte(data))
	return fmt.Sprintf("%x", hash)
}
