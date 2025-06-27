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

type PanePickerModel struct {
	windowName string
	panes      []tmux.Pane
	cursor     int
	selected   map[int]bool
	done       bool
	quitting   bool
	preview    string
	width      int
	height     int
}

func NewPanePicker(windowName string, panes []tmux.Pane) PanePickerModel {
	clearPaneTerminal()

	m := PanePickerModel{
		windowName: windowName,
		panes:      panes,
		selected:   make(map[int]bool),
		width:      80,
		height:     24,
	}

	if len(panes) > 0 {
		m.preview = getPanePreview(panes[0])
	}

	return m
}

func clearPaneTerminal() {
	cmd := exec.Command("clear")
	cmd.Stdout = os.Stdout
	cmd.Run()
}

func getPanePreview(pane tmux.Pane) string {
	content, err := tmux.GetPaneContent(pane.SessionID, pane.WindowID, pane.ID)
	if err != nil {
		return fmt.Sprintf("Error loading pane: %v", err)
	}

	var preview strings.Builder
	preview.WriteString(fmt.Sprintf("🔲 Pane: %s\n", pane.ID))
	if pane.Active {
		preview.WriteString("Status: Active\n\n")
	} else {
		preview.WriteString("Status: Inactive\n\n")
	}

	preview.WriteString("Content:\n")
	preview.WriteString(truncatePreview(content, 15))

	return preview.String()
}

func (m PanePickerModel) Init() tea.Cmd {
	return nil
}

func (m PanePickerModel) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
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
			if m.cursor < len(m.panes)-1 {
				m.cursor++
			}

		case " ":
			m.selected[m.cursor] = !m.selected[m.cursor]

		case "enter":
			if len(m.selected) > 0 {
				m.done = true
				return m, tea.Quit
			}
		}

		if oldCursor != m.cursor && m.cursor < len(m.panes) {
			m.preview = getPanePreview(m.panes[m.cursor])
		}
	}

	return m, nil
}

func (m PanePickerModel) View() string {
	if m.quitting {
		return "Goodbye!\n"
	}

	var leftPanel strings.Builder

	header := lipgloss.NewStyle().
		Bold(true).
		Foreground(lipgloss.Color("#7D56F4")).
		Render(fmt.Sprintf("🔲 Panes in '%s':", m.windowName)) + "\n\n"

	leftPanel.WriteString(header)

	for i, pane := range m.panes {
		cursor := " "
		if m.cursor == i {
			cursor = ">"
		}

		checked := " "
		if m.selected[i] {
			checked = "✓"
		}

		active := ""
		if pane.Active {
			active = " (active)"
		}

		leftPanel.WriteString(fmt.Sprintf("%s [%s] %d. Pane %s%s\n",
			cursor, checked, i+1, pane.ID, active))
	}

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

func (m PanePickerModel) SelectedPanes() []tmux.Pane {
	var selected []tmux.Pane
	for i, isSelected := range m.selected {
		if isSelected && i < len(m.panes) {
			selected = append(selected, m.panes[i])
		}
	}
	return selected
}

func (m PanePickerModel) IsDone() bool {
	return m.done
}

func (m PanePickerModel) IsQuitting() bool {
	return m.quitting
}
