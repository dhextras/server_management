package main

import (
	"bufio"
	"fmt"
	"log"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"

	"child-monitor/collector"
	"child-monitor/config"
	"child-monitor/logger"
	"child-monitor/network"
	"child-monitor/tmux"
	"child-monitor/ui"
)

const version = "v0.1.0"

var (
	successStyle = lipgloss.NewStyle().
			Bold(true).
			Foreground(lipgloss.Color("#04B575"))

	errorStyle = lipgloss.NewStyle().
			Bold(true).
			Foreground(lipgloss.Color("#FF0000"))

	infoStyle = lipgloss.NewStyle().
			Foreground(lipgloss.Color("#7D56F4"))

	warningStyle = lipgloss.NewStyle().
			Bold(true).
			Foreground(lipgloss.Color("#FFA500"))

	configStyle = lipgloss.NewStyle().
			Foreground(lipgloss.Color("#00BFFF")).
			Italic(true)
)

func main() {
	fmt.Println(successStyle.Render("Tmux Monitor Data Collector"))
	fmt.Println("====================================")

	if !tmux.IsTmuxRunning() {
		fmt.Println(errorStyle.Render(" Tmux is not running or not installed"))
		os.Exit(1)
	}

	fmt.Println(successStyle.Render(" Tmux detected"))

	var cfg *config.Config
	var err error

	if config.ConfigExists() {
		fmt.Println(infoStyle.Render(" Found existing configuration"))

		cfg, err = config.LoadConfig()
		if err != nil {
			fmt.Printf(errorStyle.Render(" Failed to load config: %v\n"), err)
			fmt.Println(infoStyle.Render(" Starting fresh setup..."))
			cfg = runSetupFlow()
		} else {
			configPath, _ := config.GetConfigPath()
			fmt.Printf(infoStyle.Render(" Config location: %s\n"), configPath)
			fmt.Println()

			showExistingConfig(cfg)

			if confirmUseExistingConfig() {
				fmt.Println(successStyle.Render(" Using existing configuration"))
			} else {
				fmt.Println(warningStyle.Render(" Starting fresh setup..."))
				if err := config.DeleteConfig(); err != nil {
					fmt.Printf(errorStyle.Render(" Failed to delete old config: %v\n"), err)
				} else {
					fmt.Println(infoStyle.Render(" Old configuration deleted"))
				}
				cfg = runSetupFlow()
			}
		}
	} else {
		fmt.Println(infoStyle.Render(" First time setup"))
		cfg = runSetupFlow()
	}

	fmt.Printf(successStyle.Render(" Server: %s\n"), cfg.ServerName)
	fmt.Printf(successStyle.Render(" Central: %s:%s\n"), cfg.CentralServerIP, cfg.CentralPort)

	sender := network.NewDataSender(cfg.CentralServerIP, cfg.CentralPort)
	fmt.Print(infoStyle.Render(" Testing connection... "))

	if err := sender.TestConnection(); err != nil {
		fmt.Println(errorStyle.Render(" Failed"))
		fmt.Printf(errorStyle.Render("Error: %v\n"), err)
		os.Exit(1)
	}
	fmt.Println(successStyle.Render(" Connected"))

	sessions, err := tmux.GetSessions()
	if err != nil {
		log.Fatalf("Failed to get tmux sessions: %v", err)
	}

	if len(sessions) == 0 {
		fmt.Println(errorStyle.Render(" No tmux sessions found"))
		os.Exit(1)
	}

	fmt.Printf(infoStyle.Render(" Found %d tmux sessions\n"), len(sessions))

	selectedSession, selectedWindows, selectedPanes := runSelectionFlow(sessions)

	cfg.SessionID = selectedSession.ID
	cfg.SessionName = selectedSession.Name

	for _, window := range selectedWindows {
		cfg.WindowIDs = append(cfg.WindowIDs, window.ID)
	}

	for _, pane := range selectedPanes {
		cfg.PaneIDs = append(cfg.PaneIDs, pane.ID)
	}

	if err := config.SaveConfig(*cfg); err != nil {
		fmt.Printf(errorStyle.Render(" Failed to save config: %v\n"), err)
	}

	fmt.Printf(successStyle.Render(" Configuration saved!\n"))
	fmt.Printf("Selected session: %s\n", selectedSession.Name)
	fmt.Printf("Selected windows: %d\n", len(selectedWindows))
	fmt.Printf("Selected panes: %d\n", len(selectedPanes))
	fmt.Println()

	fmt.Println(infoStyle.Render(" Starting data collection and TCP sending..."))
	fmt.Println("Press Ctrl+C to stop")
	fmt.Println()

	c := make(chan os.Signal, 1)
	signal.Notify(c, os.Interrupt, syscall.SIGTERM)

	go func() {
		<-c
		fmt.Println(infoStyle.Render("\nShutting down..."))
		sender.Close()
		os.Exit(0)
	}()

	runDataCollection(cfg, selectedSession, selectedPanes, sender)
}

