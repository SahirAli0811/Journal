"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  ArrowLeft,
  BarChart3,
  Bold,
  BookOpen,
  CalendarDays,
  Check,
  CheckSquare,
  Code2,
  CodeXml,
  Heading1,
  Heading2,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListOrdered,
  LoaderCircle,
  LogOut,
  Minus,
  Quote,
  Save,
  Settings,
  Strikethrough,
  Table2,
  Trash2,
  User,
  Clock3,
} from "lucide-react";

import "./editor.css";

type Book = {
  id: string;
  user_id: string;
  name: string;
  ysws: string;
  github_repo: string;
  github_url?: string | null;
  tracking_mode:
    | "hackatime"
    | "manual";
  hackatime_project?: string | null;
  last_hackatime_seconds?: number;
  created_at?: string;
  updated_at?: string;
};

type BookResponse = {
  book: Book;
  time: {
    currentSeconds: number;
    newSeconds: number;
  };
};

type ManualSession = {
  id: string;
  date: string;
  hours: string;
  minutes: string;
  note: string;
};

function getToday() {
  const now = new Date();

  const year =
    now.getFullYear();

  const month =
    String(
      now.getMonth() + 1
    ).padStart(2, "0");

  const day =
    String(
      now.getDate()
    ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

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
      (seconds % 3600) / 60
    );

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  return `${minutes}m`;
}

function formatReadableDate(
  value: string
) {
  return new Intl.DateTimeFormat(
    "en-IN",
    {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }
  ).format(
    new Date(
      `${value}T00:00:00`
    )
  );
}

