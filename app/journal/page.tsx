"use client";

import {
    useEffect,
    useState,
} from "react";

import {
    BarChart3,
    BookOpen,
    CalendarDays,
    ChevronDown,
    Clock3,
    FolderGit2,
    GitBranch,
    LogOut,
    Plus,
    Settings,
    User,
    X,
} from "lucide-react";

import "./journal.css";

type Book = {
    id: string;
    name: string;
    ysws: string;
    github_repo: string;
    github_url?: string | null;

    tracking_mode:
    | "hackatime"
    | "manual";

    hackatime_project?: string | null;

    last_hackatime_seconds?: number;

    created_at: string;
};

type HackatimeProject = {
    name: string;
    total_seconds: number;
    archived?: boolean;
};

type GitHubRepository = {
    id?: number;
    name: string;
    full_name?: string;
    html_url?: string;
    private?: boolean;
};

type TrackingMode =
    | "hackatime"
    | "manual";

function formatTime(
    seconds: number
) {
    if (
        !seconds ||
        seconds < 1
    ) {
        return "0m";
    }

    const hours =
        Math.floor(
            seconds / 3600
        );

    const minutes =
        Math.floor(
            (seconds % 3600) /
            60
        );

    if (hours > 0) {
        return `${hours}h ${minutes}m`;
    }

    return `${minutes}m`;
}

function formatDate(
    value: string
) {
    return new Intl.DateTimeFormat(
        "en-IN",
        {
            day: "numeric",
            month: "short",
            year: "numeric",
        }
    ).format(
        new Date(value)
    );
}

function getInitials(
    name: string
) {
    const parts = name
        .trim()
        .split(/\s+/)
        .filter(Boolean);

    if (
        parts.length === 0
    ) {
        return "U";
    }

    if (
        parts.length === 1
    ) {
        return (
            parts[0][0]?.toUpperCase() ||
            "U"
        );
    }

    return (
        `${parts[0][0] || ""}${parts[
            parts.length - 1
        ][0] || ""
            }`.toUpperCase()
    );
}

function extractRepositories(
    value: unknown
): GitHubRepository[] {
    if (
        Array.isArray(value)
    ) {
        return value as GitHubRepository[];
    }

    if (
        value &&
        typeof value ===
        "object"
    ) {
        const object =
            value as Record<
                string,
                unknown
            >;

        if (
            Array.isArray(
                object.repositories
            )
        ) {
            return object.repositories as GitHubRepository[];
        }

        if (
            Array.isArray(
                object.repos
            )
        ) {
            return object.repos as GitHubRepository[];
        }

        if (
            Array.isArray(
                object.data
            )
        ) {
            return object.data as GitHubRepository[];
        }
    }

    return [];
}

