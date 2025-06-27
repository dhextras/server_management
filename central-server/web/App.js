const { useState, useEffect, useRef, useCallback } = React;

window.App = () => {
  const [servers, setServers] = useState({});
  const [connected, setConnected] = useState(false);
  const [selectedServerIndex, setSelectedServerIndex] = useState(0);
  const [zoomedServer, setZoomedServer] = useState(null);
  const [currentKeys, setCurrentKeys] = useState("");

  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [currentPage, setCurrentPage] = useState(0);

  useEffect(() => {
    const websocket = new WebSocket("ws://localhost:8081/ws");

    websocket.onopen = () => setConnected(true);
    websocket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.type === "server_update") {
        setServers(message.payload.servers || {});
      }
    };
    websocket.onclose = () => {
      setConnected(false);
      setTimeout(() => window.location.reload(), 2000);
    };

    return () => websocket.close();
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

  const getServersPerPage = () => {
    if (typeof window === "undefined") return 6;
    const width = window.innerWidth;

    if (width >= 2400) return 9;
    if (width >= 1600) return 6;
    if (width >= 768) return 4;
    return 2;
  };

  const serversPerPage = getServersPerPage();
  const totalPages = Math.ceil(serverNames.length / serversPerPage);

  const handleKeyPress = useCallback(
    (event) => {
      if (
        isSearching ||
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
          }
        }
        return;
      }

      if (key === "/") {
        event.preventDefault();
        setIsSearching(true);
        return;
      }

      if (key === ":") {
        event.preventDefault();
        return;
      }

      switch (key) {
        case "j":
        case "ArrowDown":
          event.preventDefault();
          setSelectedServerIndex((prev) =>
            Math.min(prev + 1, serverNames.length - 1),
          );
          break;
        case "k":
        case "ArrowUp":
          event.preventDefault();
          setSelectedServerIndex((prev) => Math.max(prev - 1, 0));
          break;
        case "h":
        case "ArrowLeft":
          event.preventDefault();
          setSelectedServerIndex((prev) => {
            const gridCols =
              window.innerWidth >= 2400
                ? 4
                : window.innerWidth >= 1600
                  ? 3
                  : window.innerWidth >= 768
                    ? 2
                    : 1;
            return Math.max(prev - gridCols, 0);
          });
          break;
        case "l":
        case "ArrowRight":
          event.preventDefault();
          setSelectedServerIndex((prev) => {
            const gridCols =
              window.innerWidth >= 2400
                ? 4
                : window.innerWidth >= 1600
                  ? 3
                  : window.innerWidth >= 768
                    ? 2
                    : 1;
            return Math.min(prev + gridCols, serverNames.length - 1);
          });
          break;
        case "Enter":
        case "z":
          event.preventDefault();
          if (serverNames[selectedServerIndex]) {
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
    setSearchQuery("");
    setSelectedServerIndex(0);
  };

  const openSearch = () => {
    setIsSearching(true);
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
          justifyContent: "flex-end",
          alignItems: "center",
          padding: "12px 20px",
          gap: "12px",
        }}
      >
        <div
          style={{
            padding: "7px 12px",
            borderRadius: "6px",
            fontSize: "1rem",
            background: connected
              ? "rgba(4, 181, 117, 0.2)"
              : "rgba(255, 107, 107, 0.2)",
            border: `1px solid ${connected ? "#04B575" : "#ff6b6b"}`,
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

      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          position: "relative",
        }}
      >
        <div style={{ flex: 1, padding: "16px" }}>
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
                mode="hybrid"
                onServerSelect={setSelectedServerIndex}
                onServerZoom={setZoomedServer}
                searchQuery={searchQuery}
                currentPage={currentPage}
                onPageChange={setCurrentPage}
              />
            </>
          )}
        </div>

        {isSearching && (
          <window.SearchBar
            searchQuery={searchQuery}
            onSearchChange={handleSearchChange}
            onSearchSubmit={handleSearchSubmit}
            onSearchCancel={handleSearchCancel}
            searchResults={Object.keys(filteredServers).length}
            totalServers={Object.keys(servers).length}
          />
        )}

        <div
          style={{
            position: "fixed",
            bottom: isSearching ? "80px" : "20px",
            right: "20px",
            background: "rgba(0, 0, 0, 0.8)",
            padding: "8px 12px",
            borderRadius: "6px",
            fontSize: "0.75rem",
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
              <>1-9: switch windows • Esc: close</>
            ) : (
              <>
                hjkl/arrows: navigate • Enter/z: zoom • /: search • 1-9: pages
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
