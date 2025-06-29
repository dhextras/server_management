package websocket

import (
	"bytes"
	"crypto/md5"
	"encoding/json"
	"fmt"
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

var bufferPool = sync.Pool{
	New: func() any {
		return bytes.NewBuffer(make([]byte, 0, 1024))
	},
}

func getBuffer() *bytes.Buffer {
	return bufferPool.Get().(*bytes.Buffer)
}

func putBuffer(buf *bytes.Buffer) {
	// Reset buffer and put back in pool if not too large
	buf.Reset()
	if buf.Cap() < 64*1024 { // Don't pool buffers larger than 64KB
		bufferPool.Put(buf)
	}
}

type Hub struct {
	clients       map[*Client]bool
	broadcast     chan []byte
	register      chan *Client
	unregister    chan *Client
	serverManager *types.ServerManager
	mutex         sync.RWMutex
	lastSentData  map[string]string
	lastSentMutex sync.RWMutex
	lastFullSync  time.Time
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
	Servers    map[string]*types.ServerInfo `json:"servers"`
	IsFullSync bool                         `json:"is_full_sync"`
}

type SingleServerUpdate struct {
	ServerID   string            `json:"server_id"`
	ServerData *types.ServerInfo `json:"server_data"`
	IsFullSync bool              `json:"is_full_sync"`
}

type FullSyncStart struct {
	TotalServers int  `json:"total_servers"`
	IsFullSync   bool `json:"is_full_sync"`
}

type FullSyncComplete struct {
	IsFullSync bool `json:"is_full_sync"`
}

type DeltaUpdate struct {
	ChangedServers map[string]*types.ServerInfo `json:"changed_servers"`
	RemovedServers []string                     `json:"removed_servers,omitempty"`
	Timestamp      time.Time                    `json:"timestamp"`
}

func NewHub(serverManager *types.ServerManager) *Hub {
	return &Hub{
		clients:       make(map[*Client]bool),
		broadcast:     make(chan []byte, 256),
		register:      make(chan *Client),
		unregister:    make(chan *Client),
		serverManager: serverManager,
		lastSentData:  make(map[string]string),
		lastFullSync:  time.Now(),
	}
}

func (h *Hub) Run() {
	go h.startPeriodicUpdates()

	for {
		select {
		case client := <-h.register:
			h.mutex.Lock()
			h.clients[client] = true
			clientCount := len(h.clients)
			h.mutex.Unlock()
			log.Printf("WebSocket client connected (total: %d)", clientCount)

			h.sendFullSyncToClient(client)

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
		}
	}
}

func (h *Hub) startPeriodicUpdates() {
	deltaTicker := time.NewTicker(2 * time.Second)
	fullSyncTicker := time.NewTicker(5 * time.Minute)
	defer deltaTicker.Stop()
	defer fullSyncTicker.Stop()

	for {
		select {
		case <-deltaTicker.C:
			h.broadcastDeltaUpdate()
		case <-fullSyncTicker.C:
			h.broadcastFullSync()
		}
	}
}

func (h *Hub) hashServerData(server *types.ServerInfo) string {
	buf := getBuffer()
	defer putBuffer(buf)

	encoder := json.NewEncoder(buf)
	encoder.Encode(server)
	hash := md5.Sum(buf.Bytes())
	return fmt.Sprintf("%x", hash)
}

func (h *Hub) broadcastDeltaUpdate() {
	h.mutex.RLock()
	clientCount := len(h.clients)
	h.mutex.RUnlock()

	if clientCount == 0 {
		return
	}

	servers := h.serverManager.GetAllServers()
	changedServers := make(map[string]*types.ServerInfo)
	var removedServers []string

	h.lastSentMutex.Lock()
	currentHashes := make(map[string]string)

	for serverID, server := range servers {
		currentHash := h.hashServerData(server)
		currentHashes[serverID] = currentHash

		if lastHash, exists := h.lastSentData[serverID]; !exists || lastHash != currentHash {
			changedServers[serverID] = server
		}
	}

	for serverID := range h.lastSentData {
		if _, exists := servers[serverID]; !exists {
			removedServers = append(removedServers, serverID)
		}
	}

	h.lastSentData = currentHashes
	h.lastSentMutex.Unlock()

	if len(changedServers) == 0 && len(removedServers) == 0 {
		return
	}

	deltaUpdate := DeltaUpdate{
		ChangedServers: changedServers,
		RemovedServers: removedServers,
		Timestamp:      time.Now(),
	}

	msg := Message{Type: "delta_update", Payload: deltaUpdate}

	buf := getBuffer()
	defer putBuffer(buf)

	encoder := json.NewEncoder(buf)
	if err := encoder.Encode(msg); err != nil {
		log.Printf("Failed to encode delta message: %v", err)
		return
	}

	jsonData := make([]byte, buf.Len())
	copy(jsonData, buf.Bytes())

	select {
	case h.broadcast <- jsonData:
		log.Printf("Delta update: %d changed, %d removed (%s bytes)",
			len(changedServers), len(removedServers), formatBytes(len(jsonData)))
	default:
		log.Printf("Broadcast channel full, dropping delta message")
	}
}

func (h *Hub) broadcastFullSync() {
	h.mutex.RLock()
	clientCount := len(h.clients)
	h.mutex.RUnlock()

	if clientCount == 0 {
		return
	}

	servers := h.serverManager.GetAllServers()

	startMsg := Message{
		Type: "full_sync_start",
		Payload: FullSyncStart{
			TotalServers: len(servers),
			IsFullSync:   true,
		},
	}

	buf := getBuffer()
	encoder := json.NewEncoder(buf)
	if err := encoder.Encode(startMsg); err != nil {
		putBuffer(buf)
		log.Printf("Failed to encode full sync start message: %v", err)
		return
	}

	startData := make([]byte, buf.Len())
	copy(startData, buf.Bytes())
	putBuffer(buf)

	select {
	case h.broadcast <- startData:
	default:
		log.Printf("Broadcast channel full, dropping full sync start message")
		return
	}

	h.lastSentMutex.Lock()
	for serverID, server := range servers {
		h.lastSentData[serverID] = h.hashServerData(server)

		serverMsg := Message{
			Type: "server_update",
			Payload: SingleServerUpdate{
				ServerID:   serverID,
				ServerData: server,
				IsFullSync: true,
			},
		}

		serverBuf := getBuffer()
		serverEncoder := json.NewEncoder(serverBuf)
		if err := serverEncoder.Encode(serverMsg); err != nil {
			putBuffer(serverBuf)
			log.Printf("Failed to encode server update message: %v", err)
			continue
		}

		serverData := make([]byte, serverBuf.Len())
		copy(serverData, serverBuf.Bytes())
		putBuffer(serverBuf)

		select {
		case h.broadcast <- serverData:
		default:
			log.Printf("Broadcast channel full, dropping server update")
		}

		time.Sleep(100 * time.Millisecond) // NOTE: Remove this if the json data didn't get messed up due to memmory correption
	}
	h.lastFullSync = time.Now()
	h.lastSentMutex.Unlock()

	completeMsg := Message{
		Type:    "full_sync_complete",
		Payload: FullSyncComplete{IsFullSync: true},
	}

	completeBuf := getBuffer()
	completeEncoder := json.NewEncoder(completeBuf)
	if err := completeEncoder.Encode(completeMsg); err != nil {
		putBuffer(completeBuf)
		log.Printf("Failed to encode full sync complete message: %v", err)
		return
	}

	completeData := make([]byte, completeBuf.Len())
	copy(completeData, completeBuf.Bytes())
	putBuffer(completeBuf)

	select {
	case h.broadcast <- completeData:
		log.Printf("Full sync: %d servers sent individually", len(servers))
	default:
		log.Printf("Broadcast channel full, dropping full sync complete message")
	}
}

func (h *Hub) sendFullSyncToClient(client *Client) {
	servers := h.serverManager.GetAllServers()

	startMsg := Message{
		Type: "full_sync_start",
		Payload: FullSyncStart{
			TotalServers: len(servers),
			IsFullSync:   true,
		},
	}

	buf := getBuffer()
	encoder := json.NewEncoder(buf)
	if err := encoder.Encode(startMsg); err != nil {
		putBuffer(buf)
		log.Printf("Failed to encode initial sync start message: %v", err)
		return
	}

	startData := make([]byte, buf.Len())
	copy(startData, buf.Bytes())
	putBuffer(buf)

	select {
	case client.send <- startData:
	default:
		log.Printf("Failed to send initial sync start to new client")
		return
	}

	for serverID, server := range servers {
		serverMsg := Message{
			Type: "server_update",
			Payload: SingleServerUpdate{
				ServerID:   serverID,
				ServerData: server,
				IsFullSync: true,
			},
		}

		serverBuf := getBuffer()
		serverEncoder := json.NewEncoder(serverBuf)
		if err := serverEncoder.Encode(serverMsg); err != nil {
			putBuffer(serverBuf)
			log.Printf("Failed to encode initial server update message: %v", err)
			continue
		}

		serverData := make([]byte, serverBuf.Len())
		copy(serverData, serverBuf.Bytes())
		putBuffer(serverBuf)

		select {
		case client.send <- serverData:
		default:
			log.Printf("Failed to send initial server update to new client")
		}

		time.Sleep(200 * time.Millisecond)
	}

	completeMsg := Message{
		Type:    "full_sync_complete",
		Payload: FullSyncComplete{IsFullSync: true},
	}

	completeBuf := getBuffer()
	completeEncoder := json.NewEncoder(completeBuf)
	if err := completeEncoder.Encode(completeMsg); err != nil {
		putBuffer(completeBuf)
		log.Printf("Failed to encode initial sync complete message: %v", err)
		return
	}

	completeData := make([]byte, completeBuf.Len())
	copy(completeData, completeBuf.Bytes())
	putBuffer(completeBuf)

	select {
	case client.send <- completeData:
		log.Printf("Sent initial sync to new client (%d servers)", len(servers))
	default:
		log.Printf("Failed to send initial sync complete to new client")
	}
}

func (h *Hub) GetClientCount() int {
	h.mutex.RLock()
	defer h.mutex.RUnlock()
	return len(h.clients)
}

func (h *Hub) GetStats() map[string]any {
	h.mutex.RLock()
	clientCount := len(h.clients)
	h.mutex.RUnlock()

	h.lastSentMutex.RLock()
	trackedServers := len(h.lastSentData)
	timeSinceFullSync := time.Since(h.lastFullSync)
	h.lastSentMutex.RUnlock()

	return map[string]any{
		"connected_clients":       clientCount,
		"tracked_servers":         trackedServers,
		"time_since_full_sync":    timeSinceFullSync.String(),
		"broadcast_channel_usage": fmt.Sprintf("%d/%d", len(h.broadcast), cap(h.broadcast)),
	}
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

func formatBytes(bytes int) string {
	if bytes >= 1024*1024*1024 {
		return fmt.Sprintf("%.2fGB", float64(bytes)/(1024*1024*1024))
	} else if bytes >= 1024*1024 {
		return fmt.Sprintf("%.2fMB", float64(bytes)/(1024*1024))
	} else if bytes >= 1024 {
		return fmt.Sprintf("%.2fKB", float64(bytes)/1024)
	}
	return fmt.Sprintf("%dB", bytes)
}
