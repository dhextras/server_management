import { useEffect, useRef } from "react";

export const SearchBar = ({
  searchQuery,
  onSearchChange,
  onSearchCancel,
  onSearchHide,
  searchResults,
  totalServers,
}) => {
  const inputRef = useRef(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      onSearchHide();
    } else if (e.key === "Escape") {
      e.preventDefault();
      onSearchCancel();
    }
  };

  const getPlaceholder = () => {
    if (searchQuery.length === 0) {
      return "Search servers by name, status, or content...";
    }
    return "";
  };

  return (
    <div
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        background: "#1a1a1a",
        borderTop: "2px solid #7d56f4",
        padding: "12px 20px",
        display: "flex",
        alignItems: "center",
        gap: "12px",
        zIndex: 1000,
        boxShadow: "0 -4px 20px rgba(0, 0, 0, 0.5)",
      }}
    >
      <style>{`
        .search-input::placeholder {
          color: #666;
          font-style: italic;
        }
        .search-results-indicator {
          transition: all 0.2s ease;
        }
        @media (max-width: 768px) {
          .search-bar {
            padding: 10px 15px !important;
          }
          .search-input {
            font-size: 0.9rem !important;
          }
          .search-hint {
            display: none !important;
          }
        }
      `}</style>

      <div
        style={{
          color: "#7d56f4",
          fontWeight: "bold",
          fontSize: "1.1rem",
          minWidth: "20px",
          display: "flex",
          alignItems: "center",
        }}
      >
        🔍
      </div>

      <input
        ref={inputRef}
        type="text"
        className="search-input"
        style={{
          flex: 1,
          background: "transparent",
          border: "none",
          color: "#fff",
          fontSize: "1rem",
          outline: "none",
          padding: "6px 0",
        }}
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={getPlaceholder()}
        autoComplete="off"
        spellCheck={false}
      />

      <div
        className="search-results-indicator"
        style={{
          color:
            searchResults === 0
              ? "#ff6b6b"
              : searchResults === totalServers
                ? "#666"
                : "#7d56f4",
          fontSize: "0.85rem",
          fontWeight: "500",
          minWidth: "80px",
          textAlign: "right",
        }}
      >
        {searchQuery.length > 0 ? (
          <span>
            {searchResults} of {totalServers}
            {searchResults === 0 && " (no matches)"}
          </span>
        ) : (
          <span style={{ color: "#666" }}>{totalServers} total</span>
        )}
      </div>

      <div
        style={{
          display: "flex",
          gap: "8px",
          alignItems: "center",
        }}
      >
        {searchQuery.length > 0 && (
          <button
            style={{
              background: "rgba(255, 107, 107, 0.2)",
              border: "1px solid rgba(255, 107, 107, 0.4)",
              color: "#ff6b6b",
              padding: "4px 8px",
              borderRadius: "4px",
              fontSize: "0.8rem",
              cursor: "pointer",
              fontWeight: "500",
            }}
            onClick={onSearchCancel}
            title="Close search"
          >
            Close (Esc)
          </button>
        )}

        <button
          style={{
            background: "rgba(125, 86, 244, 0.2)",
            border: "1px solid rgba(125, 86, 244, 0.4)",
            color: "#7d56f4",
            padding: "4px 8px",
            borderRadius: "4px",
            fontSize: "0.8rem",
            cursor: "pointer",
            fontWeight: "500",
          }}
          onClick={onSearchHide}
          title="Hide search"
        >
          Hide (Enter)
        </button>
      </div>
    </div>
  );
};
