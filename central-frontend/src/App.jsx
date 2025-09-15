import { useCallback, useEffect, useRef, useState } from "react";
import { SearchBar } from "./components/SearchBar";
import { ServerCard } from "./components/ServerCard";
import { ServerGrid } from "./components/ServerGrid";

const HelpPopup = ({ onClose }) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" || e.key === "?") {
        e.preventDefault();
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/95 p-4">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-lg border border-purple-500/30 bg-zinc-900 p-6">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-purple-400">
            Keyboard Shortcuts & Search Help
          </h2>
          <button
            onClick={onClose}
            className="rounded border border-red-400/40 bg-red-500/20 px-3 py-1 text-red-400 hover:bg-red-500/30"
          >
            Close (Esc)
          </button>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-emerald-400">
              Navigation
            </h3>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-purple-300">hjkl / Arrow Keys</span> -
                Navigate servers
              </div>
              <div>
                <span className="text-purple-300">Enter / z</span> - Zoom into
                selected server (exit zoom as well)
              </div>
              <div>
                <span className="text-purple-300">Esc</span> - Exit zoom mode
              </div>
              <div>
                <span className="text-purple-300">1-9</span> - Switch pages (or
                tmux windows when zoomed)
              </div>
              <div>
                <span className="text-purple-300">?</span> - Show this help
                (works everywhere)
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-emerald-400">Search</h3>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-purple-300">/</span> - Open search
              </div>
              <div>
                <span className="text-purple-300">Enter</span> - Hide search bar
              </div>
              <div>
                <span className="text-purple-300">Esc</span> - Close search and
                clear
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-emerald-400">
              Favorites
            </h3>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-yellow-400">★</span> - Mark servers as
                favorites to see them at the top at all time
              </div>
              <div className="ml-4 text-xs text-gray-500">
                (Custom ordering of favorites coming soon...)
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-emerald-400">
              Server Status Colors
            </h3>
            <div className="space-y-2 text-sm">
              <div>
                <span className="mr-2 inline-block h-3 w-3 rounded bg-purple-500"></span>
                <span className="text-purple-300">Purple</span> - Selected
                server
              </div>
              <div>
                <span className="mr-2 inline-block h-3 w-3 rounded bg-red-500"></span>
                <span className="text-red-300">Red</span> - Dead server
              </div>
              <div>
                <span className="mr-2 inline-block h-3 w-3 rounded bg-yellow-500"></span>
                <span className="text-yellow-300">Yellow</span> - Stale server
              </div>
              <div>
                <span className="mr-2 inline-block h-3 w-3 rounded bg-orange-500"></span>
                <span className="text-orange-300">Orange</span> - System issues
              </div>
              <div className="ml-5 text-xs text-gray-500">
                (CPU &gt; 80%, Memory &gt; 60%, or Disk &gt; 95%)
              </div>
              <div>
                <span className="mr-2 inline-block h-3 w-3 rounded bg-gray-600"></span>
                <span className="text-gray-300">Gray</span> - Default/healthy
                server
              </div>
            </div>
          </div>

          <div className="space-y-3 md:col-span-2">
            <h3 className="text-lg font-semibold text-emerald-400">
              Advanced Search Modes
            </h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 text-sm">
                <div className="space-y-1">
                  <div>
                    <span className="text-blue-400">n:</span>
                    <span className="text-gray-300"> search_term</span> - Search
                    server names only
                  </div>
                  <div className="ml-4 text-xs text-gray-500">
                    Example: <span className="text-blue-300">n: web</span> finds
                    servers with "web" in name
                  </div>
                </div>
                <div className="space-y-1">
                  <div>
                    <span className="text-green-400">s:</span>
                    <span className="text-gray-300"> search_term</span> - Search
                    server status/state only
                  </div>
                  <div className="ml-4 text-xs text-gray-500">
                    Example: <span className="text-green-300">s: active</span>{" "}
                    finds servers with "active" status
                  </div>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <div className="space-y-1">
                  <div>
                    <span className="text-yellow-400">c:</span>
                    <span className="text-gray-300"> search_term</span> - Search
                    content/tmux panes only
                  </div>
                  <div className="ml-4 text-xs text-gray-500">
                    Example: <span className="text-yellow-300">c: error</span>{" "}
                    finds servers with "error" in content
                  </div>
                </div>
                <div className="space-y-1">
                  <div>
                    <span className="text-purple-400">h:</span>
                    <span className="text-gray-300"> search_term</span> or{" "}
                    <span className="text-gray-300">search_term</span> - Search
                    everywhere
                  </div>
                  <div className="ml-4 text-xs text-gray-500">
                    Example: <span className="text-purple-300">database</span>{" "}
                    or <span className="text-purple-300">h: database</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3 md:col-span-2">
            <h3 className="text-lg font-semibold text-emerald-400">Tips</h3>
            <div className="space-y-1 text-sm text-gray-300">
              <div>• Search is case-insensitive</div>
              <div>
                • Use specific modes (n:, s:, c:) for faster, more targeted
                searches
              </div>
              <div>
                • Default search (no prefix) searches names, status, and content
              </div>
              <div>
                • Press Enter in search to hide the search bar while keeping
                results
              </div>
              <div>• Press Esc to completely exit search mode</div>
              <div>
                • Server border colors indicate status (selected servers always
                show purple regardless of status)
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const App = () => {
  const [servers, setServers] = useState({});
  const [connected, setConnected] = useState(false);
  const [selectedServerIndex, setSelectedServerIndex] = useState(0);
  const [zoomedServer, setZoomedServer] = useState(null);
  const [currentKeys, setCurrentKeys] = useState("");
  const [showHelp, setShowHelp] = useState(false);

  const [isSearching, setIsSearching] = useState(false);
  const [isSearchHidden, setIsSearchHidden] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [currentPage, setCurrentPage] = useState(0);
  const [lastFullSync, setLastFullSync] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const isFirstTimeRef = useRef(Object.keys(servers).length === 0);

  const [syncState, setSyncState] = useState({
    isRunning: false,
    expectedCount: 0,
    receivedCount: 0,
    tempServers: {},
    startTime: null,
    hasError: false,
    errorMessage: "",
  });

  const getSearchMode = (query) => {
    const trimmed = query.toLowerCase().trim();
    if (trimmed.startsWith("n:"))
      return { mode: "name", query: trimmed.substring(2).trim() };
    if (trimmed.startsWith("s:"))
      return { mode: "status", query: trimmed.substring(2).trim() };
    if (trimmed.startsWith("c:"))
      return { mode: "content", query: trimmed.substring(2).trim() };
    if (trimmed.startsWith("h:"))
      return { mode: "all", query: trimmed.substring(2).trim() };
    return { mode: "all", query: trimmed };
  };

  const decompressMessage = async (data) => {
    if (typeof data === "string") {
      return data;
    }

    if (data instanceof ArrayBuffer || data instanceof Uint8Array) {
      const uint8Array =
        data instanceof ArrayBuffer ? new Uint8Array(data) : data;

      if (window.DecompressionStream) {
        const stream = new DecompressionStream("gzip");
        const writer = stream.writable.getWriter();
        const reader = stream.readable.getReader();

        writer.write(uint8Array);
        writer.close();

        const chunks = [];
        let done = false;

        while (!done) {
          const { value, done: readerDone } = await reader.read();
          done = readerDone;
          if (value) chunks.push(value);
        }

        const decompressed = new Uint8Array(
          chunks.reduce((acc, chunk) => acc + chunk.length, 0),
        );
        let offset = 0;
        for (const chunk of chunks) {
          decompressed.set(chunk, offset);
          offset += chunk.length;
        }

        return new TextDecoder().decode(decompressed);
      } else {
        if (typeof pako !== "undefined") {
          const decompressed = pako.ungzip(uint8Array, { to: "string" });
          return decompressed;
        } else {
          throw new Error("No decompression method available");
        }
      }
    }

    return data;
  };

  const formatTimeSince = (date) => {
    const diffMs = currentTime - date;
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);

    if (diffSecs < 60) return `${diffSecs}s ago`;
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleTimeString();
  };

  const getWebSocketUrl = () => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const hostname = window.location.hostname;
    const port = window.location.port;

    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return `ws://localhost:8081/ws`;
    }

    if (port && port !== "80" && port !== "443") {
      return `${protocol}//${hostname}:${port}/ws`;
    } else {
      return `${protocol}//${hostname}/ws`;
    }
  };

  useEffect(() => {
    const interval = setInterval(
      () => {
        setCurrentTime(new Date());
      },
      Math.floor(Math.random() * 4001) + 3000,
    );

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let syncTimeout;

    const clearSyncTimeout = () => {
      if (syncTimeout) {
        clearTimeout(syncTimeout);
        syncTimeout = null;
      }
    };

    const handleSyncTimeout = () => {
      setSyncState((prev) => ({
        ...prev,
        hasError: true,
        errorMessage: `Sync timeout: received ${prev.receivedCount}/${prev.expectedCount} servers`,
      }));
    };

    const wsUrl = getWebSocketUrl();
    console.log("Connecting to WebSocket:", wsUrl);

    const websocket = new WebSocket(wsUrl);
    websocket.binaryType = "arraybuffer";

    websocket.onopen = () => setConnected(true);

    websocket.onmessage = async (event) => {
      let message;
      try {
        const decompressedData = await decompressMessage(event.data);
        message = JSON.parse(decompressedData);
      } catch (error) {
        console.error(
          "Failed to decompress or parse WebSocket message:",
          error,
        );
        console.error("Raw message:", event.data);
        return;
      }

      if (message.type === "full_sync_start") {
        clearSyncTimeout();
        setSyncState({
          isRunning: true,
          expectedCount: message.payload.total_servers,
          receivedCount: 0,
          tempServers: {},
          startTime: new Date(),
          hasError: false,
          errorMessage: "",
        });

        syncTimeout = setTimeout(handleSyncTimeout, 30000);
        console.log(
          "Full sync started:",
          message.payload.total_servers,
          "servers expected",
        );
      } else if (message.type === "server_update") {
        const { server_id, server_data } = message.payload;
        setSyncState((prev) => {
          const newTempServers = {
            ...prev.tempServers,
            [server_id]: server_data,
          };
          const newReceivedCount = prev.receivedCount + 1;

          if (isFirstTimeRef.current) {
            setServers(newTempServers);
          }
          return {
            ...prev,
            tempServers: newTempServers,
            receivedCount: newReceivedCount,
          };
        });
      } else if (message.type === "full_sync_complete") {
        isFirstTimeRef.current = false;
        clearSyncTimeout();
        setSyncState((prev) => {
          if (prev.receivedCount === prev.expectedCount) {
            setServers(prev.tempServers);
            setLastFullSync(new Date());
            console.log("Full sync completed successfully");
            return {
              isRunning: false,
              expectedCount: 0,
              receivedCount: 0,
              tempServers: {},
              startTime: null,
              hasError: false,
              errorMessage: "",
            };
          } else {
            return {
              ...prev,
              hasError: true,
              errorMessage: `Sync incomplete: received ${prev.receivedCount}/${prev.expectedCount} servers`,
            };
          }
        });
      } else if (message.type === "delta_update") {
        const { changed_servers, removed_servers } = message.payload;

        setServers((prev) => {
          const updated = { ...prev };

          if (changed_servers) {
            Object.entries(changed_servers).forEach(
              ([serverId, serverData]) => {
                updated[serverId] = serverData;
              },
            );
          }

          if (removed_servers) {
            removed_servers.forEach((serverId) => {
              delete updated[serverId];
            });
          }

          return updated;
        });

        console.log(
          "Delta update:",
          changed_servers ? Object.keys(changed_servers).length : 0,
          "changed,",
          removed_servers ? removed_servers.length : 0,
          "removed",
        );
      }
    };

    websocket.onclose = () => {
      clearSyncTimeout();
      setConnected(false);
      setSyncState({
        isRunning: false,
        expectedCount: 0,
        receivedCount: 0,
        tempServers: {},
        startTime: null,
        hasError: false,
        errorMessage: "",
      });
      setTimeout(() => window.location.reload(), 2000);
    };

    return () => {
      clearSyncTimeout();
      websocket.close();
    };
  }, []);

  const filterServers = (servers, query) => {
    if (!query.trim()) return servers;

    const { mode, query: searchTerm } = getSearchMode(query);

    if (!searchTerm) return servers;

    const filteredServers = {};

    Object.keys(servers).forEach((serverName) => {
      const server = servers[serverName];

      switch (mode) {
        case "name":
          if (serverName.toLowerCase().includes(searchTerm)) {
            filteredServers[serverName] = server;
          }
          break;

        case "status":
          if (server.state?.toLowerCase().includes(searchTerm)) {
            filteredServers[serverName] = server;
          }
          break;

        case "content":
          if (server.data_history?.[0]?.tmux_panes) {
            const content = server.data_history[0].tmux_panes
              .map((pane) => pane.content || "")
              .join(" ")
              .toLowerCase();

            if (content.includes(searchTerm)) {
              filteredServers[serverName] = server;
            }
          }
          break;

        case "all":
        default:
          if (serverName.toLowerCase().includes(searchTerm)) {
            filteredServers[serverName] = server;
            return;
          }

          if (server.state?.toLowerCase().includes(searchTerm)) {
            filteredServers[serverName] = server;
            return;
          }

          if (server.data_history?.[0]?.tmux_panes) {
            const content = server.data_history[0].tmux_panes
              .map((pane) => pane.content || "")
              .join(" ")
              .toLowerCase();

            if (content.includes(searchTerm)) {
              filteredServers[serverName] = server;
              return;
            }
          }
          break;
      }
    });

    return filteredServers;
  };

  const filteredServers = isSearching
    ? filterServers(servers, searchQuery)
    : servers;
  const serverNames = Object.keys(filteredServers);

  const getOptimalGridLayout = () => {
    if (typeof window === "undefined") return { cols: 3, rows: 2 };

    const width = window.innerWidth;
    const height = window.innerHeight;

    const availableWidth = width - 40;
    const availableHeight = height - 200;

    const minCardWidth = 320;
    const minCardHeight = 280;

    const maxCols = Math.floor(availableWidth / minCardWidth);
    const maxRows = Math.floor(availableHeight / minCardHeight);

    let cols, rows;

    if (width >= 2000) {
      cols = Math.min(4, maxCols);
      rows = Math.min(3, maxRows);
    } else if (width >= 1400) {
      cols = Math.min(3, maxCols);
      rows = Math.min(2, maxRows);
    } else if (width >= 768) {
      cols = Math.min(2, maxCols);
      rows = Math.min(2, maxRows);
    } else {
      cols = 1;
      rows = Math.min(3, maxRows);
    }

    return { cols: Math.max(1, cols), rows: Math.max(1, rows) };
  };

  const layout = getOptimalGridLayout();
  const serversPerPage = layout.cols * layout.rows;
  const totalPages = Math.ceil(serverNames.length / serversPerPage);

  const handleKeyPress = useCallback(
    (event) => {
      // Handle help key globally
      if (event.key === "?") {
        event.preventDefault();
        setShowHelp(true);
        return;
      }

      if (
        (isSearching && !isSearchHidden) ||
        event.target.tagName === "INPUT" ||
        event.target.tagName === "TEXTAREA"
      ) {
        return;
      }

      const key = event.key;

      setCurrentKeys((prev) => prev + key);
      setTimeout(() => setCurrentKeys(""), 300);

      if (["1", "2", "3", "4", "5", "6", "7", "8", "9"].includes(key)) {
        if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) {
          return;
        }

        event.preventDefault();
        const pageNum = parseInt(key) - 1;

        if (zoomedServer) {
          window.dispatchEvent(
            new CustomEvent("tmux-switch-window", {
              detail: { windowIndex: pageNum },
            }),
          );
        } else {
          if (pageNum < totalPages) {
            setCurrentPage(pageNum);
            setSelectedServerIndex(pageNum * serversPerPage);
          }
        }
        return;
      }

      if (key === "/") {
        event.preventDefault();
        setIsSearching(true);
        setIsSearchHidden(false);
        return;
      }

      const handleServerNavigation = (direction) => {
        event.preventDefault();
        let newIndex = selectedServerIndex;

        const layout = getOptimalGridLayout();
        const serverPerPage = layout.rows * layout.cols;
        const startIndex = currentPage * serverPerPage;
        const localIndex = selectedServerIndex - startIndex;
        const lastPage = Math.ceil(serverNames.length / serversPerPage) - 1;

        // NOTE: This is gonna give you 0 based index for cols and rows
        const currentRow = Math.floor(localIndex / layout.cols);
        const currentCol = localIndex % layout.cols;
        const lastPageRow = Math.floor(
          (serverNames.length - lastPage * serverPerPage - 1) / layout.cols,
        );

        if (zoomedServer) {
          const tempZoomedIndex =
            direction.toLowerCase() === "down"
              ? selectedServerIndex + 1
              : direction.toLowerCase() === "up" && selectedServerIndex - 1;

          if (serverNames[tempZoomedIndex]) {
            const actualServerName =
              Object.keys(servers).find(
                (name) =>
                  Object.keys(filteredServers).includes(name) &&
                  Object.keys(filteredServers).indexOf(name) ===
                    tempZoomedIndex,
              ) || serverNames[tempZoomedIndex];
            setZoomedServer(actualServerName);
            setSelectedServerIndex(tempZoomedIndex);
          }
        } else if (direction.toLowerCase() === "left") {
          if (currentCol > 0) {
            newIndex = Math.max(newIndex - 1, 0);
          } else if (currentCol === 0 && currentPage !== 0) {
            newIndex = newIndex - serverPerPage + layout.cols - 1;
          }
        } else if (direction.toLowerCase() === "down") {
          if (currentRow !== lastPageRow || currentPage !== lastPage) {
            newIndex = Math.min(newIndex + layout.cols, serverNames.length - 1);
          }
        } else if (direction.toLowerCase() === "up") {
          if (currentRow !== 0 || currentPage !== 0) {
            newIndex = newIndex - layout.cols;
          }
        } else if (direction.toLowerCase() === "right") {
          if (currentCol < layout.cols - 1) {
            newIndex = Math.min(newIndex + 1, serverNames.length - 1);
          } else if (
            currentCol === layout.cols - 1 &&
            currentPage !== lastPage
          ) {
            const tempIndex = newIndex + serverPerPage - layout.cols + 1;
            if (tempIndex > serverNames.length - 1) {
              newIndex = tempIndex - (currentRow - lastPageRow) * layout.cols;
            } else newIndex = tempIndex;
          }
        }

        if (newIndex !== selectedServerIndex) {
          setSelectedServerIndex(newIndex);
        }
      };

      switch (key) {
        case "j":
        case "ArrowDown":
          handleServerNavigation("down");
          break;
        case "k":
        case "ArrowUp":
          handleServerNavigation("up");
          break;
        case "h":
        case "ArrowLeft":
          handleServerNavigation("left");
          break;
        case "l":
        case "ArrowRight":
          handleServerNavigation("right");
          break;
        case "Enter":
        case "z":
          event.preventDefault();
          if (zoomedServer) {
            setZoomedServer(null);
          } else if (serverNames[selectedServerIndex]) {
            const actualServerName =
              Object.keys(servers).find(
                (name) =>
                  Object.keys(filteredServers).includes(name) &&
                  Object.keys(filteredServers).indexOf(name) ===
                    selectedServerIndex,
              ) || serverNames[selectedServerIndex];
            setZoomedServer(actualServerName);
          }
          break;
        case "Escape":
          event.preventDefault();
          if (zoomedServer) {
            setZoomedServer(null);
          }
          break;
      }
    },
    [
      servers,
      filteredServers,
      serverNames,
      selectedServerIndex,
      isSearching,
      isSearchHidden,
      zoomedServer,
      totalPages,
      currentPage,
      serversPerPage,
    ],
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyPress);
    return () => document.removeEventListener("keydown", handleKeyPress);
  }, [handleKeyPress]);

  const handleSearchChange = (query) => {
    setSearchQuery(query);
    setSelectedServerIndex(0);
  };
  const handleSearchSubmit = () => {};

  const handleSearchCancel = () => {
    setIsSearching(false);
    setIsSearchHidden(false);
    setSearchQuery("");
    setSelectedServerIndex(0);
  };

  const handleSearchHide = () => {
    setIsSearchHidden(true);
  };

  const handleZoomclose = () => {
    setZoomedServer(null);
  };

  const openSearch = () => {
    setIsSearching(true);
    setIsSearchHidden(false);
  };

  const getSyncStatusText = () => {
    if (syncState.isRunning) {
      return `Syncing ${syncState.receivedCount}/${syncState.expectedCount} servers...`;
    }
    if (syncState.hasError) {
      return `${syncState.errorMessage}`;
    }
    if (lastFullSync) {
      return `Last sync: ${formatTimeSince(lastFullSync)}`;
    }
    return "No sync yet";
  };

  const getSyncStatusColor = () => {
    if (syncState.isRunning) return "text-purple-400";
    if (syncState.hasError) return "text-red-400";
    return "text-gray-500";
  };

  return (
    <div
      className="flex min-h-screen flex-col bg-black text-white"
      tabIndex={0}
    >
      <div className="flex items-center justify-between gap-3 px-5 py-3">
        <div className={`flex gap-3 text-xs ${getSyncStatusColor()}`}>
          <>
            {true && <span>{getSyncStatusText()}</span>}
            {lastFullSync && <span>{Object.keys(servers).length} servers</span>}
          </>
        </div>

        <div className="flex items-center gap-3">
          <div
            className={`rounded-md px-3 py-1.5 text-base font-medium ${
              connected ? "text-emerald-400" : "text-red-400"
            }`}
          >
            {connected ? "🟢 Connected" : "🔴 Disconnected"}
          </div>

          <button
            className={`cursor-pointer rounded-md border border-purple-400/40 px-3 py-2.5 text-base font-medium text-purple-400 transition-all duration-200 hover:bg-purple-500/40 ${
              isSearching ? "bg-purple-500/30" : "bg-purple-500/10"
            }`}
            onClick={openSearch}
          >
            🔍 Search (/)
          </button>
        </div>
      </div>

      <div className="relative flex flex-1 flex-col">
        <div className="flex-1">
          {Object.keys(servers).length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-gray-500">
              <div>No servers connected</div>
              <div className="mt-2.5 text-sm text-gray-700">
                Start child data collectors to see them here
              </div>
            </div>
          ) : (
            <>
              {isSearching && searchQuery && (
                <div className="mx-5 mb-5 p-3 text-sm text-purple-400">
                  <strong>Search Results:</strong> Found{" "}
                  {Object.keys(filteredServers).length} server
                  {Object.keys(filteredServers).length !== 1 ? "s" : ""}
                  {searchQuery && ` matching "${searchQuery}"`}
                  {Object.keys(filteredServers).length === 0 && (
                    <span className="ml-2 text-red-400">
                      - Try a different search term
                    </span>
                  )}
                </div>
              )}

              <ServerGrid
                servers={filteredServers}
                selectedIndex={selectedServerIndex}
                onServerSelect={setSelectedServerIndex}
                onServerZoom={setZoomedServer}
                currentPage={currentPage}
                onPageChange={setCurrentPage}
              />
            </>
          )}
        </div>

        {isSearching && !isSearchHidden && (
          <SearchBar
            searchQuery={searchQuery}
            onSearchChange={handleSearchChange}
            onSearchSubmit={handleSearchSubmit}
            onSearchCancel={handleSearchCancel}
            onSearchHide={handleSearchHide}
            searchResults={Object.keys(filteredServers).length}
            totalServers={Object.keys(servers).length}
            searchMode={getSearchMode(searchQuery)}
          />
        )}

        <div
          className={`pointer-events-none fixed right-5 z-[9999] rounded-md bg-black/80 px-3 py-2 text-xs text-gray-500 transition-all duration-200 ${
            isSearching && !isSearchHidden ? "bottom-20" : "bottom-5"
          }`}
        >
          {currentKeys && (
            <div className="mb-1 text-purple-400">Key: {currentKeys}</div>
          )}
          <div>
            {zoomedServer ? (
              <>
                jk/up/down: navigate zoomed servers • 1-9: switch windows •
                Esc/Enter/z: close • ?: help
              </>
            ) : (
              <>
                {isSearching && !isSearchHidden
                  ? "Esc: Close • Enter: Hide • ?: help"
                  : "hjkl/arrows: navigate • Enter/z: zoom • /: search • 1-9: pages • ?: help"}
              </>
            )}
          </div>
        </div>
      </div>

      {zoomedServer && (
        <ServerCard
          server={servers[zoomedServer]}
          onClose={handleZoomclose}
          serverName={zoomedServer}
          isZoomed={true}
        />
      )}

      {showHelp && <HelpPopup onClose={() => setShowHelp(false)} />}
    </div>
  );
};

export default App;