export default function JournalPage() {
    const [books, setBooks] =
        useState<Book[]>([]);

    const [projects, setProjects] =
        useState<
            HackatimeProject[]
        >([]);

    const [repositories, setRepositories] =
        useState<
            GitHubRepository[]
        >([]);

    const [loading, setLoading] =
        useState(true);

    const [modalOpen, setModalOpen] =
        useState(false);

    const [creating, setCreating] =
        useState(false);

    const [error, setError] =
        useState("");

    const [profileName, setProfileName] =
        useState("Builder");

    const [profileUsername, setProfileUsername] =
        useState("");

    const [profileAvatar, setProfileAvatar] =
        useState("");

    const [trackingMode, setTrackingMode] =
        useState<TrackingMode>(
            "hackatime"
        );

    const [name, setName] =
        useState("");

    const [ysws, setYsws] =
        useState("");

    const [hackatimeProject, setHackatimeProject] =
        useState("");

    const [githubRepo, setGithubRepo] =
        useState("");

    /*
     * ---------------------------------------------------------
     * THEME
     * ---------------------------------------------------------
     */

    useEffect(() => {
        const saved =
            window.localStorage.getItem(
                "journal-theme"
            );

        document.documentElement.dataset.journalTheme =
            saved === "light"
                ? "light"
                : "dark";
    }, []);

    /*
     * ---------------------------------------------------------
     * LOAD PAGE
     * ---------------------------------------------------------
     */

    async function loadPage() {
        try {
            setLoading(true);
            setError("");

            const [
                booksResponse,
                projectsResponse,
                repositoriesResponse,
                profileResponse,
            ] =
                await Promise.all([
                    fetch(
                        "/api/journal/books",
                        {
                            cache:
                                "no-store",
                        }
                    ),

                    fetch(
                        "/api/hackatime/projects",
                        {
                            cache:
                                "no-store",
                        }
                    ),

                    fetch(
                        "/api/github/repositories",
                        {
                            cache:
                                "no-store",
                        }
                    ),

                    fetch(
                        "/api/profile",
                        {
                            cache:
                                "no-store",
                        }
                    ),
                ]);

            /*
             * Books
             */

            if (
                booksResponse.ok
            ) {
                const data =
                    await booksResponse.json();

                setBooks(
                    Array.isArray(
                        data?.books
                    )
                        ? data.books
                        : []
                );
            }

            /*
             * Hackatime
             */

            if (
                projectsResponse.ok
            ) {
                const data =
                    await projectsResponse.json();

                const active =
                    Array.isArray(
                        data?.projects
                    )
                        ? data.projects.filter(
                            (
                                item: HackatimeProject
                            ) =>
                                !item.archived
                        )
                        : [];

                setProjects(active);
            }

            /*
             * GitHub
             */

            if (
                repositoriesResponse.ok
            ) {
                const data =
                    await repositoriesResponse.json();

                setRepositories(
                    extractRepositories(
                        data
                    )
                );
            }

            /*
             * Profile
             */

            if (
                profileResponse.ok
            ) {
                const data =
                    await profileResponse.json();

                setProfileName(
                    data?.profile?.name ||
                    "Builder"
                );

                setProfileUsername(
                    data?.profile?.username ||
                    ""
                );

                setProfileAvatar(
                    data?.profile?.avatar_url ||
                    ""
                );
            }

            /*
             * Helpful error states.
             */

            if (
                !repositoriesResponse.ok
            ) {
                console.error(
                    "GitHub repositories error:",
                    await repositoriesResponse
                        .clone()
                        .text()
                );
            }

            if (
                !projectsResponse.ok
            ) {
                console.error(
                    "Hackatime projects request failed:",
                    projectsResponse.status
                );
            }
        } catch (err) {
            console.error(
                "Journal page error:",
                err
            );

            setError(
                err instanceof Error
                    ? err.message
                    : "Could not load Journal."
            );
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadPage();
    }, []);

    /*
     * ---------------------------------------------------------
     * CREATE FORM
     * ---------------------------------------------------------
     */

    function resetForm() {
        setTrackingMode(
            "hackatime"
        );

        setName("");

        setYsws("");

        setHackatimeProject(
            projects[0]?.name || ""
        );

        setGithubRepo(
            repositories[0]
                ?.full_name ||
            repositories[0]
                ?.name ||
            ""
        );
    }

    function openCreate() {
        setError("");

        resetForm();

        setModalOpen(true);
    }

    function closeCreate() {
        if (creating) {
            return;
        }

        setModalOpen(false);
    }

    async function createBook() {
        try {
            setError("");

            const trimmedName =
                name.trim();

            const trimmedYsws =
                ysws.trim();

            if (!trimmedName) {
                setError(
                    "Enter a project name."
                );
                return;
            }

            if (!trimmedYsws) {
                setError(
                    "Enter the YSWS / Shipping On."
                );
                return;
            }

            if (!githubRepo) {
                setError(
                    "Select a GitHub repository."
                );
                return;
            }

            if (
                trackingMode === "hackatime" &&
                !hackatimeProject
            ) {
                setError(
                    "Select a Hackatime project."
                );
                return;
            }

            setCreating(true);

            const repository =
                repositories.find(
                    (item) =>
                        (item.full_name ||
                            item.name) ===
                        githubRepo
                );

            const response =
                await fetch(
                    "/api/journal/books",
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json",
                        },

                        body: JSON.stringify({
                            name: trimmedName,

                            ysws: trimmedYsws,

                            githubRepo,

                            githubUrl:
                                repository?.html_url ||
                                null,

                            trackingMode,

                            hackatimeProject:
                                trackingMode ===
                                    "hackatime"
                                    ? hackatimeProject
                                    : null,
                        }),
                    }
                );

            /*
             * Do NOT immediately call response.json().
             *
             * First inspect what Next.js actually returned.
             */

            const contentType =
                response.headers.get(
                    "content-type"
                ) || "";

            const responseText =
                await response.text();

            if (
                !contentType.includes(
                    "application/json"
                )
            ) {
                console.error(
                    "Non-JSON response from /api/journal/books:",
                    response.status,
                    responseText
                );

                throw new Error(
                    `Journal API returned ${response.status}. Check your terminal for the real server error.`
                );
            }

            let data: {
                success?: boolean;
                book?: Book;
                error?: string;
            };

            try {
                data =
                    JSON.parse(responseText);
            } catch {
                console.error(
                    "Invalid JSON from Journal API:",
                    responseText
                );

                throw new Error(
                    "Journal API returned invalid JSON."
                );
            }

            if (!response.ok) {
                throw new Error(
                    data.error ||
                    "Could not create journal book."
                );
            }

            if (!data.book) {
                throw new Error(
                    "The server created no journal book."
                );
            }

            setBooks(
                (current) => [
                    data.book as Book,
                    ...current,
                ]
            );

            setModalOpen(false);

            setName("");
            setYsws("");
            setHackatimeProject("");
            setGithubRepo("");
            setTrackingMode(
                "hackatime"
            );
        } catch (err) {
            console.error(
                "Create book error:",
                err
            );

            setError(
                err instanceof Error
                    ? err.message
                    : "Could not create journal book."
            );
        } finally {
            setCreating(false);
        }
    }

    const initials =
        getInitials(
            profileName
        );

    return (
        <main className="jv-page">
            {/* =====================================================
          SIDEBAR
          ===================================================== */}

            <aside className="jv-sidebar">
                <div className="jv-brand">
                    <div className="jv-brand-icon">
                        <BookOpen
                            size={17}
                        />
                    </div>

                    <span>
                        Journal
                    </span>
                </div>

                <nav className="jv-nav">
                    <a
                        href="/dashboard"
                        className="jv-nav-item"
                    >
                        <BarChart3
                            size={16}
                        />

                        <span>
                            Dashboard
                        </span>
                    </a>

                    <a
                        href="/journal"
                        className="jv-nav-item jv-nav-active"
                    >
                        <BookOpen
                            size={16}
                        />

                        <span>
                            Journal
                        </span>
                    </a>

                    <a
                        href="/profile"
                        className="jv-nav-item"
                    >
                        <Settings
                            size={16}
                        />

                        <span>
                            Settings
                        </span>
                    </a>
                </nav>

                <div className="jv-sidebar-bottom">
                    <a
                        href="/profile"
                        className="jv-profile"
                    >
                        {profileAvatar ? (
                            <img
                                src={
                                    profileAvatar
                                }
                                alt={
                                    profileName
                                }
                                className="jv-profile-avatar"
                            />
                        ) : (
                            <div className="jv-profile-placeholder">
                                {initials}
                            </div>
                        )}

                        <div className="jv-profile-info">
                            <strong>
                                {profileName}
                            </strong>

                            <span>
                                {profileUsername
                                    ? `@${profileUsername}`
                                    : "View profile"}
                            </span>
                        </div>
                    </a>

                    <a
                        href="/api/auth/logout"
                        className="jv-logout"
                    >
                        <LogOut
                            size={15}
                        />

                        <span>
                            Logout
                        </span>
                    </a>
                </div>
            </aside>

            {/* =====================================================
          MAIN
          ===================================================== */}

            <section className="jv-main">
                <header className="jv-header">
                    <div>
                        <p className="jv-eyebrow">
                            YOUR BUILDING JOURNEY
                        </p>

                        <h1>
                            Your{" "}
                            <span>
                                Journal
                            </span>
                        </h1>

                        <p className="jv-description">
                            Turn every project into
                            a book of what you
                            built, learned and
                            remembered.
                        </p>
                    </div>

                    <button
                        type="button"
                        className="jv-new-book"
                        onClick={
                            openCreate
                        }
                    >
                        <Plus size={18} />

                        New Journal
                    </button>
                </header>

                {error &&
                    !modalOpen ? (
                    <div className="jv-error">
                        <span>
                            {error}
                        </span>

                        <button
                            type="button"
                            onClick={() =>
                                setError("")
                            }
                        >
                            <X size={14} />
                        </button>
                    </div>
                ) : null}

                {loading ? (
                    <div className="jv-loading">
                        Loading your
                        journals...
                    </div>
                ) : books.length ===
                    0 ? (
                    <section className="jv-empty-state">
                        <div className="jv-empty-book">
                            <BookOpen
                                size={40}
                            />
                        </div>

                        <p className="jv-section-label">
                            YOUR BOOKS
                        </p>

                        <h2>
                            Start your first
                            project journal.
                        </h2>

                        <p>
                            Connect your GitHub
                            repository and
                            choose Hackatime
                            or manual session
                            tracking.
                        </p>

                        <button
                            type="button"
                            className="jv-empty-button"
                            onClick={
                                openCreate
                            }
                        >
                            <Plus size={16} />

                            Create your first
                            book
                        </button>
                    </section>
                ) : (
                    <section>
                        <div className="jv-section-heading">
                            <div>
                                <p className="jv-section-label">
                                    YOUR BOOKS
                                </p>

                                <h2>
                                    Projects you're
                                    documenting
                                </h2>
                            </div>

                            <span>
                                {books.length}{" "}
                                {books.length ===
                                    1
                                    ? "book"
                                    : "books"}
                            </span>
                        </div>

                        <div className="jv-book-grid">
                            {books.map(
                                (book) => (
                                    <a
                                        key={
                                            book.id
                                        }
                                        href={`/journal/${book.id}`}
                                        className="jv-book-card"
                                    >
                                        <div className="jv-book-cover">
                                            <div className="jv-book-spine" />

                                            <BookOpen
                                                size={26}
                                            />

                                            <span>
                                                JOURNAL
                                            </span>

                                            <strong>
                                                {
                                                    book.name
                                                }
                                            </strong>
                                        </div>

                                        <div className="jv-book-body">
                                            <div className="jv-book-title-row">
                                                <div>
                                                    <h3>
                                                        {
                                                            book.name
                                                        }
                                                    </h3>

                                                    <p>
                                                        {
                                                            book.ysws
                                                        }
                                                    </p>
                                                </div>

                                                <FolderGit2
                                                    size={17}
                                                />
                                            </div>

                                            <div className="jv-book-meta">
                                                <span>
                                                    <Clock3
                                                        size={13}
                                                    />

                                                    {book.tracking_mode ===
                                                        "manual"
                                                        ? "Manual time"
                                                        : "Hackatime"}
                                                </span>

                                                <span>
                                                    <CalendarDays
                                                        size={13}
                                                    />

                                                    {formatDate(
                                                        book.created_at
                                                    )}
                                                </span>
                                            </div>

                                            <div className="jv-book-links">
                                                <span>
                                                    {book.tracking_mode ===
                                                        "manual"
                                                        ? "Manual sessions"
                                                        : `Hackatime: ${book.hackatime_project}`}
                                                </span>

                                                <span>
                                                    <GitBranch
                                                        size={12}
                                                    />

                                                    {
                                                        book.github_repo
                                                    }
                                                </span>
                                            </div>
                                        </div>
                                    </a>
                                )
                            )}
                        </div>
                    </section>
                )}
            </section>

            {/* =====================================================
          CREATE MODAL
          ===================================================== */}

            {modalOpen ? (
                <div
                    className="jv-modal-backdrop"
                    onMouseDown={(
                        event
                    ) => {
                        if (
                            event.target ===
                            event.currentTarget
                        ) {
                            closeCreate();
                        }
                    }}
                >
                    <section className="jv-modal">
                        <div className="jv-modal-header">
                            <div>
                                <p className="jv-section-label">
                                    NEW JOURNAL
                                </p>

                                <h2>
                                    Create a project
                                    book
                                </h2>

                                <p>
                                    Choose how Journal
                                    should track your
                                    time.
                                </p>
                            </div>

                            <button
                                type="button"
                                className="jv-close"
                                onClick={
                                    closeCreate
                                }
                                disabled={
                                    creating
                                }
                            >
                                <X size={17} />
                            </button>
                        </div>

                        {error ? (
                            <div className="jv-modal-error">
                                {error}
                            </div>
                        ) : null}

                        <div className="jv-form">
                            <label className="jv-field">
                                <span>
                                    Project name
                                </span>

                                <input
                                    type="text"
                                    value={
                                        name
                                    }
                                    onChange={(
                                        event
                                    ) =>
                                        setName(
                                            event.target
                                                .value
                                        )
                                    }
                                    placeholder="F1 BLARE"
                                    autoFocus
                                />
                            </label>

                            <label className="jv-field">
                                <span>
                                    YSWS / Shipping
                                    On
                                </span>

                                <input
                                    type="text"
                                    value={
                                        ysws
                                    }
                                    onChange={(
                                        event
                                    ) =>
                                        setYsws(
                                            event.target
                                                .value
                                        )
                                    }
                                    placeholder="Stardance"
                                />
                            </label>

                            <div className="jv-field">
                                <span>
                                    Time tracking
                                </span>

                                <div className="jv-tracking-options">
                                    <button
                                        type="button"
                                        className={`jv-tracking-option ${trackingMode ===
                                            "hackatime"
                                            ? "jv-tracking-active"
                                            : ""
                                            }`}
                                        onClick={() =>
                                            setTrackingMode(
                                                "hackatime"
                                            )
                                        }
                                    >
                                        <Clock3
                                            size={17}
                                        />

                                        <div>
                                            <strong>
                                                Hackatime
                                            </strong>

                                            <small>
                                                Automatically track
                                                coding time
                                            </small>
                                        </div>
                                    </button>

                                    <button
                                        type="button"
                                        className={`jv-tracking-option ${trackingMode ===
                                            "manual"
                                            ? "jv-tracking-active"
                                            : ""
                                            }`}
                                        onClick={() =>
                                            setTrackingMode(
                                                "manual"
                                            )
                                        }
                                    >
                                        <CalendarDays
                                            size={17}
                                        />

                                        <div>
                                            <strong>
                                                No Hackatime
                                            </strong>

                                            <small>
                                                Add your own
                                                sessions
                                            </small>
                                        </div>
                                    </button>
                                </div>
                            </div>

                            {trackingMode ===
                                "hackatime" ? (
                                <label className="jv-field">
                                    <span>
                                        Hackatime
                                        project
                                    </span>

                                    <div className="jv-select-wrap">
                                        <select
                                            value={
                                                hackatimeProject
                                            }
                                            onChange={(
                                                event
                                            ) =>
                                                setHackatimeProject(
                                                    event.target
                                                        .value
                                                )
                                            }
                                        >
                                            <option value="">
                                                Select project
                                            </option>

                                            {projects.map(
                                                (
                                                    project
                                                ) => (
                                                    <option
                                                        key={
                                                            project.name
                                                        }
                                                        value={
                                                            project.name
                                                        }
                                                    >
                                                        {
                                                            project.name
                                                        }{" "}
                                                        ·{" "}
                                                        {formatTime(
                                                            Number(
                                                                project.total_seconds ||
                                                                0
                                                            )
                                                        )}
                                                    </option>
                                                )
                                            )}
                                        </select>

                                        <ChevronDown
                                            size={15}
                                        />
                                    </div>
                                </label>
                            ) : (
                                <div className="jv-manual-info">
                                    <CalendarDays
                                        size={17}
                                    />

                                    <div>
                                        <strong>
                                            Manual sessions
                                        </strong>

                                        <span>
                                            You will enter
                                            date,
                                            duration and
                                            notes when
                                            writing a journal
                                            entry.
                                        </span>
                                    </div>
                                </div>
                            )}

                            <label className="jv-field">
                                <span>
                                    GitHub
                                    repository
                                </span>

                                <div className="jv-select-wrap">
                                    <select
                                        value={
                                            githubRepo
                                        }
                                        onChange={(
                                            event
                                        ) =>
                                            setGithubRepo(
                                                event.target
                                                    .value
                                            )
                                        }
                                    >
                                        <option value="">
                                            Select repository
                                        </option>

                                        {repositories.map(
                                            (
                                                repo
                                            ) => {
                                                const value =
                                                    repo.full_name ||
                                                    repo.name;

                                                return (
                                                    <option
                                                        key={
                                                            repo.id ??
                                                            value
                                                        }
                                                        value={
                                                            value
                                                        }
                                                    >
                                                        {value}

                                                        {repo.private
                                                            ? " · Private"
                                                            : ""}
                                                    </option>
                                                );
                                            }
                                        )}
                                    </select>

                                    <ChevronDown
                                        size={15}
                                    />
                                </div>
                            </label>
                        </div>

                        <div className="jv-modal-actions">
                            <button
                                type="button"
                                className="jv-cancel-button"
                                onClick={
                                    closeCreate
                                }
                                disabled={
                                    creating
                                }
                            >
                                Cancel
                            </button>

                            <button
                                type="button"
                                className="jv-create-button"
                                onClick={
                                    createBook
                                }
                                disabled={
                                    creating
                                }
                            >
                                <BookOpen
                                    size={16}
                                />

                                {creating
                                    ? "Creating..."
                                    : "Create Book"}
                            </button>
                        </div>
                    </section>
                </div>
            ) : null}
        </main>
    );
}