function makeId() {
  if (
    typeof crypto !==
      "undefined" &&
    "randomUUID" in crypto
  ) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}`;
}

function wrapSelection(
  value: string,
  start: number,
  end: number,
  before: string,
  after: string,
  fallback: string
) {
  const selected =
    value.slice(start, end) ||
    fallback;

  const next =
    value.slice(0, start) +
    before +
    selected +
    after +
    value.slice(end);

  return {
    value: next,
    start:
      start + before.length,
    end:
      start +
      before.length +
      selected.length,
  };
}

function prefixLines(
  value: string,
  start: number,
  end: number,
  prefix: string
) {
  const lineStart =
    value.lastIndexOf(
      "\n",
      start - 1
    ) + 1;

  const selected =
    value.slice(
      lineStart,
      end
    );

  const replaced =
    selected
      .split("\n")
      .map(
        (line) =>
          `${prefix}${line}`
      )
      .join("\n");

  return {
    value:
      value.slice(0, lineStart) +
      replaced +
      value.slice(end),

    start: lineStart,

    end:
      lineStart + replaced.length,
  };
}

export default function JournalEditorPage({
  params,
}: {
  params: {
    id: string;
  };
}) {
  const textareaRef =
    useRef<HTMLTextAreaElement | null>(
      null
    );

  const [book, setBook] =
    useState<Book | null>(
      null
    );

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [saving, setSaving] =
    useState(false);

  const [saved, setSaved] =
    useState(false);

  const [date, setDate] =
    useState(getToday());

  const [title, setTitle] =
    useState("");

  const [content, setContent] =
    useState("");

  const [newSeconds, setNewSeconds] =
    useState(0);

  const [currentSeconds, setCurrentSeconds] =
    useState(0);

  const [sessions, setSessions] =
    useState<ManualSession[]>([
      {
        id: makeId(),
        date: getToday(),
        hours: "0",
        minutes: "30",
        note: "",
      },
    ]);

  const [imageOne, setImageOne] =
    useState<File | null>(null);

  const [imageTwo, setImageTwo] =
    useState<File | null>(null);

  const [imageOnePreview, setImageOnePreview] =
    useState("");

  const [imageTwoPreview, setImageTwoPreview] =
    useState("");

  /*
   * ---------------------------------------------------------
   * THEME
   * ---------------------------------------------------------
   */

  useEffect(() => {
    const savedTheme =
      window.localStorage.getItem(
        "journal-theme"
      );

    document.documentElement.dataset.journalTheme =
      savedTheme === "light"
        ? "light"
        : "dark";
  }, []);

  /*
   * ---------------------------------------------------------
   * LOAD BOOK
   * ---------------------------------------------------------
   */

  useEffect(() => {
    async function loadBook() {
      try {
        setLoading(true);
        setError("");

        const response =
          await fetch(
            `/api/journal/books/${params.id}`,
            {
              cache: "no-store",
            }
          );

        const contentType =
          response.headers.get(
            "content-type"
          ) || "";

        const text =
          await response.text();

        if (
          !contentType.includes(
            "application/json"
          )
        ) {
          throw new Error(
            `Journal book API returned ${response.status}.`
          );
        }

        const data =
          JSON.parse(text) as
            | BookResponse
            | {
                error?: string;
              };

        if (!response.ok) {
          throw new Error(
            "error" in data
              ? data.error ||
                  "Could not load journal."
              : "Could not load journal."
          );
        }

        const result =
          data as BookResponse;

        setBook(
          result.book
        );

        setCurrentSeconds(
          Number(
            result.time
              ?.currentSeconds || 0
          )
        );

        setNewSeconds(
          Number(
            result.time
              ?.newSeconds || 0
          )
        );
      } catch (err) {
        console.error(
          "Journal book load error:",
          err
        );

        setError(
          err instanceof Error
            ? err.message
            : "Could not load journal."
        );
      } finally {
        setLoading(false);
      }
    }

    loadBook();
  }, [params.id]);

  /*
   * ---------------------------------------------------------
   * MANUAL TIME
   * ---------------------------------------------------------
   */

  const manualSeconds =
    useMemo(() => {
      return sessions.reduce(
        (total, session) => {
          const hours =
            Number(
              session.hours || 0
            );

          const minutes =
            Number(
              session.minutes || 0
            );

          return (
            total +
            hours * 3600 +
            minutes * 60
          );
        },
        0
      );
    }, [sessions]);

  function restoreSelection(
    start: number,
    end: number
  ) {
    window.requestAnimationFrame(
      () => {
        textareaRef.current?.focus();

        textareaRef.current?.setSelectionRange(
          start,
          end
        );
      }
    );
  }

  function wrap(
    before: string,
    after: string,
    fallback: string
  ) {
    const textarea =
      textareaRef.current;

    if (!textarea) {
      return;
    }

    const result =
      wrapSelection(
        content,
        textarea.selectionStart,
        textarea.selectionEnd,
        before,
        after,
        fallback
      );

    setContent(
      result.value
    );

    restoreSelection(
      result.start,
      result.end
    );
  }

  function prefix(
    value: string
  ) {
    const textarea =
      textareaRef.current;

    if (!textarea) {
      return;
    }

    const result =
      prefixLines(
        content,
        textarea.selectionStart,
        textarea.selectionEnd,
        value
      );

    setContent(
      result.value
    );

    restoreSelection(
      result.start,
      result.end
    );
  }

  function insert(
    value: string
  ) {
    const textarea =
      textareaRef.current;

    if (!textarea) {
      return;
    }

    const start =
      textarea.selectionStart;

    const end =
      textarea.selectionEnd;

    const next =
      content.slice(0, start) +
      value +
      content.slice(end);

    setContent(next);

    restoreSelection(
      start + value.length,
      start + value.length
    );
  }

  function insertLink() {
    const textarea =
      textareaRef.current;

    if (!textarea) {
      return;
    }

    const result =
      wrapSelection(
        content,
        textarea.selectionStart,
        textarea.selectionEnd,
        "[",
        "](https://)",
        "link"
      );

    setContent(
      result.value
    );

    restoreSelection(
      result.start,
      result.end
    );
  }

  function insertTable() {
    insert(
      "\n| Column 1 | Column 2 | Column 3 |\n| --- | --- | --- |\n| Value | Value | Value |\n| Value | Value | Value |\n"
    );
  }

  function insertCode() {
    insert(
      "\n```text\ncode here\n```\n"
    );
  }

  function addSession() {
    setSessions(
      (current) => [
        ...current,
        {
          id: makeId(),
          date,
          hours: "0",
          minutes: "30",
          note: "",
        },
      ]
    );
  }

  function removeSession(
    id: string
  ) {
    if (
      sessions.length <= 1
    ) {
      return;
    }

    setSessions(
      (current) =>
        current.filter(
          (session) =>
            session.id !== id
        )
    );
  }

  function updateSession(
    id: string,
    field: keyof ManualSession,
    value: string
  ) {
    setSessions(
      (current) =>
        current.map(
          (session) =>
            session.id === id
              ? {
                  ...session,
                  [field]:
                    value,
                }
              : session
        )
    );
  }

  function handleImage(
    event: React.ChangeEvent<HTMLInputElement>,
    slot: 1 | 2
  ) {
    const file =
      event.target.files?.[0];

    if (!file) {
      return;
    }

    if (
      !file.type.startsWith(
        "image/"
      )
    ) {
      setError(
        "Please choose an image."
      );

      return;
    }

    if (
      file.size >
      5 * 1024 * 1024
    ) {
      setError(
        "Each image must be smaller than 5 MB."
      );

      return;
    }

    setError("");

    const preview =
      URL.createObjectURL(
        file
      );

    if (slot === 1) {
      setImageOne(file);
      setImageOnePreview(
        preview
      );
    } else {
      setImageTwo(file);
      setImageTwoPreview(
        preview
      );
    }
  }

  function removeImage(
    slot: 1 | 2
  ) {
    if (slot === 1) {
      setImageOne(null);
      setImageOnePreview("");
    } else {
      setImageTwo(null);
      setImageTwoPreview("");
    }
  }

  async function saveEntry() {
    try {
      setSaving(true);
      setSaved(false);
      setError("");

      if (!content.trim()) {
        throw new Error(
          "Write something before saving."
        );
      }

      if (
        book?.tracking_mode ===
          "manual" &&
        manualSeconds <= 0
      ) {
        throw new Error(
          "Add some manual time first."
        );
      }

      /*
       * For now this saves through the
       * database/API once the publish
       * endpoint is connected.
       */

      const formData =
        new FormData();

      formData.append(
        "date",
        date
      );

      formData.append(
        "title",
        title
      );

      formData.append(
        "content",
        content
      );

      formData.append(
        "sessions",
        JSON.stringify(
          book?.tracking_mode ===
            "manual"
            ? sessions
            : []
        )
      );

      if (imageOne) {
        formData.append(
          "image1",
          imageOne
        );
      }

      if (imageTwo) {
        formData.append(
          "image2",
          imageTwo
        );
      }

      const response =
        await fetch(
          `/api/journal/books/${params.id}/publish`,
          {
            method: "POST",
            body: formData,
          }
        );

      const contentType =
        response.headers.get(
          "content-type"
        ) || "";

      const text =
        await response.text();

      if (
        !contentType.includes(
          "application/json"
        )
      ) {
        throw new Error(
          `Publish API returned ${response.status}.`
        );
      }

      const result =
        JSON.parse(text);

      if (!response.ok) {
        throw new Error(
          result?.error ||
            "Failed to publish journal."
        );
      }

      setSaved(true);

      if (
        typeof result
          ?.currentHackatimeSeconds ===
        "number"
      ) {
        setCurrentSeconds(
          result.currentHackatimeSeconds
        );

        setNewSeconds(0);
      }
    } catch (err) {
      console.error(
        "Save journal error:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Could not save journal."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="je-page">
        <div className="je-loading">
          Loading journal...
        </div>
      </main>
    );
  }

  if (!book) {
    return (
      <main className="je-page">
        <div className="je-error-page">
          <BookOpen
            size={30}
          />

          <h1>
            Journal not found
          </h1>

          <p>
            {error ||
              "This journal book does not exist."}
          </p>

          <a href="/journal">
            <ArrowLeft
              size={14}
            />
            Back to Journal
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="je-page">
      <aside className="je-sidebar">
        <div className="je-brand">
          <div className="je-brand-icon">
            <BookOpen
              size={17}
            />
          </div>

          <span>
            Journal
          </span>
        </div>

        <nav className="je-nav">
          <a
            href="/dashboard"
            className="je-nav-item"
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
            className="je-nav-item je-nav-active"
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
            className="je-nav-item"
          >
            <Settings
              size={16}
            />
            <span>
              Settings
            </span>
          </a>
        </nav>

        <div className="je-sidebar-bottom">
          <a
            href="/profile"
            className="je-profile"
          >
            <div className="je-profile-placeholder">
              <User size={16} />
            </div>

            <div>
              <strong>
                Profile
              </strong>

              <span>
                Manage account
              </span>
            </div>
          </a>

          <a
            href="/api/auth/logout"
            className="je-logout"
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

      <section className="je-main">
        <header className="je-header">
          <div className="je-header-left">
            <a
              href="/journal"
              className="je-back"
            >
              <ArrowLeft
                size={15}
              />
              Journal
            </a>
          </div>

          <div className="je-header-main">
            <p className="je-eyebrow">
              {book.ysws}
            </p>

            <h1>
              {book.name}
            </h1>

            <p>
              {book.github_repo}
            </p>
          </div>

          <button
            type="button"
            className="je-save-top"
            onClick={saveEntry}
            disabled={saving}
          >
            {saving ? (
              <LoaderCircle
                size={15}
                className="je-spin"
              />
            ) : (
              <Save size={15} />
            )}

            {saving
              ? "Publishing..."
              : "Save & Publish"}
          </button>
        </header>

        {error ? (
          <div className="je-alert je-alert-error">
            {error}
          </div>
        ) : null}

        {saved ? (
          <div className="je-alert je-alert-success">
            <Check size={15} />
            Journal published successfully.
          </div>
        ) : null}

        {book.tracking_mode ===
        "hackatime" ? (
          <section className="je-time-banner">
            <div className="je-time-icon">
              <Clock3 />
            </div>

            <div>
              <strong>
                Hackatime ·{" "}
                {book.hackatime_project}
              </strong>

              <p>
                {newSeconds > 0
                  ? `You have ${formatTime(
                      newSeconds
                    )} of new coding time since your last entry. Write about what you worked on.`
                  : "No new coding time detected since your last entry."}
              </p>
            </div>

            <div className="je-time-total">
              {formatTime(
                currentSeconds
              )}

              <small>
                project total
              </small>
            </div>
          </section>
        ) : (
          <section className="je-time-banner je-time-manual">
            <div className="je-time-icon">
              <CalendarDays />
            </div>

            <div>
              <strong>
                Manual time tracking
              </strong>

              <p>
                Add your own sessions
                below.
              </p>
            </div>

            <div className="je-time-total">
              {formatTime(
                manualSeconds
              )}

              <small>
                this entry
              </small>
            </div>
          </section>
        )}

        <section className="je-editor-card">
          <div className="je-entry-top">
            <div>
              <span>
                JOURNAL ENTRY
              </span>

              <input
                value={title}
                onChange={(event) =>
                  setTitle(
                    event.target.value
                  )
                }
                placeholder="Entry title"
              />
            </div>

            <label className="je-date">
              <CalendarDays
                size={14}
              />

              <input
                type="date"
                value={date}
                onChange={(event) =>
                  setDate(
                    event.target.value
                  )
                }
              />
            </label>
          </div>

          <div className="je-date-readable">
            {formatReadableDate(
              date
            )}
          </div>

          <div className="je-toolbar">
            <button
              type="button"
              title="Bold"
              onClick={() =>
                wrap(
                  "**",
                  "**",
                  "bold"
                )
              }
            >
              <Bold />
            </button>

            <button
              type="button"
              title="Italic"
              onClick={() =>
                wrap(
                  "*",
                  "*",
                  "italic"
                )
              }
            >
              <Italic />
            </button>

            <button
              type="button"
              title="Strikethrough"
              onClick={() =>
                wrap(
                  "~~",
                  "~~",
                  "text"
                )
              }
            >
              <Strikethrough />
            </button>

            <span />

            <button
              type="button"
              title="Heading 1"
              onClick={() =>
                prefix("# ")
              }
            >
              <Heading1 />
            </button>

            <button
              type="button"
              title="Heading 2"
              onClick={() =>
                prefix("## ")
              }
            >
              <Heading2 />
            </button>

            <button
              type="button"
              title="Quote"
              onClick={() =>
                prefix("> ")
              }
            >
              <Quote />
            </button>

            <span />

            <button
              type="button"
              title="Bullet list"
              onClick={() =>
                prefix("- ")
              }
            >
              <List />
            </button>

            <button
              type="button"
              title="Numbered list"
              onClick={() =>
                prefix("1. ")
              }
            >
              <ListOrdered />
            </button>

            <button
              type="button"
              title="Checklist"
              onClick={() =>
                prefix("- [ ] ")
              }
            >
              <CheckSquare />
            </button>

            <span />

            <button
              type="button"
              title="Inline code"
              onClick={() =>
                wrap(
                  "`",
                  "`",
                  "code"
                )
              }
            >
              <Code2 />
            </button>

            <button
              type="button"
              title="Code block"
              onClick={
                insertCode
              }
            >
              <CodeXml />
            </button>

            <button
              type="button"
              title="Link"
              onClick={
                insertLink
              }
            >
              <Link2 />
            </button>

            <button
              type="button"
              title="Table"
              onClick={
                insertTable
              }
            >
              <Table2 />
            </button>

            <button
              type="button"
              title="Horizontal rule"
              onClick={() =>
                insert(
                  "\n\n---\n\n"
                )
              }
            >
              <Minus />
            </button>
          </div>

          <textarea
            ref={textareaRef}
            className="je-editor"
            value={content}
            onChange={(event) =>
              setContent(
                event.target.value
              )
            }
            placeholder="Start writing about what you built today..."
            spellCheck
          />

          <div className="je-editor-footer">
            <span>
              Markdown
            </span>

            <span>
              {content.length} characters
            </span>
          </div>
        </section>

        {book.tracking_mode ===
        "manual" ? (
          <section className="je-section">
            <div className="je-section-heading">
              <div>
                <span>
                  TIME
                </span>

                <h2>
                  Your sessions
                </h2>

                <p>
                  Add the time you spent
                  working on this entry.
                </p>
              </div>

              <strong>
                {formatTime(
                  manualSeconds
                )}
              </strong>
            </div>

            <div className="je-sessions">
              {sessions.map(
                (session) => (
                  <div
                    className="je-session"
                    key={
                      session.id
                    }
                  >
                    <input
                      type="date"
                      value={
                        session.date
                      }
                      onChange={(
                        event
                      ) =>
                        updateSession(
                          session.id,
                          "date",
                          event.target.value
                        )
                      }
                    />

                    <div className="je-session-time">
                      <input
                        type="number"
                        min="0"
                        value={
                          session.hours
                        }
                        onChange={(
                          event
                        ) =>
                          updateSession(
                            session.id,
                            "hours",
                            event.target.value
                          )
                        }
                      />

                      <span>
                        h
                      </span>

                      <input
                        type="number"
                        min="0"
                        max="59"
                        value={
                          session.minutes
                        }
                        onChange={(
                          event
                        ) =>
                          updateSession(
                            session.id,
                            "minutes",
                            event.target.value
                          )
                        }
                      />

                      <span>
                        m
                      </span>
                    </div>

                    <input
                      type="text"
                      className="je-session-note"
                      value={
                        session.note
                      }
                      onChange={(
                        event
                      ) =>
                        updateSession(
                          session.id,
                          "note",
                          event.target.value
                        )
                      }
                      placeholder="What did you work on?"
                    />

                    <button
                      type="button"
                      className="je-delete-session"
                      onClick={() =>
                        removeSession(
                          session.id
                        )
                      }
                    >
                      <Trash2 />
                    </button>
                  </div>
                )
              )}
            </div>

            <button
              type="button"
              className="je-add-session"
              onClick={
                addSession
              }
            >
              + Add session
            </button>
          </section>
        ) : null}

        <section className="je-section">
          <div className="je-section-heading">
            <div>
              <span>
                MEMORIES
              </span>

              <h2>
                Add your images
              </h2>

              <p>
                Add two images to your
                journal entry.
              </p>
            </div>

            <ImagePlus />
          </div>

          <div className="je-images">
            <label className="je-image-slot">
              {imageOnePreview ? (
                <>
                  <img
                    src={
                      imageOnePreview
                    }
                    alt="Journal image 1"
                  />

                  <button
                    type="button"
                    onClick={(event) => {
                      event.preventDefault();

                      removeImage(1);
                    }}
                  >
                    <Trash2 />
                  </button>
                </>
              ) : (
                <>
                  <ImagePlus />

                  <strong>
                    Image 1
                  </strong>

                  <span>
                    Click to upload
                  </span>
                </>
              )}

              <input
                type="file"
                accept="image/*"
                onChange={(event) =>
                  handleImage(
                    event,
                    1
                  )
                }
              />
            </label>

            <label className="je-image-slot">
              {imageTwoPreview ? (
                <>
                  <img
                    src={
                      imageTwoPreview
                    }
                    alt="Journal image 2"
                  />

                  <button
                    type="button"
                    onClick={(event) => {
                      event.preventDefault();

                      removeImage(2);
                    }}
                  >
                    <Trash2 />
                  </button>
                </>
              ) : (
                <>
                  <ImagePlus />

                  <strong>
                    Image 2
                  </strong>

                  <span>
                    Click to upload
                  </span>
                </>
              )}

              <input
                type="file"
                accept="image/*"
                onChange={(event) =>
                  handleImage(
                    event,
                    2
                  )
                }
              />
            </label>
          </div>
        </section>

        <section className="je-publish-card">
          <div>
            <span>
              READY TO PUBLISH?
            </span>

            <h2>
              Save this moment.
            </h2>

            <p>
              Your entry will eventually
              be written to
              <code>
                journal/journal.md
              </code>{" "}
              with your images.
            </p>
          </div>

          <button
            type="button"
            onClick={saveEntry}
            disabled={saving}
          >
            {saving ? (
              <LoaderCircle
                className="je-spin"
              />
            ) : (
              <Save />
            )}

            {saving
              ? "Publishing..."
              : "Save & Publish"}
          </button>
        </section>
      </section>
    </main>
  );
}