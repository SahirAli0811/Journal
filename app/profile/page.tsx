"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  ArrowLeft,
  BookOpen,
  Check,
  GitBranch,
  LogOut,
  Moon,
  Sun,
  User,
  X,
} from "lucide-react";

import "./profile.css";

type ProfileData = {
  name: string | null;
  email: string | null;
  username: string | null;
  avatar_url: string | null;
  hackclub_id: string | null;
  hackclub_slack_id: string | null;
};

type Connection = {
  connected: boolean;
  label: string;
  username?: string | null;
};

type ProfileResponse = {
  profile: ProfileData;

  connections: {
    hackclub: Connection;
    github: Connection;
    hackatime: Connection;
  };
};

type Theme = "dark" | "light";

function getInitials(name: string | null) {
  if (!name) {
    return "U";
  }

  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 1) {
    return (
      parts[0][0]?.toUpperCase() || "U"
    );
  }

  return (
    `${parts[0][0] || ""}${
      parts[parts.length - 1][0] || ""
    }`.toUpperCase()
  );
}

function ConnectionRow({
  icon,
  title,
  description,
  connection,
  href,
  onDisconnect,
  disconnecting,
  primary = false,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  connection: Connection;
  href?: string;
  onDisconnect?: () => void;
  disconnecting?: boolean;
  primary?: boolean;
}) {
  return (
    <div className="jp-connection">
      <div className="jp-connection-left">
        <div className="jp-connection-icon">
          {icon}
        </div>

        <div className="jp-connection-info">
          <strong>{title}</strong>

          <span>
            {description}
          </span>

          {connection.username ? (
            <small>
              @{connection.username}
            </small>
          ) : null}
        </div>
      </div>

      <div className="jp-connection-right">
        {connection.connected ? (
          <>
            <div className="jp-connected-badge">
              <Check size={13} />
              Connected
            </div>

            {primary ? (
              <span className="jp-primary">
                Primary account
              </span>
            ) : (
              <button
                type="button"
                className="jp-disconnect-button"
                onClick={onDisconnect}
                disabled={disconnecting}
              >
                <X size={13} />

                {disconnecting
                  ? "Disconnecting..."
                  : "Disconnect"}
              </button>
            )}
          </>
        ) : href ? (
          <a
            href={href}
            className="jp-connect-button"
          >
            Connect
          </a>
        ) : (
          <span className="jp-not-connected">
            Not connected
          </span>
        )}
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const [data, setData] =
    useState<ProfileResponse | null>(
      null
    );

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [theme, setTheme] =
    useState<Theme>("dark");

  const [disconnecting, setDisconnecting] =
    useState("");

  useEffect(() => {
    const savedTheme =
      window.localStorage.getItem(
        "journal-theme"
      ) as Theme | null;

    const nextTheme =
      savedTheme === "light"
        ? "light"
        : "dark";

    setTheme(nextTheme);

    document.documentElement.dataset.journalTheme =
      nextTheme;
  }, []);

  useEffect(() => {
    async function loadProfile() {
      try {
        setLoading(true);
        setError("");

        const response =
          await fetch("/api/profile", {
            cache: "no-store",
          });

        const result =
          (await response.json()) as
            | ProfileResponse
            | { error?: string };

        if (!response.ok) {
          throw new Error(
            "error" in result
              ? result.error ||
                  "Failed to load profile"
              : "Failed to load profile"
          );
        }

        setData(
          result as ProfileResponse
        );
      } catch (err) {
        console.error(
          "Profile loading error:",
          err
        );

        setError(
          err instanceof Error
            ? err.message
            : "Failed to load profile"
        );
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, []);

  function changeTheme(
    nextTheme: Theme
  ) {
    setTheme(nextTheme);

    window.localStorage.setItem(
      "journal-theme",
      nextTheme
    );

    document.documentElement.dataset.journalTheme =
      nextTheme;
  }

  async function disconnect(
    provider: "github" | "hackatime"
  ) {
    try {
      setDisconnecting(provider);

      const response =
        await fetch(
          "/api/profile/disconnect",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              provider,
            }),
          }
        );

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result?.error ||
            "Failed to disconnect"
        );
      }

      setData((current) => {
        if (!current) {
          return current;
        }

        return {
          ...current,
          connections: {
            ...current.connections,

            [provider]: {
              ...current.connections[
                provider
              ],
              connected: false,
            },
          },
        };
      });
    } catch (err) {
      console.error(
        "Disconnect error:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Failed to disconnect account"
      );
    } finally {
      setDisconnecting("");
    }
  }

  const profile = data?.profile;

  const connections =
    data?.connections;

  const initials = getInitials(
    profile?.name || null
  );

  if (loading) {
    return (
      <main className="jp-page">
        <aside className="jp-sidebar">
          <div className="jp-brand">
            <div className="jp-brand-icon">
              <BookOpen size={17} />
            </div>

            <span>Journal</span>
          </div>
        </aside>

        <section className="jp-main">
          <div className="jp-loading">
            Loading profile...
          </div>
        </section>
      </main>
    );
  }

  if (error && !data) {
    return (
      <main className="jp-page">
        <aside className="jp-sidebar">
          <div className="jp-brand">
            <div className="jp-brand-icon">
              <BookOpen size={17} />
            </div>

            <span>Journal</span>
          </div>
        </aside>

        <section className="jp-main">
          <div className="jp-error">
            <strong>
              Could not load your profile
            </strong>

            <span>{error}</span>

            <a href="/dashboard">
              Back to dashboard
            </a>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="jp-page">
      <aside className="jp-sidebar">
        <div className="jp-brand">
          <div className="jp-brand-icon">
            <BookOpen size={17} />
          </div>

          <span>Journal</span>
        </div>

        <nav className="jp-nav">
          <a
            href="/dashboard"
            className="jp-nav-item"
          >
            <BookOpen size={16} />
            <span>Dashboard</span>
          </a>

          <a
            href="/journal"
            className="jp-nav-item"
          >
            <BookOpen size={16} />
            <span>Journal</span>
          </a>

          <a
            href="/settings"
            className="jp-nav-item jp-nav-active"
          >
            <User size={16} />
            <span>Settings</span>
          </a>
        </nav>

        <div className="jp-sidebar-bottom">
          <a
            href="/profile"
            className="jp-profile-link jp-profile-link-active"
          >
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt=""
                className="jp-sidebar-avatar"
              />
            ) : (
              <div className="jp-sidebar-avatar jp-sidebar-avatar-placeholder">
                {initials}
              </div>
            )}

            <div className="jp-profile-info">
              <strong>
                {profile?.name ||
                  "Builder"}
              </strong>

              <small>
                {profile?.username
                  ? `@${profile.username}`
                  : "View profile"}
              </small>
            </div>
          </a>

          <a
            href="/api/auth/logout"
            className="jp-logout"
          >
            <LogOut size={15} />
            <span>Logout</span>
          </a>
        </div>
      </aside>

      <section className="jp-main">
        <header className="jp-header">
          <div>
            <p className="jp-eyebrow">
              YOUR ACCOUNT
            </p>

            <h1>
              Profile &{" "}
              <span>Account</span>
            </h1>

            <p className="jp-subtitle">
              Manage your Journal identity,
              connected accounts and appearance.
            </p>
          </div>

          <a
            href="/dashboard"
            className="jp-back-button"
          >
            <ArrowLeft size={14} />
            Dashboard
          </a>
        </header>

        {error ? (
          <div className="jp-inline-error">
            {error}
          </div>
        ) : null}

        <section className="jp-card jp-profile-card">
          <div className="jp-profile-header">
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt=""
                className="jp-large-avatar"
              />
            ) : (
              <div className="jp-large-avatar jp-large-avatar-placeholder">
                {initials}
              </div>
            )}

            <div>
              <p className="jp-section-label">
                PROFILE
              </p>

              <h2>
                {profile?.name ||
                  "Builder"}
              </h2>

              <p>
                {profile?.email ||
                  "No email available"}
              </p>

              {profile?.username ? (
                <span className="jp-username">
                  @{profile.username}
                </span>
              ) : null}
            </div>
          </div>

          <div className="jp-info-grid">
            <div className="jp-info-item">
              <span>Name</span>

              <strong>
                {profile?.name ||
                  "Not available"}
              </strong>
            </div>

            <div className="jp-info-item">
              <span>Email</span>

              <strong>
                {profile?.email ||
                  "Not available"}
              </strong>
            </div>

            <div className="jp-info-item">
              <span>GitHub</span>

              <strong>
                {profile?.username
                  ? `@${profile.username}`
                  : "Not connected"}
              </strong>
            </div>

            <div className="jp-info-item">
              <span>Slack ID</span>

              <strong>
                {profile?.hackclub_slack_id ||
                  "Not available"}
              </strong>
            </div>
          </div>
        </section>

        <section className="jp-card">
          <div className="jp-card-heading">
            <div>
              <p className="jp-section-label">
                AUTHENTICATION
              </p>

              <h2>
                Connected accounts
              </h2>

              <p>
                These accounts power your
                Journal experience.
              </p>
            </div>
          </div>

          <div className="jp-connections">
            {connections ? (
              <>
                <ConnectionRow
                  title="Hack Club"
                  description="Your primary Journal account"
                  connection={
                    connections.hackclub
                  }
                  icon={
                    <BookOpen size={18} />
                  }
                  primary
                />

                <ConnectionRow
                  title="GitHub"
                  description="Repositories and publishing"
                  connection={
                    connections.github
                  }
                  icon={
                    <GitBranch size={18} />
                  }
                  href="/auth/github"
                  onDisconnect={() =>
                    disconnect("github")
                  }
                  disconnecting={
                    disconnecting ===
                    "github"
                  }
                />

                <ConnectionRow
                  title="Hackatime"
                  description="Coding time and project activity"
                  connection={
                    connections.hackatime
                  }
                  icon={
                    <span className="jp-hackatime-icon">
                      H
                    </span>
                  }
                  href="/auth/hackatime"
                  onDisconnect={() =>
                    disconnect(
                      "hackatime"
                    )
                  }
                  disconnecting={
                    disconnecting ===
                    "hackatime"
                  }
                />
              </>
            ) : null}
          </div>
        </section>

        <section className="jp-card">
          <div className="jp-card-heading">
            <div>
              <p className="jp-section-label">
                APPEARANCE
              </p>

              <h2>
                Theme
              </h2>

              <p>
                Choose how Journal looks for you.
              </p>
            </div>
          </div>

          <div className="jp-theme-options">
            <button
              type="button"
              className={`jp-theme-option ${
                theme === "dark"
                  ? "jp-theme-option-active"
                  : ""
              }`}
              onClick={() =>
                changeTheme("dark")
              }
            >
              <div className="jp-theme-icon">
                <Moon size={18} />
              </div>

              <div>
                <strong>
                  Dark
                </strong>

                <span>
                  The default Journal experience
                </span>
              </div>

              {theme === "dark" ? (
                <Check size={17} />
              ) : null}
            </button>

            <button
              type="button"
              className={`jp-theme-option ${
                theme === "light"
                  ? "jp-theme-option-active"
                  : ""
              }`}
              onClick={() =>
                changeTheme("light")
              }
            >
              <div className="jp-theme-icon">
                <Sun size={18} />
              </div>

              <div>
                <strong>
                  Light
                </strong>

                <span>
                  A brighter Journal interface
                </span>
              </div>

              {theme === "light" ? (
                <Check size={17} />
              ) : null}
            </button>
          </div>
        </section>

        <section className="jp-danger-card">
          <div>
            <p className="jp-section-label">
              SESSION
            </p>

            <h2>
              Sign out of Journal
            </h2>

            <p>
              Sign out from this device and
              return to the Journal landing page.
            </p>
          </div>

          <a
            href="/api/auth/logout"
            className="jp-danger-button"
          >
            <LogOut size={15} />
            Logout
          </a>
        </section>

        <footer className="jp-footer">
          Journal · Your building journey
        </footer>
      </section>
    </main>
  );
}