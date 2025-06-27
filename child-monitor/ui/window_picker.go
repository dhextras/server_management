package ui

import (
	"fmt"
	"os"
	"os/exec"
	"strings"

	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"

	"child-monitor/tmux"
)

type WindowPickerModel struct {
	sessionName string
	sessionID   string
	windows     []tmux.Window
	cursor      int
	selected    map[int]bool
	allSelected bool
	done        bool
	quitting    bool
	preview     string
	width       int
	height      int
}

func NewWindowPicker(sessionName string, windows []tmux.Window) WindowPickerModel {
	clearWindowTerminal()

	sessionID := ""
	if len(windows) > 0 {
		sessionID = windows[0].SessionID
	}

	m := WindowPickerModel{
		sessionName: sessionName,
		sessionID:   sessionID,
		windows:     windows,
		selected:    make(map[int]bool),
		width:       80,
		height:      24,
	}

	if len(windows) > 0 {
		m.preview = getWindowPreview(windows[0])
	}

	return m
}

func clearWindowTerminal() {
	cmd := exec.Command("clear")
	cmd.Stdout = os.Stdout
	cmd.Run()
}

func getWindowPreview(window tmux.Window) string {
	panes, err := tmux.GetPanes(window.SessionID, window.ID)
	if err != nil {
		return fmt.Sprintf("Error loading window: %v", err)
	}

	if len(panes) == 0 {
		return "No panes in this window"
	}

	var preview strings.Builder
	preview.WriteString(fmt.Sprintf("🪟 Window: %s (%s)\n", window.Name, window.ID))
	preview.WriteString(fmt.Sprintf("Panes: %d\n\n", len(panes)))

	activePaneContent := ""
	for _, pane := range panes {
		if pane.Active {
			content, err := tmux.GetPaneContent(window.SessionID, window.ID, pane.ID)
			if err == nil {
				activePaneContent = content
			}
			break
		}
	}

	if activePaneContent == "" && len(panes) > 0 {
		content, err := tmux.GetPaneContent(window.SessionID, window.ID, panes[0].ID)
		if err == nil {
			activePaneContent = content
		}
	}

	if activePaneContent != "" {
		preview.WriteString("Active pane content:\n")
		preview.WriteString(truncatePreview(activePaneContent, 12))
	}

	return preview.String()
}

func (m WindowPickerModel) Init() tea.Cmd {
	return nil
}

func (m WindowPickerModel) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	switch msg := msg.(type) {
	case tea.WindowSizeMsg:
		m.width = msg.Width
		m.height = msg.Height
		return m, nil

	case tea.KeyMsg:
		oldCursor := m.cursor

		switch msg.String() {
		case "ctrl+c", "q":
			m.quitting = true
			return m, tea.Quit

		case "up", "k":
			if m.cursor > 0 {
				m.cursor--
			}

		case "down", "j":
			if m.cursor < len(m.windows) {
				m.cursor++
			}

		case " ":
			if m.cursor == len(m.windows) {
				m.allSelected = !m.allSelected
				if m.allSelected {
					m.selected = make(map[int]bool)
				}
			} else {
				if m.allSelected {
					m.allSelected = false
				}
				m.selected[m.cursor] = !m.selected[m.cursor]
			}

		case "enter":
			if len(m.selected) > 0 || m.allSelected {
				m.done = true
				return m, tea.Quit
			}
		}

		if oldCursor != m.cursor {
			if m.cursor < len(m.windows) {
				m.preview = getWindowPreview(m.windows[m.cursor])
			} else {
				m.preview = "Monitor all windows in session"
			}
		}
	}

	return m, nil
}

func (m WindowPickerModel) View() string {
	if m.quitting {
		return "Goodbye!\n"
	}

	var leftPanel strings.Builder

	header := lipgloss.NewStyle().
		Bold(true).
		Foreground(lipgloss.Color("#7D56F4")).
		Render(fmt.Sprintf("🪟 Windows in '%s':", m.sessionName)) + "\n\n"

	leftPanel.WriteString(header)

	for i, window := range m.windows {
		cursor := " "
		if m.cursor == i {
			cursor = ">"
		}

		checked := " "
		if m.selected[i] {
			checked = "✓"
		}

		leftPanel.WriteString(fmt.Sprintf("%s [%s] %d. %s (ID: %s)\n",
			cursor, checked, i+1, window.Name, window.ID))
	}

	cursor := " "
	if m.cursor == len(m.windows) {
		cursor = ">"
	}

	checked := " "
	if m.allSelected {
		checked = "✓"
	}

	leftPanel.WriteString(fmt.Sprintf("\n%s [%s] ALL windows\n", cursor, checked))

	footer := lipgloss.NewStyle().
		Faint(true).
		Render("\nSpace: toggle, Enter: confirm, q: quit")

	leftPanel.WriteString(footer)

	leftView := leftPanel.String()

	previewStyle := lipgloss.NewStyle().
		Border(lipgloss.RoundedBorder()).
		BorderForeground(lipgloss.Color("#7D56F4")).
		Padding(1).
		Width(m.width/2 - 4).
		Height(m.height - 4)

	previewView := previewStyle.Render(m.preview)

	return lipgloss.JoinHorizontal(
		lipgloss.Top,
		leftView,
		"  ",
		previewView,
	)
}

func (m WindowPickerModel) SelectedWindows() []tmux.Window {
	if m.allSelected {
		return m.windows
	}

	var selected []tmux.Window
	for i, isSelected := range m.selected {
		if isSelected && i < len(m.windows) {
			selected = append(selected, m.windows[i])
		}
	}
	return selected
}

func (m WindowPickerModel) IsDone() bool {
	return m.done
}

func (m WindowPickerModel) IsQuitting() bool {
	return m.quitting
}
