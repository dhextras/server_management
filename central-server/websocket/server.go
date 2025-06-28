package websocket

import (
	"bytes"
	"encoding/json"
	"log"
	"net/http"
	"sync"
	"time"

	"central-server/types"
	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

type Hub struct {
	clients       map[*Client]bool
	broadcast     chan []byte
	register      chan *Client
	unregister    chan *Client
	serverManager *types.ServerManager
	mutex         sync.RWMutex
	cachedJSON    []byte
	cacheTime     time.Time
	cacheMutex    sync.RWMutex
}

type Client struct {
	hub  *Hub
	conn *websocket.Conn
	send chan []byte
}

type Message struct {
	Type    string `json:"type"`
	Payload any    `json:"payload"`
}

type ServerUpdate struct {
	Servers map[string]*types.ServerInfo `json:"servers"`
}

type ServerSummary struct {
	ServerID    string    `json:"server_id"`
	LastSeen    time.Time `json:"last_seen"`
	IsOnline    bool      `json:"is_online"`
	PaneCount   int       `json:"pane_count"`
	WindowCount int       `json:"window_count"`
}

type SummaryUpdate struct {
	Servers []ServerSummary `json:"servers"`
}

func NewHub(serverManager *types.ServerManager) *Hub {
	return &Hub{
		clients:       make(map[*Client]bool),
		broadcast:     make(chan []byte, 256),
		register:      make(chan *Client),
		unregister:    make(chan *Client),
		serverManager: serverManager,
	}
}

func (h *Hub) Run() {
	for {
		select {
		case client := <-h.register:
			h.mutex.Lock()
			h.clients[client] = true
			clientCount := len(h.clients)
			h.mutex.Unlock()
			log.Printf("WebSocket client connected (total: %d)", clientCount)

			h.sendInitialData()

		case client := <-h.unregister:
			h.mutex.Lock()
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
				close(client.send)
			}
			clientCount := len(h.clients)
			h.mutex.Unlock()
			log.Printf("WebSocket client disconnected (total: %d)", clientCount)

		case message := <-h.broadcast:
			h.mutex.RLock()
			clientCount := len(h.clients)
			if clientCount == 0 {
				h.mutex.RUnlock()
				continue
			}

			for client := range h.clients {
				select {
				case client.send <- message:
				default:
					close(client.send)
					delete(h.clients, client)
				}
			}
			h.mutex.RUnlock()
			log.Printf("Broadcast sent to %d clients (%d bytes)", clientCount, len(message))
		}
	}
}

func (h *Hub) sendInitialData() {
	h.BroadcastSummaryUpdate()
}

func (h *Hub) BroadcastServerUpdate() {
	h.mutex.RLock()
	clientCount := len(h.clients)
	h.mutex.RUnlock()

	if clientCount == 0 {
		return
	}

	servers := h.serverManager.GetAllServers()
	update := ServerUpdate{Servers: servers}
	msg := Message{Type: "server_update", Payload: update}

	var buf bytes.Buffer
	encoder := json.NewEncoder(&buf)
	if err := encoder.Encode(msg); err != nil {
		log.Printf(" Failed to encode message: %v", err)
		return
	}

	jsonData := buf.Bytes()

	select {
	case h.broadcast <- jsonData:
		log.Printf(" Broadcasted update to %d clients (%d bytes)", clientCount, len(jsonData))
	default:
		log.Printf(" Broadcast channel full, dropping message")
	}
}

func (h *Hub) BroadcastSummaryUpdate() {
	h.mutex.RLock()
	clientCount := len(h.clients)
	h.mutex.RUnlock()

	if clientCount == 0 {
		return
	}

	servers := h.serverManager.GetAllServers()
	summaries := make([]ServerSummary, 0, len(servers))

	for serverID, server := range servers {
		summary := ServerSummary{
			ServerID: serverID,
			LastSeen: server.LastSeen,
			IsOnline: server.IsOnline,
		}

		if len(server.DataHistory) > 0 {
			latest := server.DataHistory[len(server.DataHistory)-1]
			summary.PaneCount = len(latest.TmuxPanes)

			windows := make(map[string]bool)
			for _, pane := range latest.TmuxPanes {
				windows[pane.WindowID] = true
			}
			summary.WindowCount = len(windows)
		}

		summaries = append(summaries, summary)
	}

	update := SummaryUpdate{Servers: summaries}
	msg := Message{Type: "server_summary", Payload: update}

	var buf bytes.Buffer
	encoder := json.NewEncoder(&buf)
	if err := encoder.Encode(msg); err == nil {
		select {
		case h.broadcast <- buf.Bytes():
		default:
		}
	}
}

func (h *Hub) GetClientCount() int {
	h.mutex.RLock()
	defer h.mutex.RUnlock()
	return len(h.clients)
}

func (h *Hub) ServeWS(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("WebSocket upgrade error: %v", err)
		return
	}

	client := &Client{
		hub:  h,
		conn: conn,
		send: make(chan []byte, 256),
	}

	client.hub.register <- client

	go client.writePump()
	go client.readPump()
}

func (c *Client) readPump() {
	defer func() {
		c.hub.unregister <- c
		c.conn.Close()
	}()

	for {
		_, _, err := c.conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("WebSocket error: %v", err)
			}
			break
		}
	}
}

func (c *Client) writePump() {
	defer c.conn.Close()

	for {
		select {
		case message, ok := <-c.send:
			if !ok {
				c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			if err := c.conn.WriteMessage(websocket.TextMessage, message); err != nil {
				log.Printf("WebSocket write error: %v", err)
				return
			}
		}
	}
}
