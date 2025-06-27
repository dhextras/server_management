package tmux

import (
	"bufio"
	"fmt"
	"os/exec"
	"strings"
)

func GetSessions() ([]Session, error) {
	cmd := exec.Command("tmux", "list-sessions", "-F", "#{session_id}:#{session_name}")
	output, err := cmd.Output()
	if err != nil {
		return nil, fmt.Errorf("failed to list sessions: %w", err)
	}

	var sessions []Session
	scanner := bufio.NewScanner(strings.NewReader(string(output)))

	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" {
			continue
		}

		parts := strings.SplitN(line, ":", 2)
		if len(parts) == 2 {
			sessions = append(sessions, Session{
				ID:   parts[0],
				Name: parts[1],
			})
		}
	}

	return sessions, nil
}

func GetWindows(sessionID string) ([]Window, error) {
	cmd := exec.Command("tmux", "list-windows", "-t", sessionID, "-F", "#{window_id}:#{window_name}")
	output, err := cmd.Output()
	if err != nil {
		return nil, fmt.Errorf("failed to list windows: %w", err)
	}

	var windows []Window
	scanner := bufio.NewScanner(strings.NewReader(string(output)))

	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" {
			continue
		}

		parts := strings.SplitN(line, ":", 2)
		if len(parts) == 2 {
			windows = append(windows, Window{
				ID:        parts[0],
				Name:      parts[1],
				SessionID: sessionID,
			})
		}
	}

	return windows, nil
}

func GetPanes(sessionID, windowID string) ([]Pane, error) {
	target := fmt.Sprintf("%s:%s", sessionID, windowID)
	cmd := exec.Command("tmux", "list-panes", "-t", target, "-F", "#{pane_id}:#{pane_active}")
	output, err := cmd.Output()
	if err != nil {
		return nil, fmt.Errorf("failed to list panes: %w", err)
	}

	var panes []Pane
	scanner := bufio.NewScanner(strings.NewReader(string(output)))

	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" {
			continue
		}

		parts := strings.SplitN(line, ":", 2)
		if len(parts) == 2 {
			panes = append(panes, Pane{
				ID:        parts[0],
				WindowID:  windowID,
				SessionID: sessionID,
				Active:    parts[1] == "1",
			})
		}
	}

	return panes, nil
}

func GetPaneContent(sessionID, windowID, paneID string) (string, error) {
	target := fmt.Sprintf("%s:%s.%s", sessionID, windowID, paneID)
	cmd := exec.Command("tmux", "capture-pane", "-et", target, "-p")
	output, err := cmd.Output()
	if err != nil {
		return "", fmt.Errorf("failed to capture pane: %w", err)
	}

	return string(output), nil
}

func IsTmuxRunning() bool {
	cmd := exec.Command("tmux", "list-sessions")
	err := cmd.Run()
	return err == nil
}