func showExistingConfig(cfg *config.Config) {
	fmt.Println(warningStyle.Render("Current Configuration:"))
	fmt.Println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")

	fmt.Printf(" Server Name: %s\n", configStyle.Render(cfg.ServerName))
	fmt.Printf(" Central Server: %s\n", configStyle.Render(fmt.Sprintf("%s:%s", cfg.CentralServerIP, cfg.CentralPort)))
	fmt.Printf(" Session: %s\n", configStyle.Render(fmt.Sprintf("%s (ID: %s)", cfg.SessionName, cfg.SessionID)))
	fmt.Printf(" Windows: %s\n", configStyle.Render(fmt.Sprintf("%d windows", len(cfg.WindowIDs))))
	fmt.Printf(" Panes: %s\n", configStyle.Render(fmt.Sprintf("%d panes", len(cfg.PaneIDs))))

	if len(cfg.WindowIDs) > 0 {
		fmt.Printf("   Window IDs: %s\n", configStyle.Render(strings.Join(cfg.WindowIDs, ", ")))
	}
	if len(cfg.PaneIDs) > 0 {
		fmt.Printf("   Pane IDs: %s\n", configStyle.Render(strings.Join(cfg.PaneIDs, ", ")))
	}

	fmt.Println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
	fmt.Println()
}

func confirmUseExistingConfig() bool {
	reader := bufio.NewReader(os.Stdin)

	for {
		fmt.Print(warningStyle.Render(" Use this existing configuration? [Y/n/q]: "))

		input, err := reader.ReadString('\n')
		if err != nil {
			fmt.Printf(errorStyle.Render("Error reading input: %v\n"), err)
			continue
		}

		input = strings.TrimSpace(strings.ToLower(input))

		switch input {
		case "", "y", "yes":
			return true
		case "n", "no":
			return false
		case "q", "quit":
			fmt.Println(infoStyle.Render(" Goodbye!"))
			os.Exit(0)
		default:
			fmt.Println(errorStyle.Render(" Please enter 'y' (yes), 'n' (no), or 'q' (quit)"))
		}
	}
}

func runSetupFlow() *config.Config {
	setupModel := ui.NewSetupModel()
	p := tea.NewProgram(setupModel, tea.WithAltScreen())

	m, err := p.Run()
	if err != nil {
		log.Fatalf("Error running setup: %v", err)
	}

	model := m.(ui.SetupModel)
	if model.IsQuitting() {
		fmt.Println("Setup cancelled")
		os.Exit(0)
	}

	serverName, centralIP, centralPort, done := model.GetConfig()
	if !done {
		fmt.Println("Setup incomplete")
		os.Exit(0)
	}

	return &config.Config{
		ServerName:      serverName,
		CentralServerIP: centralIP,
		CentralPort:     centralPort,
	}
}

func runSelectionFlow(sessions []tmux.Session) (*tmux.Session, []tmux.Window, []tmux.Pane) {
	sessionPicker := ui.NewSessionPicker(sessions)
	p := tea.NewProgram(sessionPicker, tea.WithAltScreen())

	m, err := p.Run()
	if err != nil {
		log.Fatalf("Error running session picker: %v", err)
	}

	sessionModel := m.(ui.SessionPickerModel)
	if sessionModel.IsQuitting() {
		fmt.Println("Selection cancelled")
		os.Exit(0)
	}

	selectedSession := sessionModel.SelectedSession()
	if selectedSession == nil {
		fmt.Println("No session selected")
		os.Exit(0)
	}

	windows, err := tmux.GetWindows(selectedSession.ID)
	if err != nil {
		log.Fatalf("Failed to get windows: %v", err)
	}

	windowPicker := ui.NewWindowPicker(selectedSession.Name, windows)
	p = tea.NewProgram(windowPicker, tea.WithAltScreen())

	m, err = p.Run()
	if err != nil {
		log.Fatalf("Error running window picker: %v", err)
	}

	windowModel := m.(ui.WindowPickerModel)
	if windowModel.IsQuitting() {
		fmt.Println("Selection cancelled")
		os.Exit(0)
	}
	if !windowModel.IsDone() {
		fmt.Println("No windows selected")
		os.Exit(0)
	}

	selectedWindows := windowModel.SelectedWindows()
	var allSelectedPanes []tmux.Pane

	for _, window := range selectedWindows {
		panes, err := tmux.GetPanes(selectedSession.ID, window.ID)
		if err != nil {
			log.Printf("Failed to get panes for window %s: %v", window.Name, err)
			continue
		}

		if len(panes) == 1 {
			allSelectedPanes = append(allSelectedPanes, panes...)
			continue
		}

		panePicker := ui.NewPanePicker(window.Name, panes)
		p = tea.NewProgram(panePicker, tea.WithAltScreen())

		m, err = p.Run()
		if err != nil {
			log.Fatalf("Error running pane picker: %v", err)
		}

		paneModel := m.(ui.PanePickerModel)
		if paneModel.IsQuitting() {
			fmt.Println("Selection cancelled")
			os.Exit(0)
		}
		if paneModel.IsDone() {
			selectedPanes := paneModel.SelectedPanes()
			allSelectedPanes = append(allSelectedPanes, selectedPanes...)
		}
	}

	return selectedSession, selectedWindows, allSelectedPanes
}

