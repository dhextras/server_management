package tmux

type Session struct {
	ID   string
	Name string
}

type Window struct {
	ID        string
	Name      string
	SessionID string
}

type Pane struct {
	ID        string
	WindowID  string
	SessionID string
	Active    bool
	Content   string
}

type TmuxData struct {
	Sessions []Session
	Windows  []Window
	Panes    []Pane
}

type Selection struct {
	SessionID string
	WindowIDs []string
	PaneIDs   []string
}
