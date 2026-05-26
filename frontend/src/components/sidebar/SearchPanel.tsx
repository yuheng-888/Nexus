import React, { useCallback, useRef, useState } from "react";
import { useStore } from "../../store/useStore";
import { useFileTree } from "../../hooks/useFileTree";
import { Search, X } from "lucide-react";

export function SearchPanel() {
  const searchQuery = useStore((s) => s.searchQuery);
  const searchResults = useStore((s) => s.searchResults);
  const searchLoading = useStore((s) => s.searchLoading);
  const setSearchQuery = useStore((s) => s.setSearchQuery);
  const setSearchResults = useStore((s) => s.setSearchResults);
  const setSearchLoading = useStore((s) => s.setSearchLoading);
  const { openFileByEntry } = useFileTree();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const doSearch = useCallback(
    async (query: string) => {
      if (!query.trim()) { setSearchResults([]); return; }
      setSearchLoading(true);
      try {
        const results = await window.nexus.search({ query });
        setSearchResults([...results]);
      } catch (err) {
        console.error("Search failed:", err);
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    },
    [setSearchResults, setSearchLoading]
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(value), 300);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      doSearch(searchQuery);
    }
  };

  const clearSearch = () => { setSearchQuery(""); setSearchResults([]); };

  const grouped = new Map<string, typeof searchResults>();
  for (const match of searchResults) {
    const arr = grouped.get(match.path) ?? [];
    arr.push(match);
    grouped.set(match.path, arr);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "0 12px 8px" }}>
        <div style={{ flex: 1, position: "relative" }}>
          <Search size={13} style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
          <input
            type="text" placeholder="全局搜索..." value={searchQuery}
            onChange={handleChange} onKeyDown={handleKeyDown}
            style={{
              width: "100%", height: 30, paddingLeft: 28, paddingRight: 28,
              fontSize: 12, color: "var(--text-primary)", background: "var(--bg-input)",
              border: "1px solid var(--border)", borderRadius: "var(--radius-sm)",
              outline: "none", fontFamily: "inherit",
            }}
            autoFocus
          />
          {searchQuery && (
            <button
              onClick={clearSearch}
              style={{
                position: "absolute", right: 4, top: "50%", transform: "translateY(-50%)",
                display: "flex", alignItems: "center", justifyContent: "center",
                width: 20, height: 20, background: "none", border: "none",
                color: "var(--text-muted)", cursor: "pointer", borderRadius: "var(--radius-sm)",
              }}
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>
      <div style={{ flex: 1, overflow: "auto", padding: "0 4px" }}>
        {searchLoading && (
          <div style={{ padding: "12px 16px", color: "var(--text-muted)", fontSize: 12 }}>
            <span className="animate-pulse">搜索中...</span>
          </div>
        )}
        {!searchLoading && searchQuery && searchResults.length === 0 && (
          <div style={{ padding: "12px 16px", color: "var(--text-muted)", fontSize: 12 }}>未找到结果</div>
        )}
        {!searchLoading && [...grouped.entries()].map(([filePath, matches]) => (
          <div key={filePath} style={{ marginBottom: 4 }}>
            <div style={{
              padding: "4px 12px", fontSize: 11, fontWeight: 600,
              color: "var(--text-accent)", display: "flex", alignItems: "center", gap: 4,
            }}>
              <span style={{
                background: "var(--accent-subtle)", padding: "1px 6px", borderRadius: 10,
                fontSize: 10, color: "var(--text-accent)",
              }}>{matches.length}</span>
              {filePath}
            </div>
            {matches.map((match, i) => (
              <div
                key={`${filePath}-${match.line}-${i}`}
                onClick={() => openFileByEntry(filePath, filePath.split("/").pop() ?? filePath, filePath)}
                style={{
                  display: "flex", alignItems: "flex-start",
                  padding: "2px 12px 2px 24px", fontSize: 12,
                  cursor: "pointer", fontFamily: "var(--font-mono)", lineHeight: 1.5,
                  borderRadius: "var(--radius-sm)", transition: "background 0.1s",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-hover)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = ""; }}
              >
                <span style={{ color: "var(--text-muted)", minWidth: 32, textAlign: "right", marginRight: 8, flexShrink: 0 }}>{match.line}</span>
                <span style={{ color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{match.preview}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
