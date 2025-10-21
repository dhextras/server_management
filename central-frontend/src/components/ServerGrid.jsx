import { useEffect, useRef, useState } from "react";
import { ServerCard } from "./ServerCard";

export const ServerGrid = ({
  servers,
  selectedIndex,
  onServerSelect,
  onServerZoom,
  currentPage,
  onPageChange,
  favorites,
  onToggleFavorite,
}) => {
  const gridRef = useRef(null);

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

  // Sort servers: favorites first, then the rest
  const sortedServerNames = () => {
    const serverNames = Object.keys(servers);
    const favoriteServers = serverNames.filter((name) =>
      favorites.includes(name),
    );
    const nonFavoriteServers = serverNames.filter(
      (name) => !favorites.includes(name),
    );
    return [...favoriteServers, ...nonFavoriteServers];
  };

  const serverNames = sortedServerNames();
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

  const favoriteCount = favorites.length;
  const totalServers = serverNames.length;

  return (
    <div className="flex min-h-screen w-full flex-col p-5 pt-1">
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
      `}</style>

      {totalPages > 1 && (
        <div className="flex flex-col items-center justify-center gap-3">
          <div className="flex items-center gap-1.5">
            {Array.from({ length: totalPages }, (_, i) => (
              <button
                key={i}
                className={`min-w-[32px] cursor-pointer rounded border border-purple-400/40 bg-purple-500/20 px-3 py-1.5 text-center text-xs text-purple-400 transition-all duration-200 hover:bg-purple-500/30 ${
                  i === currentPage
                    ? "!border-purple-500 !bg-purple-500 !text-white"
                    : ""
                }`}
                onClick={() => {
                  onPageChange(i);
                  onServerSelect(i * serversPerPage);
                }}
              >
                {i + 1}
              </button>
            ))}
          </div>

          <div className="mb-4 flex flex-col items-center justify-center gap-1 text-xs text-gray-500">
            <div className="flex flex-row items-center justify-center gap-2">
              <span>
                Grid: {layout.cols}×{layout.rows} • Showing{" "}
                {currentServers.length} of {totalServers} servers{" "}
                {totalPages > 1 && (
                  <>
                    • Page {currentPage + 1} of {totalPages}
                  </>
                )}
              </span>
            </div>
            {favoriteCount > 0 && (
              <div className="flex items-center gap-1">
                <span style={{ color: "#FFD700" }}>★</span>
                <span>
                  {favoriteCount} favorite{favoriteCount !== 1 ? "s" : ""}
                  {favoriteCount > 0 && " (shown first)"}
                </span>
              </div>
            )}
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
            isFavorite={favorites.includes(serverName)}
            onClick={() => handleCardClick(localIndex)}
            onDoubleClick={() => handleCardDoubleClick(serverName)}
            onToggleFavorite={onToggleFavorite}
            isZoomed={false}
          />
        ))}
      </div>
    </div>
  );
};
