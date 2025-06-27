package tcp

import (
	"bufio"
	"encoding/json"
	"fmt"
	"log"
	"net"
	"time"

	"central-server/types"
)

type TCPServer struct {
	port          string
	serverManager *types.ServerManager
	broadcaster   chan types.ServerData
}

func NewTCPServer(port string, serverManager *types.ServerManager, broadcaster chan types.ServerData) *TCPServer {
	return &TCPServer{
		port:          port,
		serverManager: serverManager,
		broadcaster:   broadcaster,
	}
}

func (s *TCPServer) Start() error {
	listener, err := net.Listen("tcp", ":"+s.port)
	if err != nil {
		return fmt.Errorf("failed to start TCP server: %w", err)
	}

	log.Printf("🔧 TCP server listening on port %s", s.port)

	for {
		conn, err := listener.Accept()
		if err != nil {
			log.Printf("Failed to accept connection: %v", err)
			continue
		}

		go s.handleConnection(conn)
	}
}

func (s *TCPServer) handleConnection(conn net.Conn) {
	defer conn.Close()

	clientAddr := conn.RemoteAddr().String()
	log.Printf("📱 New connection from %s", clientAddr)

	scanner := bufio.NewScanner(conn)

	for scanner.Scan() {
		line := scanner.Text()
		if line == "" {
			continue
		}

		var data types.ServerData
		if err := json.Unmarshal([]byte(line), &data); err != nil {
			log.Printf("Failed to parse data from %s: %v", clientAddr, err)
			continue
		}

		data.Timestamp = time.Now()

		s.serverManager.UpdateServer(data)

		select {
		case s.broadcaster <- data:
		default:
		}
	}

	if err := scanner.Err(); err != nil {
		log.Printf("Connection error with %s: %v", clientAddr, err)
	}

	log.Printf("📱 Connection closed: %s", clientAddr)
}