func runDataCollection(cfg *config.Config, session *tmux.Session, panes []tmux.Pane, sender *network.DataSender) {
	fileLogger := logger.NewLogger(cfg.ServerName)
	defer fileLogger.Close()

	fileLogger.LogInfo(fmt.Sprintf("Started monitoring session: %s with %d panes", session.Name, len(panes)))
	fmt.Printf(infoStyle.Render(" Logging to: logs/%s_%s.log\n"), cfg.ServerName, time.Now().Format("2006-01-02"))

	fmt.Print(infoStyle.Render(" Establishing TCP connection... "))
	if err := sender.Connect(); err != nil {
		fmt.Printf(errorStyle.Render(" FAILED\n"))
		fmt.Printf(errorStyle.Render("TCP Error: %v\n"), err)
		os.Exit(1)
	}
	fmt.Println(successStyle.Render(" TCP CONNECTION ESTABLISHED"))

	ticker := time.NewTicker(2 * time.Second)
	defer ticker.Stop()

	sendCount := 0

	for {
		select {
		case <-ticker.C:
			sendCount++
			timestamp := time.Now()

			stats, err := collector.CollectSystemStats()
			if err != nil {
				fmt.Printf(errorStyle.Render(" Failed to collect system stats: %v\n"), err)
				fileLogger.LogInfo(fmt.Sprintf("Failed to collect system stats: %v", err))
				continue
			}

			var tmuxPanes []network.TmuxPane
			for _, pane := range panes {
				content, err := tmux.GetPaneContent(session.ID, pane.WindowID, pane.ID)
				if err != nil {
					fmt.Printf(errorStyle.Render(" Failed to get pane %s content: %v\n"), pane.ID, err)
					continue
				}

				tmuxPanes = append(tmuxPanes, network.TmuxPane{
					ID:        pane.ID,
					WindowID:  pane.WindowID,
					SessionID: pane.SessionID,
					Content:   content,
					Active:    pane.Active,
				})
			}

			sendData := network.SendData{
				ServerName:  cfg.ServerName,
				SystemStats: stats,
				TmuxPanes:   tmuxPanes,
				SessionName: session.Name,
			}

			fmt.Printf(infoStyle.Render(" Sending TCP packet #%d to %s:%s... "),
				sendCount, cfg.CentralServerIP, cfg.CentralPort)

			if err := sender.SendData(sendData); err != nil {
				fmt.Printf(errorStyle.Render(" FAILED\n"))
				fmt.Printf(errorStyle.Render("   TCP Error: %v\n"), err)
				fileLogger.LogSendFailure(fmt.Sprintf("%s:%s", cfg.CentralServerIP, cfg.CentralPort), err)

				fmt.Print(infoStyle.Render(" Attempting TCP reconnection... "))
				if err := sender.Connect(); err != nil {
					fmt.Printf(errorStyle.Render(" Reconnection failed: %v\n"), err)
				} else {
					fmt.Println(successStyle.Render(" TCP Reconnected"))
				}
			} else {
				fmt.Printf(successStyle.Render(" SUCCESS [%s]\n"), timestamp.Format("15:04:05"))
				fileLogger.LogSendSuccess(fmt.Sprintf("%s:%s", cfg.CentralServerIP, cfg.CentralPort))
			}
		}
	}
}
