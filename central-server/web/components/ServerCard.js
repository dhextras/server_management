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
            style={{ color: "#fff", fontWeight: "500", fontSize: "0.95rem" }}
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
            style={{ color: "#fff", fontWeight: "500", fontSize: "0.95rem" }}
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
            style={{ color: "#fff", fontWeight: "500", fontSize: "0.95rem" }}
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

window.ServerCard = ({
  server,
  serverName,
  isSelected,
  onClick,
  onDoubleClick,
}) => {
  const [cardDimensions, setCardDimensions] = useState({ width: 0, height: 0 });
  const cardRef = useRef(null);

  useEffect(() => {
    const updateDimensions = () => {
      if (cardRef.current) {
        const rect = cardRef.current.getBoundingClientRect();
        setCardDimensions({ width: rect.width, height: rect.height });
      }
    };

    updateDimensions();
    const resizeObserver = new ResizeObserver(updateDimensions);
    if (cardRef.current) {
      resizeObserver.observe(cardRef.current);
    }

    return () => resizeObserver.disconnect();
  }, []);

  if (!server || !server.data_history || server.data_history.length === 0) {
    return (
      <div
        ref={cardRef}
        style={{
          background: "#1a1a1a",
          border: `2px solid ${isSelected ? "#7D56F4" : "#333"}`,
          borderRadius: "8px",
          padding: "16px",
          minHeight: "380px",
          maxHeight: "35vh",
          display: "flex",
          flexDirection: "column",
          transition: "all 0.2s",
          cursor: "pointer",
          position: "relative",
          justifyContent: "center",
          alignItems: "center",
          color: "#666",
        }}
        onClick={onClick}
        onDoubleClick={onDoubleClick}
      >
        <style>{`
          .no-data-card:hover {
            border-color: #7D56F4 !important;
            transform: translateY(-2px) !important;
            box-shadow: 0 4px 12px rgba(125, 86, 244, 0.2) !important;
          }
        `}</style>

        <div style={{ fontSize: "1rem", fontWeight: "bold" }}>{serverName}</div>
        <div style={{ fontSize: "0.9rem", marginTop: "8px", opacity: 0.7 }}>
          No data available
        </div>
      </div>
    );
  }

  const latestData = server.data_history[server.data_history.length - 1];

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

  const handleClick = (e) => {
    e.preventDefault();
    onClick();
  };

  const handleDoubleClick = (e) => {
    e.preventDefault();
    onDoubleClick();
  };

  return (
    <div
      ref={cardRef}
      style={{
        background: "#1a1a1a",
        border: `2px solid ${isSelected ? "#7D56F4" : "#333"}`,
        borderRadius: "8px",
        padding: cardDimensions.width < 350 ? "12px" : "16px",
        minHeight: "380px",
        maxHeight: "35vh",
        display: "flex",
        flexDirection: "column",
        transition: "all 0.2s",
        cursor: "pointer",
        position: "relative",
        overflow: "hidden",
      }}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      className="server-card"
    >
      <style>{`
        @media (max-width: 767px) {
          .server-card {
            min-height: 250px !important;
            padding: 12px !important;
          }
        }
      `}</style>

      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          marginBottom: cardDimensions.width < 350 ? "8px" : "12px",
          gap: "8px",
          flexDirection: cardDimensions.width < 350 ? "column" : "row",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            flex: "1",
            minWidth: 0,
          }}
        >
          <div
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              background: getStatusColor(server.state),
              flexShrink: 0,
            }}
          ></div>

          <div
            style={{
              fontSize: cardDimensions.width < 350 ? "0.9rem" : "1rem",
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
        </div>

        <div
          style={{
            flexShrink: 0,
            alignSelf: cardDimensions.width < 350 ? "flex-start" : "center",
          }}
        >
          <AdaptiveStatusIndicators
            stats={latestData.system_stats}
            cardWidth={cardDimensions.width}
          />
        </div>
      </div>

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
};
