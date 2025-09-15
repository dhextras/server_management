import { useEffect, useRef, useState } from "react";
import { TmuxDisplay } from "./TmuxDisplay";

const AdaptiveStatusIndicators = ({ stats, cardWidth }) => {
  const getStatusColor = (percentage, type = "normal") => {
    if (type === "inverse") {
      if (percentage > 80) return "#ff0000";
      if (percentage > 60) return "#FFC107";
      return "#04B575";
    } else {
      if (percentage > 90) return "#ff0000";
      if (percentage > 70) return "#FFC107";
      return "#04B575";
    }
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const isCompact = cardWidth < 400;
  const isLarge = cardWidth > 500;

  if (isLarge) {
    return (
      <div
        style={{
          display: "flex",
          gap: "12px",
          fontSize: "1.2rem",
          color: "#ccc",
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <div
            style={{
              width: "6px",
              height: "6px",
              borderRadius: "50%",
              backgroundColor: getStatusColor(stats.cpu_percent),
            }}
          />
          <span
            style={{ color: "#fff", fontWeight: "500", fontSize: "1.15rem" }}
          >
            CPU:
          </span>
          <span
            style={{
              color: getStatusColor(stats.cpu_percent),
              fontWeight: "bold",
              fontSize: "1.2rem",
            }}
          >
            {Math.round(stats.cpu_percent)}%
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <div
            style={{
              width: "6px",
              height: "6px",
              borderRadius: "50%",
              backgroundColor: getStatusColor(stats.memory.percent, "inverse"),
            }}
          />
          <span
            style={{ color: "#fff", fontWeight: "500", fontSize: "1.15rem" }}
          >
            MEM:
          </span>
          <span
            style={{
              color: getStatusColor(stats.memory.percent, "inverse"),
              fontWeight: "bold",
              fontSize: "1.2rem",
            }}
          >
            {Math.round(stats.memory.percent)}%
          </span>
          <span style={{ color: "#666", fontSize: "0.9rem" }}>
            ({formatBytes(stats.memory.used)})
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <div
            style={{
              width: "6px",
              height: "6px",
              borderRadius: "50%",
              backgroundColor: getStatusColor(stats.disk.percent, "inverse"),
            }}
          />
          <span
            style={{ color: "#fff", fontWeight: "500", fontSize: "1.15rem" }}
          >
            DSK:
          </span>
          <span
            style={{
              color: getStatusColor(stats.disk.percent, "inverse"),
              fontWeight: "bold",
              fontSize: "1.2rem",
            }}
          >
            {Math.round(stats.disk.percent)}%
          </span>
          <span style={{ color: "#666", fontSize: "0.7rem" }}>
            ({formatBytes(stats.disk.used)})
          </span>
        </div>
      </div>
    );
  } else if (isCompact) {
    return (
      <div
        style={{
          display: "flex",
          gap: "6px",
          fontSize: "0.65rem",
          color: "#888",
          alignItems: "center",
        }}
      >
        <span style={{ color: getStatusColor(stats.cpu_percent) }}>
          C:{Math.round(stats.cpu_percent)}%
        </span>
        <span
          style={{ color: getStatusColor(stats.memory.percent, "inverse") }}
        >
          M:{Math.round(stats.memory.percent)}%
        </span>
        <span style={{ color: getStatusColor(stats.disk.percent, "inverse") }}>
          D:{Math.round(stats.disk.percent)}%
        </span>
      </div>
    );
  } else {
    return (
      <div
        style={{
          display: "flex",
          gap: "8px",
          fontSize: "0.9rem",
          color: "#888",
          alignItems: "center",
        }}
      >
        <span style={{ color: getStatusColor(stats.cpu_percent) }}>
          CPU:{Math.round(stats.cpu_percent)}%
        </span>
        <span
          style={{ color: getStatusColor(stats.memory.percent, "inverse") }}
        >
          MEM:{Math.round(stats.memory.percent)}%
        </span>
        <span style={{ color: getStatusColor(stats.disk.percent, "inverse") }}>
          DSK:{Math.round(stats.disk.percent)}%
        </span>
      </div>
    );
  }
};

export const ServerCard = ({
  server,
  serverName,
  isSelected,
  isFavorite,
  onClick,
  onDoubleClick,
  onClose,
  onToggleFavorite,
  isZoomed = false,
}) => {
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const containerRef = useRef(null);

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setDimensions({ width: rect.width, height: rect.height });
      }
    };

    updateDimensions();
    const resizeObserver = new ResizeObserver(updateDimensions);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => resizeObserver.disconnect();
  }, []);

  const getStatusColor = (state) => {
    switch (state) {
      case "active":
        return "#04B575";
      case "stale":
        return "#FFC107";
      case "dead":
        return "#ff0000";
      default:
        return "#666";
    }
  };

  const getBorderColor = (server, isSelected) => {
    if (isSelected) {
      return "#7D56F4";
    }

    if (!server || !server.data_history || server.data_history.length === 0) {
      return "#333";
    }

    const latestData = server.data_history[server.data_history.length - 1];

    if (server.state === "dead") {
      return "#ff0000";
    }
    if (server.state === "stale") {
      return "#FFC107";
    }

    const stats = latestData.system_stats;
    if (
      stats.cpu_percent > 80 ||
      stats.memory.percent > 60 ||
      stats.disk.percent > 95
    ) {
      return "#FF8C00";
    }

    return "#333";
  };

  const handleFavoriteClick = (e) => {
    e.stopPropagation();
    e.preventDefault();
    onToggleFavorite(serverName);
  };

  // No data state
  if (!server || !server.data_history || server.data_history.length === 0) {
    const content = (
      <div
        ref={containerRef}
        style={{
          background: "#1a1a1a",
          border: `2px solid ${getBorderColor(server, isSelected)}`,
          borderRadius: isZoomed ? "12px" : "8px",
          padding: isZoomed ? "24px" : "16px",
          minHeight: isZoomed ? "auto" : "380px",
          maxHeight: isZoomed ? "90vh" : "35vh",
          maxWidth: isZoomed ? "90vw" : "auto",
          display: "flex",
          flexDirection: "column",
          transition: "all 0.2s",
          cursor: isZoomed ? "default" : "pointer",
          position: "relative",
          justifyContent: "center",
          alignItems: "center",
          color: "#666",
          ...(isZoomed && {
            width: "90vw",
            height: "90vh",
          }),
        }}
        onClick={isZoomed ? (e) => e.stopPropagation() : onClick}
        onDoubleClick={!isZoomed ? onDoubleClick : undefined}
      >
        {!isZoomed && (
          <button
            onClick={handleFavoriteClick}
            style={{
              position: "absolute",
              top: "10px",
              right: "15px",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color: isFavorite ? "#FFD700" : "#666",
              fontSize: "20px",
              padding: "4px",
              borderRadius: "4px",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              e.target.style.color = isFavorite ? "#FFA500" : "#999";
            }}
            onMouseLeave={(e) => {
              e.target.style.color = isFavorite ? "#FFD700" : "#666";
            }}
          >
            ★
          </button>
        )}

        <div style={{ fontSize: "1rem", fontWeight: "bold" }}>
          {serverName || "Unknown Server"}
        </div>
        <div style={{ fontSize: "0.9rem", marginTop: "8px", opacity: 0.7 }}>
          No data available
        </div>
        {isZoomed && (
          <div style={{ fontSize: "1rem", marginTop: "12px", opacity: 0.7 }}>
            Press Esc to close
          </div>
        )}
      </div>
    );

    if (isZoomed) {
      return (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.8)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={onClose}
        >
          {content}
        </div>
      );
    }

    return content;
  }

  const latestData = server.data_history[server.data_history.length - 1];

  const handleClick = (e) => {
    if (!isZoomed) {
      e.preventDefault();
      onClick();
    }
  };

  const handleDoubleClick = (e) => {
    if (!isZoomed) {
      e.preventDefault();
      onDoubleClick();
    }
  };

  const content = (
    <div
      ref={containerRef}
      style={{
        background: "#1a1a1a",
        border: `2px solid ${getBorderColor(server, isSelected)}`,
        borderRadius: isZoomed ? "12px" : "8px",
        padding: isZoomed ? "24px" : dimensions.width < 350 ? "12px" : "16px",
        minHeight: isZoomed ? "auto" : "380px",
        maxHeight: isZoomed ? "90vh" : "35vh",
        display: "flex",
        flexDirection: "column",
        transition: "all 0.2s",
        cursor: isZoomed ? "default" : "pointer",
        position: "relative",
        overflow: "hidden",
        ...(isZoomed && {
          width: "90vw",
          height: "90vh",
        }),
      }}
      onClick={isZoomed ? (e) => e.stopPropagation() : handleClick}
      onDoubleClick={isZoomed ? undefined : handleDoubleClick}
      className={isZoomed ? "" : "server-card"}
    >
      {!isZoomed && (
        <style>{`
          @media (max-width: 767px) {
            .server-card {
              min-height: 250px !important;
              padding: 12px !important;
            }
          }
        `}</style>
      )}

      {!isZoomed && (
        <button
          onClick={handleFavoriteClick}
          style={{
            position: "absolute",
            top: dimensions.width < 350 ? "6px" : "10px",
            right: dimensions.width < 350 ? "12px" : "15px",
            background: "transparent",
            border: "none",
            cursor: "pointer",
            color: isFavorite ? "#FFD700" : "#666",
            fontSize: dimensions.width < 350 ? "16px" : "20px",
            padding: "4px",
            borderRadius: "4px",
            transition: "all 0.2s",
            zIndex: 10,
          }}
          onMouseEnter={(e) => {
            e.target.style.color = isFavorite ? "#FFA500" : "#999";
            e.target.style.transform = "scale(1.1)";
          }}
          onMouseLeave={(e) => {
            e.target.style.color = isFavorite ? "#FFD700" : "#666";
            e.target.style.transform = "scale(1)";
          }}
        >
          ★
        </button>
      )}

      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: isZoomed
            ? "16px"
            : dimensions.width < 350
              ? "8px"
              : "12px",
          paddingBottom: isZoomed ? "12px" : "0",
          borderBottom: isZoomed ? "1px solid #333" : "none",
          flexWrap: isZoomed && dimensions.width < 600 ? "wrap" : "nowrap",
          gap: isZoomed ? "12px" : "8px",
          paddingRight: !isZoomed
            ? dimensions.width < 350
              ? "24px"
              : "32px"
            : "0",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: isZoomed ? "12px" : "8px",
            flex: "1",
            minWidth: 0,
          }}
        >
          <div
            style={{
              width: isZoomed ? "12px" : "8px",
              height: isZoomed ? "12px" : "8px",
              borderRadius: "50%",
              background: getStatusColor(server.state),
              flexShrink: 0,
            }}
          />

          {isZoomed ? (
            <h2
              style={{
                margin: 0,
                fontSize: dimensions.width < 600 ? "1.2rem" : "1.5rem",
                fontWeight: "bold",
                color: "#fff",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                flex: 1,
                minWidth: 0,
              }}
            >
              {latestData.server_name || serverName}
            </h2>
          ) : (
            <div
              style={{
                fontSize: dimensions.width < 350 ? "0.9rem" : "1rem",
                fontWeight: "bold",
                color: "#fff",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                flex: 1,
                minWidth: 0,
              }}
            >
              {serverName}
            </div>
          )}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: isZoomed ? "16px" : "0",
            flexShrink: 0,
            flexWrap: isZoomed && dimensions.width < 600 ? "wrap" : "nowrap",
            alignSelf:
              !isZoomed && dimensions.width < 350 ? "flex-start" : "center",
          }}
        >
          <AdaptiveStatusIndicators
            stats={latestData.system_stats}
            cardWidth={dimensions.width}
          />
        </div>
      </div>

      {/* Content */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            flex: 1,
            maxWidth: "100%",
            maxHeight: "100%",
          }}
        >
          <TmuxDisplay
            dataHistory={server.data_history}
            sessionName={
              server.data_history.length > 0
                ? server.data_history[server.data_history.length - 1]
                    .session_name
                : "session"
            }
          />
        </div>
      </div>
    </div>
  );

  // Wrap in modal overlay if zoomed
  if (isZoomed) {
    return (
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0, 0, 0, 0.8)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
          padding: "20px",
        }}
        onClick={onClose}
      >
        {content}
      </div>
    );
  }

  return content;
};
