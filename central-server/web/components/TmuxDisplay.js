window.TmuxDisplay = ({ dataHistory, sessionName }) => {
  const [selectedWindowIndex, setSelectedWindowIndex] = useState(0);
  const paneRefs = useRef({});

  const processDataHistory = (dataHistory) => {
    if (!dataHistory || dataHistory.length === 0) return [];

    const accumulatedPanes = {};

    dataHistory.forEach((historyEntry) => {
      const tmuxPanes = historyEntry.tmux_panes || [];

      tmuxPanes.forEach((pane) => {
        const paneKey = `${pane.window_id}-${pane.id}`;

        if (!accumulatedPanes[paneKey]) {
          accumulatedPanes[paneKey] = {
            ...pane,
            content: pane.content || "",
            contentHistory: [pane.content || ""],
          };
        } else {
          if (
            pane.content &&
            pane.content !==
              accumulatedPanes[paneKey].contentHistory[
                accumulatedPanes[paneKey].contentHistory.length - 1
              ]
          ) {
            accumulatedPanes[paneKey].contentHistory.push(pane.content);
            accumulatedPanes[paneKey].content =
              accumulatedPanes[paneKey].contentHistory.join("\n");
          }
        }
      });
    });

    return Object.values(accumulatedPanes);
  };

  const tmuxPanes = processDataHistory(dataHistory);
  const [prevDataHistoryHash, setPrevDataHistoryHash] = useState("");

  const hashDataHistory = (dataHistory) => {
    if (!dataHistory || dataHistory.length === 0) return "";

    const str = JSON.stringify(dataHistory);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString();
  };

  useEffect(() => {
    const currentHash = hashDataHistory(dataHistory);

    if (
      currentHash &&
      currentHash !== prevDataHistoryHash &&
      prevDataHistoryHash !== ""
    ) {
      Object.values(paneRefs.current).forEach((ref) => {
        if (ref) {
          ref.scrollTop = ref.scrollHeight;
        }
      });
    }

    setPrevDataHistoryHash(currentHash);
  }, [dataHistory, prevDataHistoryHash]);

  useEffect(() => {
    setTimeout(() => {
      currentWindowPanes.forEach((pane) => {
        const paneKey = `${pane.window_id}-${pane.id}`;
        const ref = paneRefs.current[paneKey];
        if (ref) {
          ref.scrollTop = ref.scrollHeight;
        }
      });
    }, 100);
  }, [selectedWindowIndex, currentWindowPanes]);

  if (!tmuxPanes || tmuxPanes.length === 0) {
    return (
      <div
        style={{
          width: "100%",
          maxWidth: "70vw",
          height: "100%",
          maxHeight: "80vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#666",
          fontSize: "1rem",
          border: "1px dashed #333",
          borderRadius: "8px",
        }}
      >
        No tmux content
      </div>
    );
  }

  const windowGroups = tmuxPanes.reduce((groups, pane, index) => {
    const windowId = pane.window_id;
    if (!groups[windowId]) {
      groups[windowId] = [];
    }
    groups[windowId].push({ ...pane, originalIndex: index });
    return groups;
  }, {});

  const windowIds = Object.keys(windowGroups);
  const currentWindowId = windowIds[selectedWindowIndex] || windowIds[0];
  const currentWindowPanes = windowGroups[currentWindowId] || [];

  useEffect(() => {
    const handleWindowSwitch = (event) => {
      const { windowIndex } = event.detail;
      if (windowIndex >= 0 && windowIndex < windowIds.length) {
        setSelectedWindowIndex(windowIndex);
      }
    };

    window.addEventListener("tmux-switch-window", handleWindowSwitch);
    return () =>
      window.removeEventListener("tmux-switch-window", handleWindowSwitch);
  }, [windowIds.length]);

  const switchToWindow = (index) => {
    setSelectedWindowIndex(index);
  };

  const renderPane = (pane, _) => {
    const paneKey = `${pane.window_id}-${pane.id}`;

    return (
      <div
        key={pane.id}
        style={{
          flex: 1,
          background: "#0a0a0a",
          border: "1px solid #333",
          borderRadius: "6px",
          padding: "12px",
          overflow: "hidden",
          position: "relative",
          fontSize: "0.85rem",
          lineHeight: 1.4,
          minHeight: "200px",
          minWidth: "0",
        }}
      >
        <div
          ref={(el) => {
            if (el) {
              paneRefs.current[paneKey] = el;
            }
          }}
          style={{
            height: "100%",
            overflowY: "auto",
            overflowX: "auto",
            whiteSpace: "pre-wrap",
            wordWrap: "break-word",
            color: "#ddd",
            scrollbarWidth: "thin",
            scrollbarColor: "#555 #222",
          }}
        >
          <AnsiText>{pane.content.replace(/\n+$/, "")}</AnsiText>
        </div>

        <div
          style={{
            position: "absolute",
            top: "6px",
            right: "6px",
            background: "rgba(125, 86, 244, 0.8)",
            color: "#fff",
            padding: "2px 6px",
            borderRadius: "3px",
            fontSize: "0.9rem",
            fontWeight: "bold",
            pointerEvents: "none",
          }}
        >
          {pane.id}
        </div>
      </div>
    );
  };

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        maxHeight: "80vh",
        display: "flex",
        flexDirection: "column",
        minHeight: "300px",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "8px",
          padding: "8px 12px",
          background: "#0f0f0f",
          borderRadius: "6px",
          fontSize: "0.9rem",
          border: "1px solid #333",
        }}
      >
        <div
          style={{
            color: "#7d56f4",
            fontWeight: "600",
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          <span>📱</span>
          <span>{sessionName || "session"}</span>
          <span style={{ color: "#666", fontSize: "0.8rem" }}>
            ({dataHistory ? dataHistory.length : 0} history entries)
          </span>
        </div>

        {windowIds.length > 1 && (
          <div
            style={{
              display: "flex",
              gap: "4px",
              alignItems: "center",
              background: "rgba(125, 86, 244, 0.1)",
              padding: "4px 8px",
              borderRadius: "4px",
              flexWrap: "wrap",
            }}
          >
            {windowIds.map((windowId, index) => (
              <button
                key={windowId}
                style={{
                  background:
                    index === selectedWindowIndex
                      ? "rgba(125, 86, 244, 0.6)"
                      : "rgba(125, 86, 244, 0.3)",
                  border: "none",
                  color: "#7d56f4",
                  padding: "4px 8px",
                  borderRadius: "3px",
                  fontSize: "0.8rem",
                  cursor: "pointer",
                  fontWeight: index === selectedWindowIndex ? "bold" : "normal",
                  minWidth: "28px",
                  transition: "all 0.2s",
                }}
                onClick={() => switchToWindow(index)}
                onMouseEnter={(e) => {
                  if (index !== selectedWindowIndex) {
                    e.target.style.background = "rgba(125, 86, 244, 0.5)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (index !== selectedWindowIndex) {
                    e.target.style.background = "rgba(125, 86, 244, 0.3)";
                  }
                }}
                title={`Switch to window ${index + 1} (${windowId})`}
              >
                {index + 1}
              </button>
            ))}
          </div>
        )}
      </div>

      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: currentWindowPanes.length > 1 ? "row" : "column",
          gap: "8px",
          minHeight: 0,
          overflowY: "auto",
          overflowX: "auto",
          padding: "4px",
          scrollbarWidth: "thin",
          scrollbarColor: "#555 #222",
        }}
      >
        {currentWindowPanes.map((pane, index) => renderPane(pane, index))}
      </div>

      <div
        style={{
          fontSize: "0.75rem",
          color: "#666",
          padding: "6px 12px",
          textAlign: "center",
          background: "#0f0f0f",
          borderRadius: "4px",
          marginTop: "4px",
          border: "1px solid #333",
        }}
      >
        Window {currentWindowId}: {currentWindowPanes.length} pane
        {currentWindowPanes.length !== 1 ? "s" : ""} • Accumulated from{" "}
        {dataHistory ? dataHistory.length : 0} history entries
      </div>

      <style>{`
        div::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        div::-webkit-scrollbar-track {
          background: #222;
          border-radius: 3px;
        }
        div::-webkit-scrollbar-thumb {
          background: #555;
          border-radius: 3px;
        }
        div::-webkit-scrollbar-thumb:hover {
          background: #777;
        }
      `}</style>
    </div>
  );
};
