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
    <div className="fixed bottom-0 left-0 right-0 z-[1000] flex items-center gap-3 border-t-2 border-purple-500 bg-zinc-900 p-3 shadow-2xl md:px-5">
      <style>{`
        .search-input::placeholder {
          color: #666;
          font-style: italic;
        }
      `}</style>

      <div className="flex min-w-[20px] items-center text-lg font-bold text-purple-500">
        🔍
      </div>

      <input
        ref={inputRef}
        type="text"
        className="search-input flex-1 border-none bg-transparent py-1.5 text-base text-sm text-white outline-none md:text-base"
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={getPlaceholder()}
        autoComplete="off"
        spellCheck={false}
      />

      <div
        className={`min-w-[80px] text-right text-xs font-medium transition-all duration-200 md:text-sm ${
          searchResults === 0
            ? "text-red-400"
            : searchResults === totalServers
              ? "text-gray-500"
              : "text-purple-500"
        }`}
      >
        {searchQuery.length > 0 ? (
          <span>
            {searchResults} of {totalServers}
            {searchResults === 0 && " (no matches)"}
          </span>
        ) : (
          <span className="text-gray-500">{totalServers} total</span>
        )}
      </div>

      <div className="flex items-center gap-2">
        {searchQuery.length > 0 && (
          <button
            className="cursor-pointer rounded border border-red-400/40 bg-red-500/20 px-2 py-1 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/30"
            onClick={onSearchCancel}
            title="Close search"
          >
            <span className="hidden md:inline">Close (Esc)</span>
            <span className="md:hidden">Esc</span>
          </button>
        )}

        <button
          className="cursor-pointer rounded border border-purple-400/40 bg-purple-500/20 px-2 py-1 text-xs font-medium text-purple-400 transition-colors hover:bg-purple-500/30"
          onClick={onSearchHide}
          title="Hide search"
        >
          <span className="hidden md:inline">Hide (Enter)</span>
          <span className="md:hidden">Enter</span>
        </button>
      </div>
    </div>
  );
};
