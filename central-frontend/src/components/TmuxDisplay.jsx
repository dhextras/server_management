import { useEffect, useRef, useState } from "react";
import { AnsiText } from "./AnsiText";

export const TmuxDisplay = ({ dataHistory, sessionName }) => {
  let currentWindowPanes = [];

  const paneRefs = useRef({});
  const [selectedWindowIndex, setSelectedWindowIndex] = useState(0);

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
      <div className="flex h-full max-h-[80vh] w-full max-w-[70vw] items-center justify-center rounded-lg border border-dashed border-gray-600 text-base text-gray-500">
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
  currentWindowPanes = windowGroups[currentWindowId] || [];

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
        className="relative min-h-0 min-w-0 flex-1 overflow-hidden rounded-md border border-gray-600 bg-black p-2 text-sm leading-relaxed"
      >
        <div
          ref={(el) => {
            if (el) {
              paneRefs.current[paneKey] = el;
            }
          }}
          className="scrollbar-thin scrollbar-track-gray-800 scrollbar-thumb-gray-600 h-full overflow-auto whitespace-pre-wrap break-words text-gray-300"
        >
          <AnsiText>{pane.content.replace(/\n+$/, "")}</AnsiText>
        </div>

        <div className="pointer-events-none absolute left-1.5 top-1.5 rounded bg-purple-500/80 px-1.5 py-0.5 text-sm font-bold text-white">
          {pane.id}
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-full max-h-[80vh] min-h-[300px] w-full flex-col">
      <div className="mb-2 flex items-center justify-between rounded-md border border-gray-600 bg-zinc-900 px-3 py-2 text-sm">
        <div className="flex items-center gap-1.5 font-semibold text-purple-400">
          <span>📱</span>
          <span>{sessionName || "session"}</span>
          <span className="text-xs text-gray-500">
            ({dataHistory ? dataHistory.length : 0} history entries)
          </span>
        </div>

        {windowIds.length > 1 && (
          <div className="flex flex-wrap items-center gap-1 rounded bg-purple-500/10 px-2 py-1">
            {windowIds.map((windowId, index) => (
              <button
                key={windowId}
                className={`min-w-[28px] cursor-pointer rounded border-none px-2 py-1 text-xs font-normal transition-all duration-200 ${
                  index === selectedWindowIndex
                    ? "bg-purple-500/60 font-bold text-purple-400"
                    : "bg-purple-500/30 text-purple-400 hover:bg-purple-500/50"
                }`}
                onClick={() => switchToWindow(index)}
                title={`Switch to window ${index + 1} (${windowId})`}
              >
                {index + 1}
              </button>
            ))}
          </div>
        )}
      </div>

      <div
        className={`scrollbar-thin scrollbar-track-gray-800 scrollbar-thumb-gray-600 flex min-h-0 flex-1 gap-2 overflow-hidden p-1 ${
          currentWindowPanes.length > 1 ? "flex-row" : "flex-col"
        }`}
      >
        {currentWindowPanes.map((pane, index) => renderPane(pane, index))}
      </div>

      <div className="mt-1 rounded border border-gray-600 bg-zinc-900 px-3 py-1.5 text-center text-xs text-gray-500">
        Window {currentWindowId}: {currentWindowPanes.length} pane
        {currentWindowPanes.length !== 1 ? "s" : ""} • Accumulated from{" "}
        {dataHistory ? dataHistory.length : 0} history entries
      </div>

      <style>{`
        .scrollbar-thin::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        .scrollbar-track-gray-800::-webkit-scrollbar-track {
          background: #1f2937;
          border-radius: 3px;
        }
        .scrollbar-thumb-gray-600::-webkit-scrollbar-thumb {
          background: #4b5563;
          border-radius: 3px;
        }
        .scrollbar-thumb-gray-600::-webkit-scrollbar-thumb:hover {
          background: #6b7280;
        }
      `}</style>
    </div>
  );
};
