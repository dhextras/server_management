package storage

import (
	"encoding/json"
	"fmt"
	"io/fs"
	"log"
	"os"
	"path/filepath"
	"strings"
	"time"

	"central-server/types"
)

type DataStorage struct {
	dataDir string
}

type StoredServerData struct {
	ServerName  string             `json:"server_name"`
	LastSeen    time.Time          `json:"last_seen"`
	DataHistory []types.ServerData `json:"data_history"`
}

func NewDataStorage() *DataStorage {
	return &DataStorage{
		dataDir: "data",
	}
}

func (ds *DataStorage) ensureDataDir() error {
	if err := os.MkdirAll(ds.dataDir, 0755); err != nil {
		return fmt.Errorf("failed to create data directory: %w", err)
	}
	return nil
}

func (ds *DataStorage) getServerFileName(serverName string) string {
	safeServerName := strings.ReplaceAll(serverName, "/", "_")
	safeServerName = strings.ReplaceAll(safeServerName, "\\", "_")
	return filepath.Join(ds.dataDir, fmt.Sprintf("%s.json", safeServerName))
}

func (ds *DataStorage) SaveServerData(serverInfo *types.ServerInfo) error {
	if err := ds.ensureDataDir(); err != nil {
		return err
	}

	serverInfo.RLock()
	storedData := StoredServerData{
		ServerName:  serverInfo.Name,
		LastSeen:    serverInfo.LastSeen,
		DataHistory: make([]types.ServerData, len(serverInfo.DataHistory)),
	}
	copy(storedData.DataHistory, serverInfo.DataHistory)
	serverInfo.RUnlock()

	data, err := json.MarshalIndent(storedData, "", "  ")
	if err != nil {
		return fmt.Errorf("failed to marshal server data: %w", err)
	}

	fileName := ds.getServerFileName(serverInfo.Name)
	if err := os.WriteFile(fileName, data, 0644); err != nil {
		return fmt.Errorf("failed to write server data file: %w", err)
	}

	return nil
}

func (ds *DataStorage) LoadServerData(serverName string) (*types.ServerInfo, error) {
	fileName := ds.getServerFileName(serverName)

	if _, err := os.Stat(fileName); os.IsNotExist(err) {
		return nil, nil
	}

	data, err := os.ReadFile(fileName)
	if err != nil {
		return nil, fmt.Errorf("failed to read server data file: %w", err)
	}

	var storedData StoredServerData
	if err := json.Unmarshal(data, &storedData); err != nil {
		return nil, fmt.Errorf("failed to unmarshal server data: %w", err)
	}

	serverInfo := &types.ServerInfo{
		Name:        storedData.ServerName,
		LastSeen:    storedData.LastSeen,
		DataHistory: storedData.DataHistory,
	}

	serverInfo.UpdateStateFromLastSeen()

	log.Printf("📂 Loaded data for server: %s (last seen: %s)",
		serverName, storedData.LastSeen.Format("2006-01-02 15:04:05"))

	return serverInfo, nil
}

func (ds *DataStorage) LoadAllServerData() (map[string]*types.ServerInfo, error) {
	if err := ds.ensureDataDir(); err != nil {
		return nil, err
	}

	servers := make(map[string]*types.ServerInfo)

	err := filepath.WalkDir(ds.dataDir, func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}

		if d.IsDir() || !strings.HasSuffix(d.Name(), ".json") {
			return nil
		}

		serverName := strings.TrimSuffix(d.Name(), ".json")
		serverInfo, err := ds.LoadServerData(serverName)
		if err != nil {
			log.Printf("⚠️  Failed to load data for server %s: %v", serverName, err)
			return nil
		}

		if serverInfo != nil {
			servers[serverName] = serverInfo
		}

		return nil
	})

	if err != nil {
		return nil, fmt.Errorf("failed to walk data directory: %w", err)
	}

	log.Printf("📂 Loaded data for %d servers from disk", len(servers))
	return servers, nil
}

func (ds *DataStorage) DeleteServerData(serverName string) error {
	fileName := ds.getServerFileName(serverName)

	if err := os.Remove(fileName); err != nil && !os.IsNotExist(err) {
		return fmt.Errorf("failed to delete server data file: %w", err)
	}

	log.Printf("🗑️  Deleted data for server: %s", serverName)
	return nil
}

func (ds *DataStorage) GetDataDirectory() string {
	return ds.dataDir
}

func (ds *DataStorage) GetStoredServerNames() ([]string, error) {
	if err := ds.ensureDataDir(); err != nil {
		return nil, err
	}

	var serverNames []string

	err := filepath.WalkDir(ds.dataDir, func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}

		if d.IsDir() || !strings.HasSuffix(d.Name(), ".json") {
			return nil
		}

		serverName := strings.TrimSuffix(d.Name(), ".json")
		serverNames = append(serverNames, serverName)
		return nil
	})

	return serverNames, err
}
