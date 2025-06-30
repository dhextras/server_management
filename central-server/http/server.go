package http

import (
	"central-server/types"
	"central-server/websocket"
	"encoding/json"
	"github.com/gorilla/mux"
	"log"
	"net/http"
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

	r.Use(s.corsMiddleware)
	r.HandleFunc("/ws", s.hub.ServeWS)

	api := r.PathPrefix("/api").Subrouter()
	api.HandleFunc("/servers", s.handleGetServers).Methods("GET")
	api.HandleFunc("/servers/{name}", s.handleGetServer).Methods("GET")
	api.HandleFunc("/health", s.handleHealth).Methods("GET")

	log.Printf(" HTTP API server listening on port %s", s.port)
	log.Printf(" API endpoints: http://localhost:%s/api/", s.port)
	log.Printf(" WebSocket: ws://localhost:%s/ws", s.port)

	return http.ListenAndServe(":"+s.port, r)
}

func (s *HTTPServer) corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "http://localhost:3000")
		w.Header().Set("Access-Control-Allow-Origin", "https://servers.maribeth.io")
		w.Header().Set("Access-Control-Allow-Origin", "http://servers.maribeth.io")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		w.Header().Set("Access-Control-Allow-Credentials", "true")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}

func (s *HTTPServer) handleGetServers(w http.ResponseWriter, r *http.Request) {
	servers := s.serverManager.GetAllServers()

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]any{
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
	json.NewEncoder(w).Encode(map[string]any{
		"status": "healthy",
		"stats":  stats,
	})
}
