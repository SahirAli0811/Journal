"use client";

import "./dashboard.css";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  BarChart3,
  BookOpen,
  ChevronDown,
  Clock3,
  Code2,
  FolderKanban,
  LogOut,
  RefreshCw,
  Settings,
  User,
} from "lucide-react";

type Project = {
  name: string;
  total_seconds: number;
  languages?: string[];
  archived?: boolean;
  most_recent_heartbeat?: string | null;
};

type BreakdownItem = {
  name: string;
  seconds: number;
};

type DashboardData = {
  profile?: {
    name?: string | null;
    email?: string | null;
    username?: string | null;
    avatar_url?: string | null;
    slack_id?: string | null;
  };

  filters?: {
    selected?: {
      range?: string;
      project?: string;
      language?: string;
    };

    options?: {
      projects?: string[];
      languages?: string[];
    };
  };

  stats?: {
    totalSeconds?: number;

    topProject?: {
      name: string;
      seconds: number;
    } | null;

    topLanguage?: {
      name: string;
      seconds: number;
    } | null;

    projects?: number;

    streakDays?: number;
  };

  projects?: Project[];

  projectDurations?: BreakdownItem[];

  languages?: BreakdownItem[];

  dateRange?: {
    range?: string;
    startDate?: string;
    endDate?: string;
  };
};

function formatTime(seconds: number) {
  if (!seconds || seconds < 1) {
    return "0m";
  }

  const hours = Math.floor(
    seconds / 3600
  );

  const minutes = Math.floor(
    (seconds % 3600) / 60
  );

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  return `${minutes}m`;
}

function formatDetailedTime(
  seconds: number
) {
  if (!seconds || seconds < 1) {
    return "0m";
  }

  const hours = Math.floor(
    seconds / 3600
  );

  const minutes = Math.floor(
    (seconds % 3600) / 60
  );

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  return `${minutes}m`;
}

function FilterSelect({
  label,
  icon,
  value,
  options,
  onChange,
}: {
  label: string;
  icon: React.ReactNode;
  value: string;
  options: Array<{
    value: string;
    label: string;
  }>;
  onChange: (value: string) => void;
}) {
  return (
    <label className="jd-filter">
      <span className="jd-filter-label">
        {label}
      </span>

      <span className="jd-filter-control">
        <span className="jd-filter-icon">
          {icon}
        </span>

        <select
          value={value}
          onChange={(event) =>
            onChange(event.target.value)
          }
        >
          {options.map((option) => (
            <option
              key={option.value}
              value={option.value}
            >
              {option.label}
            </option>
          ))}
        </select>

        <ChevronDown
          size={14}
          className="jd-filter-chevron"
        />
      </span>
    </label>
  );
}

function StatCard({
  label,
  value,
  description,
  icon,
}: {
  label: string;
  value: string;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <article className="jd-stat-card">
      <div className="jd-stat-top">
        <span>{label}</span>

        <div className="jd-stat-icon">
          {icon}
        </div>
      </div>

      <strong>{value}</strong>

      <small>{description}</small>
    </article>
  );
}

