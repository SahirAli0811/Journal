"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Home,
  BookOpen,
  Settings,
  LogOut,
  RefreshCw,
  ChevronDown,
  Clock3,
  Code2,
  CalendarDays,
  Filter,
  User,
  FolderKanban,
} from "lucide-react";

import ProjectList from "@/components/dashboard/ProjectList";

type Project = {
  name: string;
  total_seconds: number;
  most_recent_heartbeat: string | null;
  languages: string[];
  archived: boolean;
};

type Profile = {
  name: string;
  username: string;
  avatar: string;
};

type FilterRange = "all" | "today" | "yesterday" | "week" | "month";

function formatTime(seconds: number) {
  if (!seconds || seconds < 60) return "0m";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export default function DashboardPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [dateRange, setDateRange] = useState<FilterRange>("all");
  const [selectedProject, setSelectedProject] = useState("all");
  const [selectedLanguage, setSelectedLanguage] = useState("all");

  async function loadDashboard() {
    try {
      setError("");

      const [projectsRes, profileRes] = await Promise.all([
        fetch("/api/hackatime/projects", { cache: "no-store" }),
        fetch("/api/dashboard/profile", { cache: "no-store" }),
      ]);

      const projectsData = await projectsRes.json();
      if (!projectsRes.ok) throw new Error(projectsData.error || "Failed to load projects");
      setProjects(projectsData.projects || []);

      if (profileRes.ok) {
        const profileData = await profileRes.json();
        setProfile(profileData);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { loadDashboard(); }, []);

  function refresh() {
    setRefreshing(true);
    loadDashboard();
  }

  const active = useMemo(() => projects.filter((p) => !p.archived), [projects]);

  const availableProjects = useMemo(() => active.map((p) => p.name), [active]);

  const availableLanguages = useMemo(() => {
    const set = new Set<string>();
    active.forEach((p) => p.languages.forEach((l) => set.add(l)));
    return Array.from(set).sort();
  }, [active]);

  const filteredProjects = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().slice(0, 10);
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 6);

    return active.filter((p) => {
      if (selectedProject !== "all" && p.name !== selectedProject) return false;
      if (selectedLanguage !== "all" && !p.languages.includes(selectedLanguage)) return false;

      if (dateRange !== "all" && p.most_recent_heartbeat) {
        const hb = p.most_recent_heartbeat.slice(0, 10);
        if (dateRange === "today" && hb !== todayStr) return false;
        if (dateRange === "yesterday" && hb !== yesterdayStr) return false;
        if (dateRange === "week" && hb < weekAgo.toISOString().slice(0, 10)) return false;
        if (dateRange === "month" && hb.slice(0, 7) !== todayStr.slice(0, 7)) return false;
      }

      return true;
    });
  }, [active, selectedProject, selectedLanguage, dateRange]);

  const totalTime = useMemo(
    () => filteredProjects.reduce((s, p) => s + p.total_seconds, 0),
    [filteredProjects]
  );

  const topProject = useMemo(
    () => [...filteredProjects].sort((a, b) => b.total_seconds - a.total_seconds)[0] ?? null,
    [filteredProjects]
  );

  const languageData = useMemo(() => {
    const map = new Map<string, number>();
    filteredProjects.forEach((p) =>
      p.languages.forEach((l) => map.set(l, (map.get(l) ?? 0) + p.total_seconds))
    );
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([name, seconds]) => ({ name, seconds }));
  }, [filteredProjects]);

  const maxProjectTime = useMemo(
    () => Math.max(...filteredProjects.map((p) => p.total_seconds), 1),
    [filteredProjects]
  );

  const DONUT_COLORS = ["#ff6b18", "#ffd928", "#c7d600", "#dceb20", "#f45113", "#ff9f43", "#6c8cff", "#c45acb"];

  const donutStyle = useMemo(() => {
    if (!languageData.length) return { background: "conic-gradient(#302729 0deg 360deg)" };
    const total = languageData.reduce((s, i) => s + i.seconds, 0);
    let cur = 0;
    const stops = languageData.map((item, i) => {
      const pct = (item.seconds / total) * 100;
      const start = cur;
      cur += pct;
      return `${DONUT_COLORS[i % DONUT_COLORS.length]} ${start}% ${cur}%`;
    });
    return { background: `conic-gradient(${stops.join(", ")})` };
  }, [languageData]);

  if (loading) {
    return (
      <main className="dashboard-loading-screen">
        <div><Clock3 size={32} /><p>Loading your journal…</p></div>
      </main>
    );
  }

  return (
    <main className="dashboard-page">
      <aside className="dashboard-sidebar">
        <div className="sidebar-user">
          <div className="sidebar-avatar">
            {profile?.avatar
              ? <img src={profile.avatar} alt={profile.name || profile.username} />
              : <User size={18} />}
          </div>
          <div className="sidebar-user-info">
            <strong>{profile?.name || profile?.username || "GitHub User"}</strong>
            <span>{profile?.username ? `@${profile.username}` : "Not connected"}</span>
          </div>
        </div>

        <nav className="dashboard-nav">
          <a href="/dashboard" className="active"><Home size={17} /><span>Home</span></a>
          <a href="#projects"><FolderKanban size={17} /><span>Projects</span></a>
          <a href="#journal"><BookOpen size={17} /><span>Journal</span></a>
          <a href="#settings"><Settings size={17} /><span>Settings</span></a>
        </nav>

        <div className="sidebar-bottom">
          <a href="/api/auth/logout"><LogOut size={15} />Logout</a>
        </div>
      </aside>

      <section className="dashboard-main">
        <header className="dashboard-header">
          <div>
            <p className="dashboard-eyebrow">YOUR BUILDING JOURNEY</p>
            <h1>Keep Track of <span>Your Coding Time</span></h1>
            <p className="dashboard-subtitle">Your projects, coding sessions and everything you build, all in one place.</p>
          </div>
          <button className="dashboard-refresh" onClick={refresh} disabled={refreshing}>
            <RefreshCw size={15} className={refreshing ? "spin" : ""} />
            {refreshing ? "Refreshing…" : "Refresh"}
          </button>
        </header>

        {error && <div className="dashboard-error">{error}</div>}

        <section className="dashboard-filters">
          <div className="filter-title"><Filter size={14} />Filters</div>

          <div className="filter-group">
            <label><CalendarDays size={11} />Date Range</label>
            <div className="select-wrapper">
              <select value={dateRange} onChange={(e) => setDateRange(e.target.value as FilterRange)}>
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="yesterday">Yesterday</option>
                <option value="week">Last 7 Days</option>
                <option value="month">This Month</option>
              </select>
              <ChevronDown size={13} />
            </div>
          </div>

          <div className="filter-group">
            <label><FolderKanban size={11} />Project</label>
            <div className="select-wrapper">
              <select value={selectedProject} onChange={(e) => setSelectedProject(e.target.value)}>
                <option value="all">All Projects</option>
                {availableProjects.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
              <ChevronDown size={13} />
            </div>
          </div>

          <div className="filter-group">
            <label><Code2 size={11} />Language</label>
            <div className="select-wrapper">
              <select value={selectedLanguage} onChange={(e) => setSelectedLanguage(e.target.value)}>
                <option value="all">All Languages</option>
                {availableLanguages.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
              <ChevronDown size={13} />
            </div>
          </div>
        </section>

        <section className="dashboard-stats">
          <article className="stat-card highlight">
            <span>Total Time</span>
            <strong>{formatTime(totalTime)}</strong>
            <small>Based on selected filters</small>
          </article>
          <article className="stat-card">
            <span>Top Project</span>
            <strong>{topProject?.name || "—"}</strong>
            <small>{topProject ? formatTime(topProject.total_seconds) : "No activity"}</small>
          </article>
          <article className="stat-card">
            <span>Projects</span>
            <strong>{filteredProjects.length}</strong>
            <small>In current view</small>
          </article>
          <article className="stat-card">
            <span>Languages</span>
            <strong>{languageData.length}</strong>
            <small>Languages tracked</small>
          </article>
        </section>

        <section className="dashboard-chart-grid">
          <article className="dashboard-panel">
            <div className="panel-header">
              <div><p>ACTIVITY</p><h2>Project Durations</h2></div>
              <Clock3 size={18} />
            </div>
            <div className="duration-list">
              {filteredProjects.length === 0
                ? <p className="empty-chart">No data for these filters.</p>
                : [...filteredProjects]
                    .sort((a, b) => b.total_seconds - a.total_seconds)
                    .map((p) => (
                      <div className="duration-row" key={p.name}>
                        <span className="duration-name" title={p.name}>{p.name}</span>
                        <div className="duration-bar">
                          <i style={{ width: `${Math.max(3, (p.total_seconds / maxProjectTime) * 100)}%` }} />
                        </div>
                        <strong>{formatTime(p.total_seconds)}</strong>
                      </div>
                    ))}
            </div>
          </article>

          <article className="dashboard-panel">
            <div className="panel-header">
              <div><p>BREAKDOWN</p><h2>Languages</h2></div>
              <Code2 size={18} />
            </div>
            <div className="language-chart">
              <div className="language-donut" style={donutStyle}>
                <div className="donut-hole">
                  <strong>{formatTime(totalTime)}</strong>
                  <span>Total</span>
                </div>
              </div>
            </div>
            <div className="chart-legend">
              {languageData.slice(0, 8).map((l, i) => (
                <span key={l.name}>
                  <i style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }} />
                  {l.name}
                </span>
              ))}
            </div>
          </article>
        </section>

        <section id="projects" className="dashboard-projects">
          <ProjectList />
        </section>

        <section id="journal" className="dashboard-journal-placeholder">
          <BookOpen size={22} />
          <div>
            <h2>Your Journal</h2>
            <p>Your project notes, memories and building sessions will appear here.</p>
          </div>
        </section>

        <section id="settings" className="dashboard-journal-placeholder">
          <Settings size={22} />
          <div>
            <h2>Settings</h2>
            <p>Account and integration settings will appear here.</p>
          </div>
        </section>
      </section>
    </main>
  );
}