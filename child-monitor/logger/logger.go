package logger

import (
	"fmt"
	"log"
	"os"
	"path/filepath"
	"time"
)

type Logger struct {
	serverName  string
	logDir      string
	file        *os.File
	logger      *log.Logger
	currentDate string
}

func NewLogger(serverName string) *Logger {
	return &Logger{
		serverName: serverName,
		logDir:     "logs",
	}
}

func (l *Logger) ensureLogDir() error {
	if err := os.MkdirAll(l.logDir, 0755); err != nil {
		return fmt.Errorf("failed to create log directory: %w", err)
	}
	return nil
}

func (l *Logger) getLogFileName() string {
	date := time.Now().Format("2006-01-02")
	return fmt.Sprintf("%s_%s.log", l.serverName, date)
}

func (l *Logger) rotateLogIfNeeded() error {
	currentDate := time.Now().Format("2006-01-02")

	if l.currentDate != currentDate || l.file == nil {
		if l.file != nil {
			l.file.Close()
		}

		if err := l.ensureLogDir(); err != nil {
			return err
		}

		logPath := filepath.Join(l.logDir, l.getLogFileName())
		file, err := os.OpenFile(logPath, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0644)
		if err != nil {
			return fmt.Errorf("failed to open log file: %w", err)
		}

		l.file = file
		l.logger = log.New(file, "", log.LstdFlags)
		l.currentDate = currentDate
	}

	return nil
}

func (l *Logger) LogSendSuccess(centralServer string) error {
	if err := l.rotateLogIfNeeded(); err != nil {
		return err
	}

	l.logger.Printf("[SUCCESS] Data sent to %s", centralServer)
	return nil
}

func (l *Logger) LogSendFailure(centralServer string, err error) error {
	if logErr := l.rotateLogIfNeeded(); logErr != nil {
		return logErr
	}

	l.logger.Printf("[FAILURE] Failed to send data to %s: %v", centralServer, err)
	return nil
}

func (l *Logger) LogInfo(message string) error {
	if err := l.rotateLogIfNeeded(); err != nil {
		return err
	}

	l.logger.Printf("[INFO] %s", message)
	return nil
}

func (l *Logger) Close() error {
	if l.file != nil {
		return l.file.Close()
	}
	return nil
}
