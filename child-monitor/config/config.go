package config

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
)

type Config struct {
	ServerName      string   `json:"server_name"`
	CentralServerIP string   `json:"central_server_ip"`
	CentralPort     string   `json:"central_port"`
	SessionID       string   `json:"session_id"`
	WindowIDs       []string `json:"window_ids"`
	PaneIDs         []string `json:"pane_ids"`
	SessionName     string   `json:"session_name"`
}

const (
	configDirName  = "server-management"
	configFileName = "monitor_config.json"
)

func getConfigDir() (string, error) {
	homeDir, err := os.UserHomeDir()
	if err != nil {
		return "", fmt.Errorf("failed to get home directory: %w", err)
	}

	// Use XDG_STATE_HOME if set, otherwise ~/.local/state
	stateDir := os.Getenv("XDG_STATE_HOME")
	if stateDir == "" {
		stateDir = filepath.Join(homeDir, ".local", "state")
	}

	configDir := filepath.Join(stateDir, configDirName)
	return configDir, nil
}

func getConfigFilePath() (string, error) {
	configDir, err := getConfigDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(configDir, configFileName), nil
}

func ensureConfigDir() error {
	configDir, err := getConfigDir()
	if err != nil {
		return err
	}

	return os.MkdirAll(configDir, 0755)
}

func SaveConfig(config Config) error {
	if err := ensureConfigDir(); err != nil {
		return fmt.Errorf("failed to create config directory: %w", err)
	}

	configPath, err := getConfigFilePath()
	if err != nil {
		return err
	}

	data, err := json.MarshalIndent(config, "", "  ")
	if err != nil {
		return fmt.Errorf("failed to marshal config: %w", err)
	}

	if err := os.WriteFile(configPath, data, 0644); err != nil {
		return fmt.Errorf("failed to write config file: %w", err)
	}

	return nil
}

func LoadConfig() (*Config, error) {
	configPath, err := getConfigFilePath()
	if err != nil {
		return nil, err
	}

	if _, err := os.Stat(configPath); os.IsNotExist(err) {
		return nil, fmt.Errorf("config file not found")
	}

	data, err := os.ReadFile(configPath)
	if err != nil {
		return nil, fmt.Errorf("failed to read config file: %w", err)
	}

	var config Config
	if err := json.Unmarshal(data, &config); err != nil {
		return nil, fmt.Errorf("failed to unmarshal config: %w", err)
	}

	return &config, nil
}

func ConfigExists() bool {
	configPath, err := getConfigFilePath()
	if err != nil {
		return false
	}

	_, err = os.Stat(configPath)
	return !os.IsNotExist(err)
}

func DeleteConfig() error {
	configPath, err := getConfigFilePath()
	if err != nil {
		return err
	}

	if err := os.Remove(configPath); err != nil && !os.IsNotExist(err) {
		return fmt.Errorf("failed to delete config file: %w", err)
	}

	return nil
}

func GetConfigPath() (string, error) {
	return getConfigFilePath()
}
