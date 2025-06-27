package http

import (
	"encoding/json"
	"log"
	"net/http"
	// "path/filepath"

	"central-server/types"
	"central-server/websocket"
	"github.com/gorilla/mux"
)

type HTTPServer struct {
	port          string
	serverManager *types.ServerManager
	hub           *websocket.Hub
}

func NewHTTPServer(port string, serverManager *types.ServerManager, hub *websocket.Hub) *HTTPServer {
	return &HTTPServer{
		port:          port,
		serverManager: serverManager,
		hub:           hub,
	}
}

func (s *HTTPServer) Start() error {
	r := mux.NewRouter()

	r.HandleFunc("/ws", s.hub.ServeWS)

	api := r.PathPrefix("/api").Subrouter()
	api.HandleFunc("/servers", s.handleGetServers).Methods("GET")
	api.HandleFunc("/servers/{name}", s.handleGetServer).Methods("GET")
	api.HandleFunc("/health", s.handleHealth).Methods("GET")

	r.PathPrefix("/").Handler(http.FileServer(http.Dir("./web/")))

	log.Printf("🌐 HTTP server listening on port %s", s.port)
	log.Printf("📱 Frontend: http://localhost:%s", s.port)
	log.Printf("🔗 WebSocket: ws://localhost:%s/ws", s.port)

	return http.ListenAndServe(":"+s.port, r)
}

func (s *HTTPServer) handleGetServers(w http.ResponseWriter, r *http.Request) {
	servers := s.serverManager.GetAllServers()

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"servers": servers,
		"count":   len(servers),
	})
}

func (s *HTTPServer) handleGetServer(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	serverName := vars["name"]

	server := s.serverManager.GetServer(serverName)
	if server == nil {
		http.Error(w, "Server not found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(server)
}

func (s *HTTPServer) handleHealth(w http.ResponseWriter, r *http.Request) {
	servers := s.serverManager.GetAllServers()

	stats := map[string]int{
		"total":  0,
		"active": 0,
		"stale":  0,
		"dead":   0,
	}

	for _, server := range servers {
		stats["total"]++
		switch server.GetState() {
		case types.StateActive:
			stats["active"]++
		case types.StateStale:
			stats["stale"]++
		case types.StateDead:
			stats["dead"]++
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"status": "healthy",
		"stats":  stats,
	})
}

func enableCORS(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
}