export default function DashboardPage() {
  const [data, setData] =
    useState<DashboardData | null>(
      null
    );

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [range, setRange] =
    useState("today");

  const [project, setProject] =
    useState("all");

  const [language, setLanguage] =
    useState("all");

  /*
   * ---------------------------------------------------------
   * SHARED THEME
   * Reads the same theme selected on the Profile page.
   * ---------------------------------------------------------
   */
  useEffect(() => {
    const savedTheme =
      window.localStorage.getItem(
        "journal-theme"
      );

    const theme =
      savedTheme === "light"
        ? "light"
        : "dark";

    document.documentElement.dataset.journalTheme =
      theme;
  }, []);

  async function loadDashboard() {
    try {
      setLoading(true);
      setError("");

      const params =
        new URLSearchParams();

      params.set("range", range);

      if (project !== "all") {
        params.set(
          "project",
          project
        );
      }

      if (language !== "all") {
        params.set(
          "language",
          language
        );
      }

      const response =
        await fetch(
          `/api/dashboard?${params.toString()}`,
          {
            cache: "no-store",
          }
        );

      const contentType =
        response.headers.get(
          "content-type"
        ) || "";

      if (!response.ok) {
        const text =
          await response.text();

        throw new Error(
          `Dashboard API failed (${response.status}): ${text.slice(
            0,
            300
          )}`
        );
      }

      if (
        !contentType.includes(
          "application/json"
        )
      ) {
        const text =
          await response.text();

        throw new Error(
          `Dashboard API returned non-JSON data: ${text.slice(
            0,
            300
          )}`
        );
      }

      const result =
        (await response.json()) as DashboardData;

      setData(result);
    } catch (err) {
      console.error(
        "Dashboard error:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Could not load dashboard."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, [
    range,
    project,
    language,
  ]);

  const projects = useMemo(() => {
    return (
      data?.projects || []
    ).filter(
      (item) => !item.archived
    );
  }, [data]);

  const projectDurations =
    useMemo(() => {
      return (
        data?.projectDurations || []
      );
    }, [data]);

  const languages =
    useMemo(() => {
      return data?.languages || [];
    }, [data]);

  const maxProjectSeconds =
    Math.max(
      ...projectDurations.map(
        (item) => item.seconds
      ),
      1
    );

  const maxLanguageSeconds =
    Math.max(
      ...languages.map(
        (item) => item.seconds
      ),
      1
    );

  const totalSeconds =
    Number(
      data?.stats?.totalSeconds || 0
    );

  const topProject =
    data?.stats?.topProject?.name ||
    "—";

  const topLanguage =
    data?.stats?.topLanguage?.name ||
    "—";

  const profileName =
    data?.profile?.name ||
    "Builder";

  const profileEmail =
    data?.profile?.email ||
    "";

  const profileUsername =
    data?.profile?.username ||
    "";

  const profileAvatar =
    data?.profile?.avatar_url ||
    "";

  const projectOptions = [
    {
      value: "all",
      label: "All Projects",
    },

    ...(
      data?.filters?.options
        ?.projects || []
    ).map((item) => ({
      value: item,
      label: item,
    })),
  ];

  const languageOptions = [
    {
      value: "all",
      label: "All Languages",
    },

    ...(
      data?.filters?.options
        ?.languages || []
    ).map((item) => ({
      value: item,
      label: item,
    })),
  ];

  return (
    <div className="jd-dashboard">
      {/* SIDEBAR */}

      <aside className="jd-sidebar">
        <div className="jd-brand">
          <div className="jd-brand-icon">
            <BookOpen size={17} />
          </div>

          <span>Journal</span>
        </div>

        <nav className="jd-nav">
          <a
            href="/dashboard"
            className="jd-nav-item jd-nav-active"
          >
            <BarChart3 size={16} />
            <span>Dashboard</span>
          </a>

          <a
            href="/journal"
            className="jd-nav-item"
          >
            <BookOpen size={16} />
            <span>Journal</span>
          </a>

          <a
            href="/profile"
            className="jd-nav-item"
          >
            <Settings size={16} />
            <span>Settings</span>
          </a>
        </nav>

        <div className="jd-sidebar-spacer" />

        <a
          href="/profile"
          className="jd-profile"
        >
          {profileAvatar ? (
            <img
              src={profileAvatar}
              alt={profileName}
              className="jd-profile-avatar"
            />
          ) : (
            <div className="jd-profile-placeholder">
              <User size={17} />
            </div>
          )}

          <div className="jd-profile-info">
            <strong>
              {profileName}
            </strong>

            <span>
              {profileUsername
                ? `@${profileUsername}`
                : profileEmail ||
                "View profile"}
            </span>
          </div>
        </a>

        <a
          href="/api/auth/logout"
          className="jd-logout"
        >
          <LogOut size={15} />
          <span>Logout</span>
        </a>
      </aside>

      {/* MAIN */}

      <main className="jd-main">
        <header className="jd-header">
          <div>
            <p className="jd-eyebrow">
              YOUR BUILDING JOURNEY
            </p>

            <h1>
              Keep Track of{" "}
              <span>
                Your Coding Time
              </span>
            </h1>

            <p className="jd-description">
              Your projects, coding
              sessions and everything
              you build, all in one place.
            </p>
          </div>

          <button
            className="jd-refresh"
            onClick={loadDashboard}
            disabled={loading}
          >
            <RefreshCw
              size={14}
              className={
                loading
                  ? "jd-spin"
                  : ""
              }
            />

            Refresh
          </button>
        </header>

        {error && (
          <div className="jd-error">
            <strong>
              Could not load dashboard
            </strong>

            <span>{error}</span>

            <button
              onClick={loadDashboard}
            >
              Try again
            </button>
          </div>
        )}

        {/* FILTERS */}

        <section className="jd-filters">
          <FilterSelect
            label="DATE RANGE"
            icon={
              <Clock3 size={14} />
            }
            value={range}
            onChange={setRange}
            options={[
              {
                value: "today",
                label: "Today",
              },
              {
                value: "week",
                label: "This Week",
              },
              {
                value: "month",
                label: "This Month",
              },
              {
                value: "year",
                label: "This Year",
              },
              {
                value: "all",
                label: "All Time",
              },
            ]}
          />

          <FilterSelect
            label="PROJECT"
            icon={
              <FolderKanban
                size={14}
              />
            }
            value={project}
            onChange={setProject}
            options={projectOptions}
          />

          <FilterSelect
            label="LANGUAGE"
            icon={
              <Code2 size={14} />
            }
            value={language}
            onChange={setLanguage}
            options={languageOptions}
          />
        </section>

        {/* STAT CARDS */}

        <section className="jd-stats">
          <StatCard
            label="TOTAL TIME"
            value={
              loading
                ? "..."
                : formatTime(
                  totalSeconds
                )
            }
            description={
              range === "today"
                ? "Hackatime today"
                : "Hackatime coding time"
            }
            icon={
              <Clock3 size={15} />
            }
          />

          <StatCard
            label="TOP PROJECT"
            value={topProject}
            description="Most active project"
            icon={
              <FolderKanban
                size={15}
              />
            }
          />

          <StatCard
            label="TOP LANGUAGE"
            value={topLanguage}
            description="Most used language"
            icon={
              <Code2 size={15} />
            }
          />

          <StatCard
            label="PROJECTS"
            value={String(
              data?.stats?.projects ||
              projects.length
            )}
            description="Active projects"
            icon={
              <BookOpen size={15} />
            }
          />
        </section>

        {/* DATA */}

        <section className="jd-data-grid">
          {/* PROJECTS */}

          <article className="jd-panel jd-project-panel">
            <div className="jd-panel-header">
              <div>
                <p>
                  ACTIVITY
                </p>

                <h2>
                  Project Durations
                </h2>
              </div>

              <span>
                {projectDurations.length}{" "}
                projects
              </span>
            </div>

            <div className="jd-project-list">
              {projectDurations.length ===
                0 ? (
                <div className="jd-empty">
                  No project data
                  available.
                </div>
              ) : (
                projectDurations.map(
                  (item) => {
                    const width =
                      Math.max(
                        2,
                        (item.seconds /
                          maxProjectSeconds) *
                        100
                      );

                    return (
                      <div
                        className="jd-project-row"
                        key={item.name}
                      >
                        <div className="jd-project-name">
                          {item.name}
                        </div>

                        <div className="jd-bar">
                          <div
                            className="jd-bar-fill"
                            style={{
                              width: `${width}%`,
                            }}
                          />
                        </div>

                        <div className="jd-project-time">
                          {formatDetailedTime(
                            item.seconds
                          )}
                        </div>
                      </div>
                    );
                  }
                )
              )}
            </div>
          </article>

          {/* LANGUAGES */}

          <article className="jd-panel jd-language-panel">
            <div className="jd-panel-header">
              <div>
                <p>
                  BREAKDOWN
                </p>

                <h2>
                  Languages
                </h2>
              </div>

              <div className="jd-panel-code">
                <Code2 size={15} />
              </div>
            </div>

            <div className="jd-language-list">
              {languages.length ===
                0 ? (
                <div className="jd-empty">
                  No language data
                  available.
                </div>
              ) : (
                languages
                  .slice(0, 10)
                  .map((item) => {
                    const width =
                      Math.max(
                        3,
                        (item.seconds /
                          maxLanguageSeconds) *
                        100
                      );

                    return (
                      <div
                        className="jd-language-row"
                        key={item.name}
                      >
                        <span>
                          {item.name}
                        </span>

                        <div className="jd-language-bar">
                          <div
                            style={{
                              width: `${width}%`,
                            }}
                          />
                        </div>

                        <strong>
                          {formatDetailedTime(
                            item.seconds
                          )}
                        </strong>
                      </div>
                    );
                  })
              )}
            </div>
          </article>
        </section>

        {/* PROFILE INFO */}

        <section className="jd-account-strip">
          <div className="jd-account-avatar">
            {profileAvatar ? (
              <img
                src={profileAvatar}
                alt={profileName}
              />
            ) : (
              <User size={19} />
            )}
          </div>

          <div>
            <strong>
              {profileName}
            </strong>

            <span>
              {profileEmail ||
                "Hack Club account connected"}
            </span>
          </div>

          <a href="/profile">
            View profile
          </a>
        </section>
      </main>
    </div>
  );
}