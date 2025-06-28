package types

import (
	"sync"
	"time"
)

type ServerState string

const (
	StateActive ServerState = "active" // receiving data
	StateStale  ServerState = "stale"  // 5-10 seconds old
	StateDead   ServerState = "dead"   // 10+ seconds no data
)

type SystemStats struct {
	Timestamp time.Time `json:"timestamp"`
	CPU       float64   `json:"cpu_percent"`
	Memory    MemStats  `json:"memory"`
	Disk      DiskStats `json:"disk"`
}

type MemStats struct {
	Total     uint64  `json:"total"`
	Available uint64  `json:"available"`
	Used      uint64  `json:"used"`
	Percent   float64 `json:"percent"`
}

type DiskStats struct {
	Total   uint64  `json:"total"`
	Free    uint64  `json:"free"`
	Used    uint64  `json:"used"`
	Percent float64 `json:"percent"`
}

type TmuxPane struct {
	ID        string `json:"id"`
	WindowID  string `json:"window_id"`
	SessionID string `json:"session_id"`
	Content   string `json:"content"`
	Active    bool   `json:"active"`
}

type ServerData struct {
	ServerName  string      `json:"server_name"`
	Timestamp   time.Time   `json:"timestamp"`
	SystemStats SystemStats `json:"system_stats"`
	TmuxPanes   []TmuxPane  `json:"tmux_panes"`
	SessionName string      `json:"session_name"`
}

type ServerInfo struct {
	Name        string       `json:"name"`
	State       ServerState  `json:"state"`
	LastSeen    time.Time    `json:"last_seen"`
	DataHistory []ServerData `json:"data_history"`
	mutex       sync.RWMutex `json:"-"`
}

func (s *ServerInfo) AddData(data ServerData) {
	s.mutex.Lock()
	defer s.mutex.Unlock()

	s.LastSeen = time.Now()
	s.DataHistory = append(s.DataHistory, data)

	// NOTE: Keep 50 page of history for each server
	if len(s.DataHistory) > 50 {
		s.DataHistory = s.DataHistory[1:]
	}

	s.updateState()
}

func (s *ServerInfo) GetLatestData() *ServerData {
	s.mutex.RLock()
	defer s.mutex.RUnlock()

	if len(s.DataHistory) == 0 {
		return nil
	}
	return &s.DataHistory[len(s.DataHistory)-1]
}

func (s *ServerInfo) GetState() ServerState {
	s.mutex.RLock()
	defer s.mutex.RUnlock()
	return s.State
}

func (s *ServerInfo) RLock() {
	s.mutex.RLock()
}

func (s *ServerInfo) RUnlock() {
	s.mutex.RUnlock()
}

func (s *ServerInfo) UpdateStateFromLastSeen() {
	s.mutex.Lock()
	defer s.mutex.Unlock()
	s.updateState()
}

func (s *ServerInfo) updateState() {
	timeSinceLastSeen := time.Since(s.LastSeen)

	if timeSinceLastSeen > 10*time.Second {
		s.State = StateDead
	} else if timeSinceLastSeen > 5*time.Second {
		s.State = StateStale
	} else {
		s.State = StateActive
	}
}

type ServerManager struct {
	servers map[string]*ServerInfo
	mutex   sync.RWMutex
	storage StorageInterface
}

type StorageInterface interface {
	SaveServerData(*ServerInfo) error
	LoadServerData(string) (*ServerInfo, error)
	LoadAllServerData() (map[string]*ServerInfo, error)
}

func NewServerManager() *ServerManager {
	return &ServerManager{
		servers: make(map[string]*ServerInfo),
	}
}

func (sm *ServerManager) SetStorage(storage StorageInterface) {
	sm.storage = storage
}

func (sm *ServerManager) LoadFromStorage() error {
	if sm.storage == nil {
		return nil
	}

	servers, err := sm.storage.LoadAllServerData()
	if err != nil {
		return err
	}

	sm.mutex.Lock()
	sm.servers = servers
	sm.mutex.Unlock()

	return nil
}

func (sm *ServerManager) UpdateServer(data ServerData) {
	sm.mutex.Lock()
	defer sm.mutex.Unlock()

	server, exists := sm.servers[data.ServerName]
	if !exists {
		server = &ServerInfo{
			Name:        data.ServerName,
			DataHistory: make([]ServerData, 0, 10),
		}
		sm.servers[data.ServerName] = server
	}

	server.AddData(data)

	if sm.storage != nil {
		go func() {
			if err := sm.storage.SaveServerData(server); err != nil {
				// Log error but don't block
			}
		}()
	}
}

func (sm *ServerManager) GetAllServers() map[string]*ServerInfo {
	sm.mutex.RLock()
	defer sm.mutex.RUnlock()

	result := make(map[string]*ServerInfo)
	for name, server := range sm.servers {
		result[name] = server
	}
	return result
}

func (sm *ServerManager) GetServer(name string) *ServerInfo {
	sm.mutex.RLock()
	defer sm.mutex.RUnlock()

	return sm.servers[name]
}

func (sm *ServerManager) UpdateServerStates() {
	sm.mutex.RLock()
	defer sm.mutex.RUnlock()

	for _, server := range sm.servers {
		server.mutex.Lock()
		server.updateState()
		server.mutex.Unlock()
	}
}
