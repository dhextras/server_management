import React, { useState, useRef, useEffect } from "react";
import { ServerCard } from "./ServerCard";

export const ServerGrid = ({
  servers,
  selectedIndex,
  onServerSelect,
  onServerZoom,
  currentPage,
  onPageChange,
}) => {
  const gridRef = useRef(null);
  const serverNames = Object.keys(servers);

  const getOptimalGridLayout = () => {
    if (typeof window === "undefined") return { cols: 3, rows: 2 };

    const width = window.innerWidth;
    const height = window.innerHeight;

    const availableWidth = width - 40; // 20px padding each side
    const availableHeight = height - 200; // Headers, navigation, etc...

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

  const [layout, setLayout] = useState(getOptimalGridLayout());
  const serversPerPage = layout.cols * layout.rows;

  // Update layout on window resize
  useEffect(() => {
    const handleResize = () => {
      const newLayout = getOptimalGridLayout();
      setLayout(newLayout);
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const totalPages = Math.ceil(serverNames.length / serversPerPage);
  const startIndex = currentPage * serversPerPage;
  const endIndex = startIndex + serversPerPage;
  const currentServers = serverNames.slice(startIndex, endIndex);

  const handleCardClick = (localIndex) => {
    const globalIndex = startIndex + localIndex;
    onServerSelect(globalIndex);
  };

  const handleCardDoubleClick = (serverName) => {
    onServerZoom(serverName);
  };

  const getLocalSelectedIndex = () => {
    if (selectedIndex < 0) return -1;
    const localIndex = selectedIndex - startIndex;
    return localIndex >= 0 && localIndex < serversPerPage ? localIndex : -1;
  };

  useEffect(() => {
    if (selectedIndex >= 0) {
      const targetPage = Math.floor(selectedIndex / serversPerPage);
      if (targetPage !== currentPage) {
        onPageChange(targetPage);
      }
    }
  }, [selectedIndex, serversPerPage]);

  return (
    <div
      style={{
        width: "100%",
        minHeight: "100vh",
        padding: "20px",
        paddingTop: "5px",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <style>{`
.server-grid-container {
display: grid;
grid-template-columns: repeat(${layout.cols}, 1fr);
grid-template-rows: repeat(${layout.rows}, minmax(280px, 1fr));
gap: 16px;
width: 100%;
max-width: 100%;
margin: 0 auto;
flex: 1;
}

.pagination-button {
background: rgba(125, 86, 244, 0.2);
border: 1px solid rgba(125, 86, 244, 0.4);
color: #7d56f4;
padding: 8px 16px;
border-radius: 6px;
font-size: 0.9rem;
cursor: pointer;
transition: all 0.2s;
font-weight: 500;
}

.pagination-button:hover {
background: rgba(125, 86, 244, 0.3);
border-color: rgba(125, 86, 244, 0.6);
transform: translateY(-1px);
}

.pagination-button:disabled {
background: rgba(125, 86, 244, 0.1);
border-color: rgba(125, 86, 244, 0.2);
color: #666;
cursor: not-allowed;
transform: none;
}

.page-number {
background: rgba(125, 86, 244, 0.2);
border: 1px solid rgba(125, 86, 244, 0.4);
color: #7d56f4;
padding: 6px 12px;
border-radius: 4px;
font-size: 0.8rem;
cursor: pointer;
transition: all 0.2s;
min-width: 32px;
text-align: center;
}

.page-number.active {
background: #7d56f4;
color: #fff;
border-color: #7d56f4;
}

.page-number:hover:not(.active) {
background: rgba(125, 86, 244, 0.3);
}
`}</style>

      {totalPages > 1 && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <div
            style={{
              display: "flex",
              gap: "6px",
              alignItems: "center",
            }}
          >
            {Array.from({ length: totalPages }, (_, i) => (
              <button
                key={i}
                className={`page-number ${i === currentPage ? "active" : ""}`}
                onClick={() => {
                  onPageChange(i);
                  onServerSelect(i * serversPerPage);
                }}
              >
                {i + 1}
              </button>
            ))}
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "row",
              justifyContent: "center",
              alignItems: "center",
              gap: "8px",
              marginBottom: "16px",
              fontSize: "0.8rem",
              color: "#666",
            }}
          >
            <span>
              Grid: {layout.cols}×{layout.rows} • Showing{" "}
              {currentServers.length} of {serverNames.length} servers{" "}
              {totalPages > 1 && (
                <>
                  • Page {currentPage + 1} of {totalPages}
                </>
              )}
            </span>
          </div>
        </div>
      )}

      <div
        ref={gridRef}
        className="server-grid-container"
        style={{
          minHeight: `${layout.rows * 300}px`,
        }}
      >
        {currentServers.map((serverName, localIndex) => (
          <ServerCard
            key={serverName}
            server={servers[serverName]}
            serverName={serverName}
            isSelected={localIndex === getLocalSelectedIndex()}
            onClick={() => handleCardClick(localIndex)}
            onDoubleClick={() => handleCardDoubleClick(serverName)}
          />
        ))}
      </div>
    </div>
  );
};
