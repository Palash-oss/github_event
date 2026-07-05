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

  return (
    <div className="panel">
      <h2>
        <span>Available repos</span>
      </h2>
      <p className="muted" style={{ marginBottom: 20 }}>
        Repos you can connect from GitHub. The form posts to the webhook setup route.
      </p>

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
      ) : (
        <ul className="repo-list">
          {repos.slice(0, 20).map((repo) => {
            const connected = connectedSet.has(repo.fullName);
            return (
              <li className="repo-card" key={repo.id}>
                <div className="stack" style={{ gap: 8 }}>
                  <strong>{repo.fullName}</strong>
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
      )}
    </div>
  );
}
