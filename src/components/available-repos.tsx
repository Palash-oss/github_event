"use client";

import { useEffect, useState } from "react";

type RepoDto = {
  id: number;
  name: string;
  owner: string;
  fullName: string;
  private: boolean;
  htmlUrl: string;
  description: string;
};

type AvailableReposProps = {
  connectedRepoKeys: string[];
};

export default function AvailableRepos({ connectedRepoKeys }: AvailableReposProps) {
  const [repos, setRepos] = useState<RepoDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    fetch("/api/repos")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load repositories from GitHub");
        return res.json();
      })
      .then((data) => {
        setRepos(data.repos || []);
        setError(null);
      })
      .catch((err) => {
        console.error(err);
        setError(err.message || "An error occurred");
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const connectedSet = new Set(connectedRepoKeys);

  // Filter by search query
  const filtered = repos.filter((r) =>
    r.fullName.toLowerCase().includes(search.toLowerCase()) ||
    (r.description || "").toLowerCase().includes(search.toLowerCase())
  );

  const PAGE_SIZE = 5;
  const visibleRepos = search ? filtered : (showAll ? filtered : filtered.slice(0, PAGE_SIZE));
  const hasMore = !search && filtered.length > PAGE_SIZE && !showAll;

  return (
    <div className="panel">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 4 }}>
        <h2 style={{ margin: 0 }}>
          <span>Available repos</span>
          {!isLoading && repos.length > 0 && (
            <span className="badge muted" style={{ marginLeft: 10, fontSize: "0.78rem", fontWeight: 500 }} title="Total repos fetched from GitHub">
              {repos.length} repos
            </span>
          )}
        </h2>
      </div>
      <p className="muted" style={{ marginBottom: 16 }}>
        Repos you can connect from GitHub. Connect one to start receiving webhook events.
      </p>

      {/* Search box */}
      {!isLoading && !error && repos.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <input
            type="text"
            placeholder="🔍  Search repos by name…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setShowAll(false); }}
            suppressHydrationWarning
            style={{
              width: "100%",
              padding: "10px 14px",
              borderRadius: 10,
              border: "1px solid var(--panel-border)",
              background: "var(--bg)",
              color: "var(--text)",
              fontSize: "0.9rem",
              outline: "none",
              boxSizing: "border-box",
              transition: "border-color 0.2s"
            }}
            onFocus={(e) => (e.target.style.borderColor = "var(--text)")}
            onBlur={(e) => (e.target.style.borderColor = "var(--panel-border)")}
          />
        </div>
      )}

      {isLoading ? (
        <ul className="repo-list">
          {[1, 2, 3].map((n) => (
            <li
              className="repo-card skeleton-card animate-pulse"
              key={n}
              style={{
                height: 110,
                background: "rgba(28, 27, 25, 0.04)",
                border: "1px dashed rgba(28, 27, 25, 0.1)",
                borderRadius: 12
              }}
            >
              {/* Skeleton UI placeholder */}
            </li>
          ))}
        </ul>
      ) : error ? (
        <div style={{ color: "var(--danger, #ff3b30)", padding: 16, background: "rgba(255, 59, 48, 0.08)", borderRadius: 12, fontSize: "0.9rem", border: "1px solid rgba(255, 59, 48, 0.2)" }}>
          {error}
        </div>
      ) : repos.length === 0 ? (
        <ul className="repo-list">
          <li className="repo-card">
            <div className="stack" style={{ gap: 8 }}>
              <strong>No repos loaded yet</strong>
              <span className="repo-meta">Check your GitHub OAuth token and repo scopes.</span>
            </div>
          </li>
        </ul>
      ) : filtered.length === 0 ? (
        <div style={{ padding: "20px 0", textAlign: "center", color: "var(--muted)", fontSize: "0.9rem" }}>
          No repos matching <strong>"{search}"</strong>
        </div>
      ) : (
        <>
          <ul className="repo-list">
            {visibleRepos.map((repo) => {
              const connected = connectedSet.has(repo.fullName);
              return (
                <li className="repo-card" key={repo.id}>
                  <div className="stack" style={{ gap: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <strong>{repo.fullName}</strong>
                      {repo.private && (
                        <span className="badge muted" style={{ fontSize: "10px", padding: "1px 6px" }}>private</span>
                      )}
                    </div>
                    <span className="repo-meta">{repo.description || "No description"}</span>
                    <span className={`badge ${connected ? "success" : "muted"}`}>{connected ? "connected" : "available"}</span>
                  </div>
                  <form action="/api/repos/connect" method="post">
                    <input type="hidden" name="owner" value={repo.owner} />
                    <input type="hidden" name="name" value={repo.name} />
                    <button
                      className="button primary"
                      type="submit"
                      disabled={connected}
                      suppressHydrationWarning
                      style={{ padding: "10px 18px", borderRadius: "10px", fontSize: "0.9rem" }}
                    >
                      {connected ? "Connected" : "Connect"}
                    </button>
                  </form>
                </li>
              );
            })}
          </ul>

          {/* Show more / less toggle */}
          {hasMore && (
            <button
              onClick={() => setShowAll(true)}
              style={{
                marginTop: 12,
                width: "100%",
                padding: "10px",
                borderRadius: 10,
                border: "1px dashed var(--panel-border)",
                background: "transparent",
                color: "var(--muted)",
                fontSize: "0.88rem",
                cursor: "pointer",
                transition: "all 0.2s"
              }}
              onMouseEnter={(e) => {
                (e.target as HTMLButtonElement).style.color = "var(--text)";
                (e.target as HTMLButtonElement).style.borderColor = "var(--text)";
              }}
              onMouseLeave={(e) => {
                (e.target as HTMLButtonElement).style.color = "var(--muted)";
                (e.target as HTMLButtonElement).style.borderColor = "var(--panel-border)";
              }}
            >
              Show {filtered.length - PAGE_SIZE} more repos ↓
            </button>
          )}
          {showAll && filtered.length > PAGE_SIZE && !search && (
            <button
              onClick={() => setShowAll(false)}
              style={{
                marginTop: 12,
                width: "100%",
                padding: "10px",
                borderRadius: 10,
                border: "1px dashed var(--panel-border)",
                background: "transparent",
                color: "var(--muted)",
                fontSize: "0.88rem",
                cursor: "pointer"
              }}
            >
              Show less ↑
            </button>
          )}
        </>
      )}
    </div>
  );
}
