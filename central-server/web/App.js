const { useState, useEffect, useRef, useCallback } = React;

window.App = () => {
  const [servers, setServers] = useState({});
  const [connected, setConnected] = useState(false);
  const [selectedServerIndex, setSelectedServerIndex] = useState(0);
  const [zoomedServer, setZoomedServer] = useState(null);
  const [currentKeys, setCurrentKeys] = useState("");

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

    const searchTerm = query.toLowerCase().trim();
    const filteredServers = {};

    Object.keys(servers).forEach((serverName) => {
      const server = servers[serverName];

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

      if (
        server.data_history?.[0]?.session_name
          ?.toLowerCase()
          .includes(searchTerm)
      ) {
        filteredServers[serverName] = server;
        return;
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
      if (
        (isSearching && !isSearchHidden) ||
        event.target.tagName === "INPUT" ||
        event.target.tagName === "TEXTAREA"
      ) {
        return;
      }

      const key = event.key;

      setCurrentKeys((prev) => prev + key);
      setTimeout(() => setCurrentKeys(""), 1000);

      if (["1", "2", "3", "4", "5", "6", "7", "8", "9"].includes(key)) {
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
        const lastPageRow = Math.floor(
          (serverNames.length - lastPage * serverPerPage - 1) / layout.cols,
        );

        const currentCol = localIndex % layout.cols;
        const lastPageCol =
          (serverNames.length - lastPage * serverPerPage - 1) % layout.cols;

        if (direction.toLowerCase() === "left") {
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
      zoomedServer,
      totalPages,
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
    if (syncState.isRunning) return "#7d56f4";
    if (syncState.hasError) return "#ff6b6b";
    return "#666";
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0a0a0a",
        color: "#ffffff",
        display: "flex",
        flexDirection: "column",
      }}
      tabIndex={0}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "12px 20px",
          gap: "12px",
        }}
      >
        <div
          style={{
            fontSize: "0.8rem",
            color: getSyncStatusColor(),
            display: "flex",
            gap: "12px",
          }}
        >
          <>
            {true && <span>{getSyncStatusText()}</span>}
            {lastFullSync && <span>{Object.keys(servers).length} servers</span>}
          </>
        </div>

        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <div
            style={{
              padding: "7px 12px",
              borderRadius: "6px",
              fontSize: "1rem",
              color: connected ? "#04B575" : "#ff6b6b",
              fontWeight: "500",
            }}
          >
            {connected ? "🟢 Connected" : "🔴 Disconnected"}
          </div>

          <button
            style={{
              padding: "10px 12px",
              border: "1px solid rgba(125, 86, 244, 0.4)",
              background: isSearching
                ? "rgba(125, 86, 244, 0.3)"
                : "rgba(125, 86, 244, 0.1)",
              color: "#7d56f4",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "1rem",
              fontWeight: "500",
              transition: "all 0.2s",
            }}
            onClick={openSearch}
            onMouseEnter={(e) => {
              e.target.style.background = "rgba(125, 86, 244, 0.4)";
            }}
            onMouseLeave={(e) => {
              e.target.style.background = isSearching
                ? "rgba(125, 86, 244, 0.3)"
                : "rgba(125, 86, 244, 0.1)";
            }}
          >
            🔍 Search (/)
          </button>
        </div>
      </div>

      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          position: "relative",
        }}
      >
        <div style={{ flex: 1 }}>
          {Object.keys(servers).length === 0 ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "center",
                height: "100%",
                color: "#666",
              }}
            >
              <div>No servers connected</div>
              <div
                style={{ fontSize: "0.9rem", marginTop: "10px", color: "#444" }}
              >
                Start child data collectors to see them here
              </div>
            </div>
          ) : (
            <>
              {isSearching && searchQuery && (
                <div
                  style={{
                    background: "rgba(125, 86, 244, 0.1)",
                    border: "1px solid rgba(125, 86, 244, 0.3)",
                    borderRadius: "8px",
                    padding: "12px 16px",
                    marginBottom: "20px",
                    color: "#7d56f4",
                    fontSize: "0.9rem",
                  }}
                >
                  <strong>Search Results:</strong> Found{" "}
                  {Object.keys(filteredServers).length} server
                  {Object.keys(filteredServers).length !== 1 ? "s" : ""}
                  {searchQuery && ` matching "${searchQuery}"`}
                  {Object.keys(filteredServers).length === 0 && (
                    <span style={{ color: "#ff6b6b", marginLeft: "8px" }}>
                      - Try a different search term
                    </span>
                  )}
                </div>
              )}

              <window.ServerGrid
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
          <window.SearchBar
            searchQuery={searchQuery}
            onSearchChange={handleSearchChange}
            onSearchSubmit={handleSearchSubmit}
            onSearchCancel={handleSearchCancel}
            onSearchHide={handleSearchHide}
            searchResults={Object.keys(filteredServers).length}
            totalServers={Object.keys(servers).length}
          />
        )}

        <div
          style={{
            position: "fixed",
            bottom: isSearching && !isSearchHidden ? "80px" : "20px",
            right: "20px",
            background: "rgba(0, 0, 0, 0.8)",
            padding: "8px 12px",
            borderRadius: "6px",
            fontSize: "0.75rem",
            zIndex: 9999,
            color: "#666",
            pointerEvents: "none",
            transition: "all 0.2s",
          }}
        >
          {currentKeys && (
            <div style={{ color: "#7d56f4", marginBottom: "4px" }}>
              Key: {currentKeys}
            </div>
          )}
          <div>
            {zoomedServer ? (
              <>1-9: switch windows • Esc/Enter/z: close</>
            ) : (
              <>
                {isSearching && !isSearchHidden
                  ? "Esc: Close • Enter: Hide "
                  : "hjkl/arrows: navigate • Enter/z: zoom • /: search • 1-9: pages"}
              </>
            )}
          </div>
        </div>
      </div>

      {zoomedServer && (
        <window.ZoomModal
          server={servers[zoomedServer]}
          onClose={() => setZoomedServer(null)}
        />
      )}
    </div>
  );
};
