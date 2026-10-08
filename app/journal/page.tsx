"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  CalendarDays,
  ChevronDown,
  Clock3,
  GitBranch,
  LayoutDashboard,
  LoaderCircle,
  LogOut,
  Plus,
  Settings,
  User,
  X,
} from "lucide-react";
import "./journal.css";
type JournalBook = {
  id: string;
  user_id: string;
  name: string;
  ysws: string;
  github_repo: string | null;
  github_url: string | null;
  tracking_mode: "hackatime" | "manual";
  hackatime_project: string | null;
  last_hackatime_seconds?: number;
  created_at: string;
  updated_at: string;
};
type HackatimeProject = {
  name: string;
  total_seconds: number;
  most_recent_heartbeat?: string | null;
  languages?: string[];
  archived?: boolean;
};
type GithubRepository = {
  id: number;
  name: string;
  full_name: string;
  html_url: string;
  private: boolean;
  description?: string | null;
  default_branch?: string;
};
type Profile = {
  name?: string | null;
  email?: string | null;
  username?: string | null;
  avatar_url?: string | null;
};
async function readJsonResponse(response: Response) {
  const text = await response.text();
  if (!text.trim()) {
    throw new Error(
      `The server returned an empty response (HTTP ${response.status}).`,
    );
  }
  try {
    return JSON.parse(text);
  } catch {
    console.error("Invalid JSON response:", text);
    throw new Error(
      `The server returned invalid JSON (HTTP ${response.status}).`,
    );
  }
}
function formatTime(seconds: number) {
  if (!seconds || seconds < 1) {
    return "0m";
  }
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}
function formatDate(date: string) {
  try {
    return new Intl.DateTimeFormat("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(date));
  } catch {
    return date;
  }
}
export default function JournalPage() {
  const [books, setBooks] = useState<JournalBook[]>([]);
  const [hackatimeProjects, setHackatimeProjects] = useState<
    HackatimeProject[]
  >([]);
  const [githubRepositories, setGithubRepositories] = useState<
    GithubRepository[]
  >([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [githubRepositoriesLoading, setGithubRepositoriesLoading] =
    useState(false);
  const [githubRepositoriesError, setGithubRepositoriesError] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [ysws, setYsws] = useState("");
  const [trackingMode, setTrackingMode] = useState<"hackatime" | "manual">(
    "hackatime",
  );
  const [hackatimeProject, setHackatimeProject] = useState("");
  const [githubRepo, setGithubRepo] = useState("");
  const [formError, setFormError] = useState("");
  const activeHackatimeProjects = useMemo(() => {
    return hackatimeProjects.filter((project) => !project.archived);
  }, [hackatimeProjects]);
  const selectedGithubRepository = useMemo(() => {
    return githubRepositories.find(
      (repository) => repository.full_name === githubRepo,
    );
  }, [githubRepositories, githubRepo]);
  const selectedHackatimeProject = useMemo(() => {
    return activeHackatimeProjects.find(
      (project) => project.name === hackatimeProject,
    );
  }, [activeHackatimeProjects, hackatimeProject]);
  async function loadBooks() {
    try {
      const response = await fetch("/api/journal/books", {
        cache: "no-store",
      });
      const data = await readJsonResponse(response);
      if (!response.ok) {
        throw new Error(data?.error || "Failed to load journal books.");
      }
      setBooks(Array.isArray(data?.books) ? data.books : []);
    } catch (error) {
      console.error("Journal books error:", error);
      setBooks([]);
    }
  }
  async function loadHackatimeProjects() {
    try {
      const response = await fetch("/api/hackatime/projects", {
        cache: "no-store",
      });
      const data = await readJsonResponse(response);
      if (!response.ok) {
        throw new Error(data?.error || "Failed to load Hackatime projects.");
      }
      setHackatimeProjects(Array.isArray(data?.projects) ? data.projects : []);
    } catch (error) {
      console.error("Hackatime projects error:", error);
      setHackatimeProjects([]);
    }
  }
  async function loadProfile() {
    try {
      const response = await fetch("/api/profile", {
        cache: "no-store",
      });
      if (!response.ok) {
        return;
      }
      const data = await readJsonResponse(response);
      setProfile(data?.profile ?? data?.user ?? null);
    } catch (error) {
      console.error("Profile loading error:", error);
    }
  }
  const loadGithubRepositories = useCallback(async () => {
    setGithubRepositoriesLoading(true);
    setGithubRepositoriesError("");
    try {
      const response = await fetch("/api/github/repositories", {
        method: "GET",
        cache: "no-store",
      });
      const data = await readJsonResponse(response);
      console.log("GitHub repositories response:", data);
      if (!response.ok) {
        throw new Error(
          data?.error ||
            `Failed to load GitHub repositories (HTTP ${response.status}).`,
        );
      }
      const repositories = Array.isArray(data?.repositories)
        ? data.repositories
        : Array.isArray(data?.repos)
          ? data.repos
          : [];
      setGithubRepositories(repositories);
      if (repositories.length === 0) {
        setGithubRepositoriesError("No GitHub repositories were found.");
      }
    } catch (error) {
      console.error("GitHub repositories error:", error);
      setGithubRepositories([]);
      setGithubRepositoriesError(
        error instanceof Error
          ? error.message
          : "Failed to load GitHub repositories.",
      );
    } finally {
      setGithubRepositoriesLoading(false);
    }
  }, []);
  async function loadPage() {
    setLoading(true);
    await Promise.allSettled([
      loadBooks(),
      loadHackatimeProjects(),
      loadProfile(),
    ]);
    setLoading(false);
  }
  useEffect(() => {
    void loadPage();
  }, []);
  useEffect(() => {
    const savedTheme = window.localStorage.getItem("journal-theme");
    const theme = savedTheme === "light" ? "light" : "dark";
    document.documentElement.dataset.journalTheme = theme;
  }, []);
  useEffect(() => {
    if (!showCreateModal) {
      return;
    }
    setGithubRepositoriesError("");
    void loadGithubRepositories();
  }, [showCreateModal, loadGithubRepositories]);
  useEffect(() => {
    if (
      trackingMode === "hackatime" &&
      !hackatimeProject &&
      activeHackatimeProjects.length > 0
    ) {
      setHackatimeProject(activeHackatimeProjects[0].name);
    }
    if (trackingMode === "manual") {
      setHackatimeProject("");
    }
  }, [trackingMode, activeHackatimeProjects, hackatimeProject]);
  function resetCreateForm() {
    setProjectName("");
    setYsws("");
    setTrackingMode("hackatime");
    setHackatimeProject(activeHackatimeProjects[0]?.name || "");
    setGithubRepo("");
    setFormError("");
    setGithubRepositoriesError("");
  }
  function openCreateModal() {
    resetCreateForm();
    setShowCreateModal(true);
  }
  function closeCreateModal() {
    if (creating) {
      return;
    }
    setShowCreateModal(false);
    setFormError("");
  }
  async function createBook() {
    setFormError("");
    const cleanProjectName = projectName.trim();
    const cleanYsws = ysws.trim();
    if (!cleanProjectName) {
      setFormError("Enter a project name.");
      return;
    }
    if (!cleanYsws) {
      setFormError("Enter the YSWS / shipping program.");
      return;
    }
    if (!githubRepo) {
      setFormError("Select a GitHub repository.");
      return;
    }
    if (trackingMode === "hackatime" && !hackatimeProject) {
      setFormError("Select a Hackatime project.");
      return;
    }
    setCreating(true);
    try {
      const repository = githubRepositories.find(
        (repo) => repo.full_name === githubRepo,
      );
      const response = await fetch("/api/journal/books", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: cleanProjectName,
          ysws: cleanYsws,
          trackingMode,
          hackatimeProject:
            trackingMode === "hackatime" ? hackatimeProject : null,
          githubRepo,
          githubUrl:
            repository?.html_url || selectedGithubRepository?.html_url || null,
        }),
      });
      const data = await readJsonResponse(response);
      if (!response.ok) {
        throw new Error(data?.error || "Failed to create journal book.");
      }
      const createdBook = data?.book;
      setShowCreateModal(false);
      resetCreateForm();
      if (createdBook?.id) {
        window.location.href = `/journal/${createdBook.id}`;
        return;
      }
      await loadBooks();
    } catch (error) {
      console.error("Create journal book error:", error);
      setFormError(
        error instanceof Error
          ? error.message
          : "Failed to create journal book.",
      );
    } finally {
      setCreating(false);
    }
  }
  async function logout() {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
      });
    } finally {
      window.location.href = "/";
    }
  }
  function getBookTrackingLabel(book: JournalBook) {
    return book.tracking_mode === "hackatime" ? "Hackatime" : "Manual";
  }
  function getBookTime(book: JournalBook) {
    if (
      book.tracking_mode === "hackatime" &&
      typeof book.last_hackatime_seconds === "number"
    ) {
      return formatTime(book.last_hackatime_seconds);
    }
    return "Manual sessions";
  }
  return (
    <div className="jv-page">
      <aside className="jv-sidebar">
        <div className="jv-brand">
          <div className="jv-brand-icon">
            <BookOpen size={18} />
          </div>
          <div>
            <strong>Journal</strong>
            <span>Your building journey</span>
          </div>
        </div>
        <nav className="jv-nav">
          <a href="/dashboard" className="jv-nav-item">
            <LayoutDashboard size={16} />
            <span>Dashboard</span>
          </a>
          <a href="/journal" className="jv-nav-item jv-nav-active">
            <BookOpen size={16} />
            <span>Journal</span>
          </a>
          <a href="/profile" className="jv-nav-item">
            <Settings size={16} />
            <span>Settings</span>
          </a>
        </nav>
        <div className="jv-sidebar-bottom">
          <div className="jv-sidebar-profile">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="" />
            ) : (
              <div className="jv-avatar-placeholder">
                <User size={15} />
              </div>
            )}
            <div className="jv-sidebar-profile-info">
              <strong>{profile?.name || profile?.username || "Builder"}</strong>
              <span>{profile?.email || "Journal account"}</span>
            </div>
          </div>
          <button type="button" className="jv-logout" onClick={logout}>
            <LogOut size={15} />
            <span>Log out</span>
          </button>
        </div>
      </aside>
      <main className="jv-main">
        <header className="jv-header">
          <div>
            <p className="jv-eyebrow">YOUR JOURNEY</p>
            <h1>Journal</h1>
            <p className="jv-subtitle">
              Keep track of the projects you build and the time you spend
              building them.
            </p>
          </div>
          <button
            type="button"
            className="jv-new-button"
            onClick={openCreateModal}
          >
            <Plus size={17} />
            <span>New Journal</span>
          </button>
        </header>
        {loading ? (
          <div className="jv-loading">
            <LoaderCircle size={20} className="jv-spin" />
            <span>Loading your journals...</span>
          </div>
        ) : books.length === 0 ? (
          <section className="jv-empty">
            <div className="jv-empty-icon">
              <BookOpen size={28} />
            </div>
            <p className="jv-empty-label">NO JOURNALS YET</p>
            <h2>Start your first project book.</h2>
            <p>
              Create a journal book for a project, connect Hackatime and GitHub,
              and start documenting your build.
            </p>
            <button
              type="button"
              className="jv-empty-button"
              onClick={openCreateModal}
            >
              <Plus size={16} />
              <span>Create project book</span>
            </button>
          </section>
        ) : (
          <section className="jv-books">
            <div className="jv-books-header">
              <div>
                <p>YOUR PROJECTS</p>
                <h2>Project books</h2>
              </div>
              <span>
                {books.length} {books.length === 1 ? "book" : "books"}
              </span>
            </div>
            <div className="jv-book-grid">
              {books.map((book) => (
                <a
                  href={`/journal/${book.id}`}
                  key={book.id}
                  className="jv-book-card"
                >
                  <div className="jv-book-card-top">
                    <div className="jv-book-icon">
                      <BookOpen size={20} />
                    </div>
                    <span className="jv-book-arrow">→</span>
                  </div>
                  <div className="jv-book-content">
                    <p className="jv-book-project-label">PROJECT</p>
                    <h3>{book.name}</h3>
                    <p className="jv-book-ysws">{book.ysws}</p>
                  </div>
                  <div className="jv-book-meta">
                    <span>
                      <Clock3 size={13} />
                      {getBookTrackingLabel(book)}
                    </span>
                    <span>{getBookTime(book)}</span>
                  </div>
                  <div className="jv-book-footer">
                    <span>
                      <GitBranch size={13} />
                      {book.github_repo || "No repository"}
                    </span>
                    <span>
                      <CalendarDays size={13} />
                      {formatDate(book.created_at)}
                    </span>
                  </div>
                </a>
              ))}
            </div>
          </section>
        )}
      </main>
      {showCreateModal && (
        <div className="jv-modal-backdrop" onMouseDown={closeCreateModal}>
          <div
            className="jv-modal"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="jv-modal-header">
              <div>
                <p className="jv-modal-eyebrow">NEW JOURNAL</p>
                <h2>Create a project book</h2>
                <p>Choose how Journal should track your time.</p>
              </div>
              <button
                type="button"
                className="jv-modal-close"
                onClick={closeCreateModal}
                disabled={creating}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
            <div className="jv-modal-body">
              <div className="jv-field">
                <label>PROJECT NAME</label>
                <input
                  type="text"
                  value={projectName}
                  onChange={(event) => setProjectName(event.target.value)}
                  placeholder="e.g. F1 BLARE"
                  disabled={creating}
                />
              </div>
              <div className="jv-field">
                <label>YSWS / SHIPPING ON</label>
                <input
                  type="text"
                  value={ysws}
                  onChange={(event) => setYsws(event.target.value)}
                  placeholder="e.g. Stardance"
                  disabled={creating}
                />
              </div>
              <div className="jv-field">
                <label>TIME TRACKING</label>
                <div className="jv-tracking-options">
                  <button
                    type="button"
                    className={`jv-tracking-option ${
                      trackingMode === "hackatime" ? "jv-tracking-active" : ""
                    }`}
                    onClick={() => setTrackingMode("hackatime")}
                    disabled={creating}
                  >
                    <Clock3 size={18} />
                    <span>
                      <strong>Hackatime</strong>
                      <small>Automatically track coding time</small>
                    </span>
                  </button>
                  <button
                    type="button"
                    className={`jv-tracking-option ${
                      trackingMode === "manual" ? "jv-tracking-active" : ""
                    }`}
                    onClick={() => setTrackingMode("manual")}
                    disabled={creating}
                  >
                    <CalendarDays size={18} />
                    <span>
                      <strong>No Hackatime</strong>
                      <small>Add your own sessions</small>
                    </span>
                  </button>
                </div>
              </div>
              {trackingMode === "hackatime" && (
                <div className="jv-field">
                  <label>HACKATIME PROJECT</label>
                  <div className="jv-select-wrapper">
                    <select
                      value={hackatimeProject}
                      onChange={(event) =>
                        setHackatimeProject(event.target.value)
                      }
                      disabled={creating}
                    >
                      <option value="">Select project</option>
                      {activeHackatimeProjects.map((project) => (
                        <option key={project.name} value={project.name}>
                          {project.name} · {formatTime(project.total_seconds)}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={15} />
                  </div>
                  {selectedHackatimeProject && (
                    <p className="jv-field-help">
                      Currently tracked:{" "}
                      {formatTime(selectedHackatimeProject.total_seconds)}
                    </p>
                  )}
                </div>
              )}
              {trackingMode === "manual" && (
                <div className="jv-manual-info">
                  <Clock3 size={17} />
                  <div>
                    <strong>Manual time tracking</strong>
                    <p>
                      You will be able to add sessions manually inside each
                      journal entry.
                    </p>
                  </div>
                </div>
              )}
              <div className="jv-field">
                <label>GITHUB REPOSITORY</label>
                <div className="jv-select-wrapper">
                  <select
                    value={githubRepo}
                    onChange={(event) => setGithubRepo(event.target.value)}
                    disabled={creating || githubRepositoriesLoading}
                  >
                    <option value="">
                      {githubRepositoriesLoading
                        ? "Loading repositories..."
                        : "Select repository"}
                    </option>
                    {!githubRepositoriesLoading &&
                      githubRepositories.map((repository) => (
                        <option
                          key={repository.id}
                          value={repository.full_name}
                        >
                          {repository.full_name}
                        </option>
                      ))}
                  </select>
                  <ChevronDown size={15} />
                </div>
                {githubRepositoriesLoading && (
                  <p className="jv-field-help jv-loading-inline">
                    <LoaderCircle size={12} className="jv-spin" />
                    Loading your GitHub repositories...
                  </p>
                )}
                {githubRepositoriesError && (
                  <p className="jv-field-error">{githubRepositoriesError}</p>
                )}
                {!githubRepositoriesLoading &&
                  githubRepositories.length > 0 &&
                  selectedGithubRepository && (
                    <p className="jv-field-help">
                      {selectedGithubRepository.private
                        ? "Private repository"
                        : "Public repository"}
                    </p>
                  )}
              </div>
              {formError && <div className="jv-form-error">{formError}</div>}
            </div>
            <div className="jv-modal-footer">
              <button
                type="button"
                className="jv-cancel-button"
                onClick={closeCreateModal}
                disabled={creating}
              >
                Cancel
              </button>
              <button
                type="button"
                className="jv-create-button"
                onClick={createBook}
                disabled={creating}
              >
                {creating ? (
                  <>
                    <LoaderCircle size={15} className="jv-spin" />
                    <span>Creating...</span>
                  </>
                ) : (
                  <>
                    <BookOpen size={15} />
                    <span>Create Book</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
