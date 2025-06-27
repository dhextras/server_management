package network

import (
	"encoding/json"
	"fmt"
	"net"
	"time"
)

type DataSender struct {
	serverIP  string
	port      string
	conn      net.Conn
	connected bool
}

type SendData struct {
	ServerName  string     `json:"server_name"`
	Timestamp   time.Time  `json:"timestamp"`
	SystemStats any        `json:"system_stats"`
	TmuxPanes   []TmuxPane `json:"tmux_panes"`
	SessionName string     `json:"session_name"`
}

type TmuxPane struct {
	ID        string `json:"id"`
	WindowID  string `json:"window_id"`
	SessionID string `json:"session_id"`
	Content   string `json:"content"`
	Active    bool   `json:"active"`
}

func NewDataSender(serverIP, port string) *DataSender {
	return &DataSender{
		serverIP: serverIP,
		port:     port,
	}
}

func (ds *DataSender) Connect() error {
	address := net.JoinHostPort(ds.serverIP, ds.port)

	conn, err := net.Dial("tcp", address)
	if err != nil {
		ds.connected = false
		return fmt.Errorf("failed to connect to %s: %w", address, err)
	}

	ds.conn = conn
	ds.connected = true
	return nil
}

func (ds *DataSender) TestConnection() error {
	address := net.JoinHostPort(ds.serverIP, ds.port)

	conn, err := net.DialTimeout("tcp", address, 5*time.Second)
	if err != nil {
		return fmt.Errorf("connection test failed to %s: %w", address, err)
	}
	conn.Close()

	return nil
}

func (ds *DataSender) SendData(data SendData) error {
	if !ds.connected || ds.conn == nil {
		if err := ds.Connect(); err != nil {
			return err
		}
	}

	data.Timestamp = time.Now()

	jsonData, err := json.Marshal(data)
	if err != nil {
		return fmt.Errorf("failed to marshal data: %w", err)
	}

	jsonData = append(jsonData, '\n')

	_, err = ds.conn.Write(jsonData)
	if err != nil {
		ds.connected = false
		ds.conn = nil
		return fmt.Errorf("failed to send data: %w", err)
	}

	return nil
}

func (ds *DataSender) IsConnected() bool {
	return ds.connected && ds.conn != nil
}

func (ds *DataSender) Close() error {
	if ds.conn != nil {
		err := ds.conn.Close()
		ds.conn = nil
		ds.connected = false
		return err
	}
	return nil
}
