package ui

import (
	"fmt"
	"os"
	"os/exec"
	"strings"

	"github.com/charmbracelet/bubbles/list"
	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"

	"child-monitor/tmux"
)

var (
	titleStyle = lipgloss.NewStyle().
			Bold(true).
			Foreground(lipgloss.Color("#FAFAFA")).
			Background(lipgloss.Color("#7D56F4")).
			Padding(0, 1)

	statusStyle = lipgloss.NewStyle().
			Foreground(lipgloss.Color("#FAFAFA")).
			Background(lipgloss.Color("#7D56F4")).
			Padding(0, 1)
)

type sessionItem struct {
	session tmux.Session
}

func (i sessionItem) FilterValue() string { return i.session.Name }
func (i sessionItem) Title() string       { return i.session.Name }
func (i sessionItem) Description() string { return fmt.Sprintf("Session ID: %s", i.session.ID) }

type SessionPickerModel struct {
	list     list.Model
	sessions []tmux.Session
	selected *tmux.Session
	preview  string
	quitting bool
	width    int
	height   int
}

func NewSessionPicker(sessions []tmux.Session) SessionPickerModel {
	clearTerminal()

	items := make([]list.Item, len(sessions))
	for i, session := range sessions {
		items[i] = sessionItem{session: session}
	}

	l := list.New(items, list.NewDefaultDelegate(), 80, 20)
	l.Title = "🔧 Tmux Monitor - Select Session"
	l.SetShowStatusBar(false)
	l.SetFilteringEnabled(false)
	l.Styles.Title = titleStyle

	m := SessionPickerModel{
		list:     l,
		sessions: sessions,
		width:    80,
		height:   24,
	}

	if len(sessions) > 0 {
		m.preview = getSessionPreview(sessions[0])
	}

	return m
}

func (m SessionPickerModel) Init() tea.Cmd {
	return nil
}

func clearTerminal() {
	cmd := exec.Command("clear")
	cmd.Stdout = os.Stdout
	cmd.Run()
}

func getSessionPreview(session tmux.Session) string {
	windows, err := tmux.GetWindows(session.ID)
	if err != nil {
		return fmt.Sprintf("Error loading session: %v", err)
	}

	if len(windows) == 0 {
		return "No windows in this session"
	}

	var preview strings.Builder
	preview.WriteString(fmt.Sprintf("📊 Session: %s (%s)\n", session.Name, session.ID))
	preview.WriteString(fmt.Sprintf("Windows: %d\n\n", len(windows)))

	for i, window := range windows {
		if i > 3 {
			preview.WriteString("...\n")
			break
		}
		preview.WriteString(fmt.Sprintf("• %s\n", window.Name))
	}

	if len(windows) > 0 {
		activeWindow := windows[0]
		panes, err := tmux.GetPanes(session.ID, activeWindow.ID)
		if err == nil && len(panes) > 0 {
			content, err := tmux.GetPaneContent(session.ID, activeWindow.ID, panes[0].ID)
			if err == nil {
				preview.WriteString(fmt.Sprintf("\nActive pane content:\n%s",
					truncatePreview(content, 8)))
			}
		}
	}

	return preview.String()
}

func truncatePreview(content string, maxLines int) string {
	lines := strings.Split(content, "\n")
	if len(lines) > maxLines {
		lines = lines[:maxLines]
		lines = append(lines, "...")
	}
	return strings.Join(lines, "\n")
}

func (m SessionPickerModel) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	switch msg := msg.(type) {
	case tea.WindowSizeMsg:
		m.width = msg.Width
		m.height = msg.Height
		m.list.SetWidth(msg.Width / 2)
		m.list.SetHeight(msg.Height - 4)
		return m, nil

	case tea.KeyMsg:
		switch keypress := msg.String(); keypress {
		case "ctrl+c", "q":
			m.quitting = true
			return m, tea.Quit

		case "enter":
			i, ok := m.list.SelectedItem().(sessionItem)
			if ok {
				m.selected = &i.session
				return m, tea.Quit
			}
		}
	}

	oldIndex := m.list.Index()
	var cmd tea.Cmd
	m.list, cmd = m.list.Update(msg)

	if m.list.Index() != oldIndex && m.list.Index() < len(m.sessions) {
		m.preview = getSessionPreview(m.sessions[m.list.Index()])
	}

	return m, cmd
}

func (m SessionPickerModel) View() string {
	if m.quitting {
		return "Goodbye!\n"
	}

	header := lipgloss.NewStyle().
		Bold(true).
		Foreground(lipgloss.Color("#7D56F4")).
		Render("🔧 Tmux Monitor Setup") + "\n" +
		strings.Repeat("=", 21) + "\n\n"

	listView := m.list.View()

	previewStyle := lipgloss.NewStyle().
		Border(lipgloss.RoundedBorder()).
		BorderForeground(lipgloss.Color("#7D56F4")).
		Padding(1).
		Width(m.width/2 - 4).
		Height(m.height - 8)

	previewView := previewStyle.Render(m.preview)

	mainContent := lipgloss.JoinHorizontal(
		lipgloss.Top,
		listView,
		"  ",
		previewView,
	)

	return header + mainContent
}

func (m SessionPickerModel) SelectedSession() *tmux.Session {
	return m.selected
}

func (m SessionPickerModel) IsQuitting() bool {
	return m.quitting
}
