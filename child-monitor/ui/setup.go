package ui

import (
	"fmt"
	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"
	"net"
	"strings"
)

type SetupModel struct {
	step       int
	serverName string
	centralIP  string
	inputs     []string
	cursor     int
	done       bool
	quitting   bool
}

func NewSetupModel() SetupModel {
	return SetupModel{
		step:   0,
		inputs: make([]string, 2),
	}
}

func (m SetupModel) Init() tea.Cmd {
	clearSetupTerminal()
	return nil
}

func clearSetupTerminal() {
	fmt.Print("\033[2J\033[H")
}

func (m SetupModel) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	switch msg := msg.(type) {
	case tea.KeyMsg:
		switch msg.String() {
		case "ctrl+c", "q":
			m.quitting = true
			return m, tea.Quit
		case "enter":
			if m.step < 1 {
				m.inputs[m.step] = strings.TrimSpace(m.inputs[m.step])
				if m.inputs[m.step] != "" {
					m.step++
				}
			} else {
				m.inputs[m.step] = strings.TrimSpace(m.inputs[m.step])
				if m.inputs[m.step] != "" {
					m.serverName = m.inputs[0]
					m.centralIP = m.inputs[1]
					m.done = true
					return m, tea.Quit
				}
			}
		case "backspace":
			if len(m.inputs[m.step]) > 0 {
				m.inputs[m.step] = m.inputs[m.step][:len(m.inputs[m.step])-1]
			}
		default:
			if len(msg.String()) == 1 {
				m.inputs[m.step] += msg.String()
			}
		}
	}
	return m, nil
}

func (m SetupModel) View() string {
	if m.quitting {
		return "Setup cancelled.\n"
	}

	var s strings.Builder

	header := lipgloss.NewStyle().
		Bold(true).
		Foreground(lipgloss.Color("#7D56F4")).
		Render("🔧 Tmux Monitor Setup") + "\n" +
		strings.Repeat("=", 21) + "\n\n"
	s.WriteString(header)

	questions := []string{
		"Server name (e.g., web-server-01):",
		"Central server address (IP:port or domain):",
	}

	for i, question := range questions {
		if i < m.step {
			s.WriteString(fmt.Sprintf(" %s %s\n", question, m.inputs[i]))
		} else if i == m.step {
			cursor := ""
			if i == m.step {
				cursor = "█"
			}
			s.WriteString(fmt.Sprintf(" %s %s%s\n", question, m.inputs[i], cursor))
		} else {
			s.WriteString(fmt.Sprintf(" %s\n", question))
		}
	}

	if m.step < 1 {
		footer := lipgloss.NewStyle().
			Faint(true).
			Render("\nType your answer and press Enter to continue")
		s.WriteString(footer)
	} else {
		footer := lipgloss.NewStyle().
			Faint(true).
			Render("\nExamples: 10.0.1.100:8080, 192.168.1.10, monitor.example.com, api.company.com:3000\nPress Enter to finish setup")
		s.WriteString(footer)
	}

	return s.String()
}

func isIP(address string) bool {
	return net.ParseIP(address) != nil
}

func (m SetupModel) GetConfig() (string, string, string, bool) {
	if !m.done {
		return "", "", "", false
	}

	centralAddr := m.centralIP
	var host, port string

	if strings.Contains(centralAddr, ":") {
		parts := strings.Split(centralAddr, ":")
		if len(parts) == 2 {
			host = parts[0]
			port = parts[1]
		} else {
			host = centralAddr
			port = ""
		}
	} else {
		host = centralAddr
		if isIP(host) {
			port = "8080"
		} else {
			port = ""
		}
	}

	return m.serverName, host, port, m.done
}

func (m SetupModel) IsQuitting() bool {
	return m.quitting
}
