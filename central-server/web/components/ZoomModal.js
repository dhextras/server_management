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

window.ZoomModal = ({ server, onClose }) => {
  const [modalDimensions, setModalDimensions] = useState({
    width: 0,
    height: 0,
  });
  const modalRef = useRef(null);

  useEffect(() => {
    const updateDimensions = () => {
      if (modalRef.current) {
        const rect = modalRef.current.getBoundingClientRect();
        setModalDimensions({ width: rect.width, height: rect.height });
      }
    };

    updateDimensions();
    const resizeObserver = new ResizeObserver(updateDimensions);
    if (modalRef.current) {
      resizeObserver.observe(modalRef.current);
    }

    return () => resizeObserver.disconnect();
  }, []);

  if (!server || !server.data_history || server.data_history.length === 0) {
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
        <div
          ref={modalRef}
          style={{
            background: "#1a1a1a",
            border: "2px solid #7D56F4",
            borderRadius: "12px",
            padding: "24px",
            maxWidth: "90vw",
            maxHeight: "90vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            color: "#666",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            style={{
              fontSize: "1.2rem",
              fontWeight: "bold",
              marginBottom: "12px",
            }}
          >
            No data available
          </div>
          <div style={{ fontSize: "1rem", opacity: 0.7 }}>
            Press Esc to close
          </div>
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
      <div
        ref={modalRef}
        style={{
          background: "#1a1a1a",
          border: "2px solid #7D56F4",
          borderRadius: "12px",
          padding: "24px",
          width: "90vw",
          height: "90vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "16px",
            paddingBottom: "12px",
            borderBottom: "1px solid #333",
            flexWrap: modalDimensions.width < 600 ? "wrap" : "nowrap",
            gap: "12px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              flex: "1",
              minWidth: 0,
            }}
          >
            <div
              style={{
                width: "12px",
                height: "12px",
                borderRadius: "50%",
                background: getStatusColor(server.state),
                flexShrink: 0,
              }}
            />
            <h2
              style={{
                margin: 0,
                fontSize: modalDimensions.width < 600 ? "1.2rem" : "1.5rem",
                fontWeight: "bold",
                color: "#fff",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                flex: 1,
                minWidth: 0,
              }}
            >
              {latestData.server_name}
            </h2>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "16px",
              flexShrink: 0,
              flexWrap: modalDimensions.width < 600 ? "wrap" : "nowrap",
            }}
          >
            <AdaptiveStatusIndicators
              stats={latestData.system_stats}
              cardWidth={modalDimensions.width}
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
          <window.TmuxDisplay
            tmuxPanes={latestData.tmux_panes || []}
            sessionName={latestData.session_name}
          />
        </div>
      </div>
    </div>
  );
};
