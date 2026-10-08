import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabase } from "@/lib/supabase/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const GITHUB_API = "https://api.github.com";
const GITHUB_API_VERSION = "2026-03-10";

const JOURNAL_BRANCH = "journal";

function jsonResponse(
  data: unknown,
  status = 200
) {
  return NextResponse.json(data, {
    status,
    headers: {
      "Cache-Control":
        "no-store, no-cache, must-revalidate",
    },
  });
}

type ManualSession = {
  id?: string;
  date?: string;
  hours?: string | number;
  minutes?: string | number;
  note?: string;
};

type PublishInput = {
  date: string;
  title: string;
  content: string;
  sessions: ManualSession[];
  imageFiles: File[];
};

type GithubContentResponse = {
  type?: string;
  encoding?: string;
  size?: number;
  name?: string;
  path?: string;
  content?: string;
  sha?: string;
  url?: string;
  git_url?: string;
  html_url?: string;
  download_url?: string | null;
  message?: string;
  documentation_url?: string;

  commit?: {
    sha?: string;
    url?: string;
    html_url?: string;
    message?: string;
  };
};

type GithubRepositoryResponse = {
  id?: number;
  name?: string;
  full_name?: string;
  private?: boolean;
  visibility?: string;

  default_branch?: string;

  permissions?: {
    admin?: boolean;
    maintain?: boolean;
    push?: boolean;
    triage?: boolean;
    pull?: boolean;
  };

  message?: string;
  documentation_url?: string;
};

type GithubRefResponse = {
  ref?: string;
  node_id?: string;
  url?: string;
  object?: {
    sha?: string;
    type?: string;
    url?: string;
  };
};

function githubHeaders(token: string) {
  return {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token}`,
    "X-GitHub-Api-Version":
      GITHUB_API_VERSION,
    "Content-Type": "application/json",
  };
}

async function githubRequest(
  token: string,
  url: string,
  init?: RequestInit
) {
  return fetch(url, {
    ...init,
    headers: {
      ...githubHeaders(token),
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });
}

function safeFileName(name: string) {
  const cleaned = name
    .normalize("NFKD")
    .replace(
      /[^a-zA-Z0-9._-]+/g,
      "-"
    )
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return cleaned || "image";
}

function encodeRepoPath(path: string) {
  return path
    .split("/")
    .map((part) =>
      encodeURIComponent(part)
    )
    .join("/");
}

function parseRepo(value: string) {
  const cleaned = value
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(
      /^www\.github\.com\//,
      ""
    )
    .replace(
      /^github\.com\//,
      ""
    )
    .replace(/\.git$/, "")
    .replace(/^\/+|\/+$/g, "");

  const parts = cleaned
    .split("/")
    .filter(Boolean);

  if (parts.length !== 2) {
    throw new Error(
      "GitHub repository must be in owner/repository format."
    );
  }

  return {
    owner: parts[0],
    repo: parts[1],
  };
}

async function parsePublishRequest(
  request: Request
): Promise<PublishInput> {
  const contentType =
    request.headers.get(
      "content-type"
    ) || "";

  if (
    contentType.includes(
      "multipart/form-data"
    )
  ) {
    const form =
      await request.formData();

    const date = String(
      form.get("date") || ""
    ).trim();

    const title = String(
      form.get("title") || ""
    ).trim();

    const content = String(
      form.get("content") || ""
    );

    const sessionsRaw = String(
      form.get("sessions") || "[]"
    );

    let sessions: ManualSession[] =
      [];

    try {
      const parsed =
        JSON.parse(sessionsRaw);

      if (Array.isArray(parsed)) {
        sessions =
          parsed as ManualSession[];
      }
    } catch {
      throw new Error(
        "Invalid manual sessions data."
      );
    }

    const imageFiles: File[] = [];

    for (const key of [
      "image1",
      "image2",
    ]) {
      const value = form.get(key);

      if (
        value instanceof File &&
        value.size > 0
      ) {
        imageFiles.push(value);
      }
    }

    return {
      date,
      title,
      content,
      sessions,
      imageFiles,
    };
  }

  let body: Record<
    string,
    unknown
  >;

  try {
    body =
      (await request.json()) as Record<
        string,
        unknown
      >;
  } catch {
    throw new Error(
      "Invalid JSON request body."
    );
  }

  return {
    date: String(
      body.date || ""
    ).trim(),

    title: String(
      body.title || ""
    ).trim(),

    content: String(
      body.content || ""
    ),

    sessions: Array.isArray(
      body.sessions
    )
      ? (body.sessions as ManualSession[])
      : [],

    imageFiles: [],
  };
}

async function getGithubUser(
  token: string
) {
  const response =
    await githubRequest(
      token,
      `${GITHUB_API}/user`
    );

  const text =
    await response.text();

  let data:
    | {
      login?: string;
      message?: string;
    }
    | null = null;

  if (text.trim()) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }

  if (!response.ok) {
    throw new Error(
      data?.message ||
      `GitHub authentication check failed (HTTP ${response.status}).`
    );
  }

  const scopes =
    response.headers.get(
      "x-oauth-scopes"
    ) || "";

  return {
    login: data?.login || "",

    scopes: scopes
      .split(",")
      .map((scope) => scope.trim())
      .filter(Boolean),
  };
}

async function getRepository(
  token: string,
  owner: string,
  repo: string
) {
  const response =
    await githubRequest(
      token,
      `${GITHUB_API}/repos/${encodeURIComponent(
        owner
      )}/${encodeURIComponent(repo)}`
    );

  const text =
    await response.text();

  let data:
    | GithubRepositoryResponse
    | null = null;

  if (text.trim()) {
    try {
      data =
        JSON.parse(
          text
        ) as GithubRepositoryResponse;
    } catch {
      data = null;
    }
  }

  if (!response.ok) {
    throw new Error(
      data?.message ||
      `GitHub repository could not be loaded (HTTP ${response.status}).`
    );
  }

  if (!data) {
    throw new Error(
      "GitHub returned an empty repository response."
    );
  }

  return data;
}

async function getBranchRef(
  token: string,
  owner: string,
  repo: string,
  branch: string
): Promise<GithubRefResponse | null> {
  const response =
    await githubRequest(
      token,
      `${GITHUB_API}/repos/${encodeURIComponent(
        owner
      )}/${encodeURIComponent(
        repo
      )}/git/ref/heads/${encodeURIComponent(
        branch
      )}`
    );

  const text =
    await response.text();

  let data:
    | GithubRefResponse
    | null = null;

  if (text.trim()) {
    try {
      data =
        JSON.parse(
          text
        ) as GithubRefResponse;
    } catch {
      data = null;
    }
  }

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(
      data &&
        "message" in data
        ? String(
          (
            data as {
              message?: string;
            }
          ).message || ""
        )
        : `GitHub could not read branch "${branch}" (HTTP ${response.status}).`
    );
  }

  return data;
}

async function createBranch(
  token: string,
  owner: string,
  repo: string,
  branch: string,
  sourceBranch: string
) {

  const sourceResponse =
    await githubRequest(
      token,
      `${GITHUB_API}/repos/${encodeURIComponent(
        owner
      )}/${encodeURIComponent(
        repo
      )}/git/ref/heads/${encodeURIComponent(
        sourceBranch
      )}`
    );

  const sourceText =
    await sourceResponse.text();

  let sourceData:
    | GithubRefResponse
    | null = null;

  if (sourceText.trim()) {
    try {
      sourceData =
        JSON.parse(
          sourceText
        ) as GithubRefResponse;
    } catch {
      sourceData = null;
    }
  }

  if (
    !sourceResponse.ok ||
    !sourceData?.object?.sha
  ) {
    throw new Error(
      sourceData
        ? `GitHub could not read the repository branch "${sourceBranch}".`
        : `GitHub could not read the repository branch "${sourceBranch}" (HTTP ${sourceResponse.status}).`
    );
  }

  const createResponse =
    await githubRequest(
      token,
      `${GITHUB_API}/repos/${encodeURIComponent(
        owner
      )}/${encodeURIComponent(
        repo
      )}/git/refs`,
      {
        method: "POST",
        body: JSON.stringify({
          ref: `refs/heads/${branch}`,
          sha: sourceData.object.sha,
        }),
      }
    );

  const createText =
    await createResponse.text();

  let createData:
    | GithubRefResponse
    | {
      message?: string;
    }
    | null = null;

  if (createText.trim()) {
    try {
      createData =
        JSON.parse(createText);
    } catch {
      createData = null;
    }
  }

  if (
    createResponse.status ===
    422
  ) {
    const existing =
      await getBranchRef(
        token,
        owner,
        repo,
        branch
      );

    if (existing) {
      return existing;
    }
  }

  if (!createResponse.ok) {
    throw new Error(
      createData &&
        "message" in createData
        ? String(
          createData.message ||
          ""
        )
        : `GitHub could not create the "${branch}" branch (HTTP ${createResponse.status}).`
    );
  }

  return createData as GithubRefResponse;
}

async function ensureJournalBranch(
  token: string,
  owner: string,
  repo: string,
  defaultBranch: string
) {
  const existing =
    await getBranchRef(
      token,
      owner,
      repo,
      JOURNAL_BRANCH
    );

  if (existing) {
    console.log(
      "Journal branch already exists:",
      {
        repository:
          `${owner}/${repo}`,
        branch:
          JOURNAL_BRANCH,
      }
    );

    return JOURNAL_BRANCH;
  }

  await createBranch(
    token,
    owner,
    repo,
    JOURNAL_BRANCH,
    defaultBranch
  );

  console.log(
    "Created Journal branch:",
    {
      repository:
        `${owner}/${repo}`,
      branch:
        JOURNAL_BRANCH,
      source:
        defaultBranch,
    }
  );

  return JOURNAL_BRANCH;
}

async function getGithubFile(
  token: string,
  owner: string,
  repo: string,
  path: string,
  branch: string
): Promise<GithubContentResponse | null> {
  const url =
    `${GITHUB_API}/repos/${encodeURIComponent(
      owner
    )}/${encodeURIComponent(
      repo
    )}/contents/${encodeRepoPath(
      path
    )}?ref=${encodeURIComponent(
      branch
    )}`;

  const response =
    await githubRequest(
      token,
      url
    );

  const text =
    await response.text();

  let data:
    | GithubContentResponse
    | null = null;

  if (text.trim()) {
    try {
      data =
        JSON.parse(
          text
        ) as GithubContentResponse;
    } catch {
      data = null;
    }
  }

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(
      data?.message ||
      `GitHub could not read ${path} (HTTP ${response.status}).`
    );
  }

  return data;
}

async function putGithubFile(
  token: string,
  owner: string,
  repo: string,
  path: string,
  content: Buffer,
  message: string,
  branch: string,
  sha?: string
): Promise<GithubContentResponse | null> {
  const url =
    `${GITHUB_API}/repos/${encodeURIComponent(
      owner
    )}/${encodeURIComponent(
      repo
    )}/contents/${encodeRepoPath(
      path
    )}`;

  const body: Record<
    string,
    unknown
  > = {
    message,

    content:
      content.toString("base64"),

    branch,
  };

  if (sha) {
    body.sha = sha;
  }

  console.log(
    "GitHub file write:",
    {
      path,
      branch,
      hasSha: Boolean(sha),
    }
  );

  const response =
    await githubRequest(
      token,
      url,
      {
        method: "PUT",
        body: JSON.stringify(
          body
        ),
      }
    );

  const text =
    await response.text();

  let data:
    | GithubContentResponse
    | null = null;

  if (text.trim()) {
    try {
      data =
        JSON.parse(
          text
        ) as GithubContentResponse;
    } catch {
      data = null;
    }
  }

  if (!response.ok) {
    console.error(
      "GitHub file write failed:",
      {
        status:
          response.status,
        path,
        owner,
        repo,
        branch,
        hasSha:
          Boolean(sha),
        response: data,
      }
    );

    if (
      response.status ===
      401
    ) {
      throw new Error(
        "GitHub authentication expired or is invalid. Reconnect GitHub from Profile and try again."
      );
    }

    if (
      response.status ===
      404
    ) {
      throw new Error(
        `GitHub returned 404 while writing ${path}. The repository exists, but the connected GitHub token does not appear to have write access to ${owner}/${repo}, or the branch "${branch}" does not exist.`
      );
    }

    if (
      response.status ===
      403
    ) {
      throw new Error(
        `GitHub denied write access to ${owner}/${repo}. Your connected GitHub account/token does not have permission to push to this repository.`
      );
    }

    if (
      response.status ===
      409
    ) {
      throw new Error(
        `GitHub reported a conflict while updating ${path}. The repository changed during publishing. Please publish again.`
      );
    }

    throw new Error(
      data?.message ||
      `GitHub could not publish ${path} (HTTP ${response.status}).`
    );
  }

  return data;
}

function manualSeconds(
  sessions: ManualSession[]
) {
  return sessions.reduce(
    (
      total,
      session
    ) => {
      const hours =
        Number(
          session.hours || 0
        );

      const minutes =
        Number(
          session.minutes || 0
        );

      if (
        !Number.isFinite(
          hours
        ) ||
        !Number.isFinite(
          minutes
        )
      ) {
        return total;
      }

      return (
        total +
        hours * 3600 +
        minutes * 60
      );
    },
    0
  );
}

async function getHackatimeSeconds(
  token: string,
  projectName: string
) {
  const response =
    await fetch(
      "https://hackatime.hackclub.com/api/v1/authenticated/projects?include_archived=false",
      {
        headers: {
          Authorization:
            `Bearer ${token}`,
          Accept:
            "application/json",
        },
        cache: "no-store",
      }
    );

  const text =
    await response.text();

  let data: unknown = null;

  if (text.trim()) {
    try {
      data =
        JSON.parse(text);
    } catch {
      data = null;
    }
  }

  if (!response.ok) {
    return null;
  }

  const projects =
    Array.isArray(data)
      ? data
      : data &&
        typeof data ===
        "object" &&
        "projects" in data
        ? (
          data as {
            projects?: unknown;
          }
        ).projects
        : [];

  if (!Array.isArray(projects)) {
    return null;
  }

  const project =
    projects.find(
      (item) =>
        item &&
        typeof item ===
        "object" &&
        String(
          (
            item as {
              name?: unknown;
            }
          ).name || ""
        ) === projectName
    ) as
    | {
      total_seconds?: unknown;
    }
    | undefined;

  return project
    ? Number(
      project.total_seconds || 0
    )
    : null;
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
      (seconds % 3600) /
      60
    );

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  return `${minutes}m`;
}

function buildEntryMarkdown(
  args: {
    date: string;
    title: string;
    content: string;
    timeSeconds: number;
    imagePaths: string[];
  }
) {
  const titleLine =
    args.title
      ? `## ${args.title}`
      : "## Journal Entry";

  const timeLine =
    `**Time:** ${formatTime(
      args.timeSeconds
    )}`;

  const imageMarkdown =
    args.imagePaths.length > 0
      ? [
        "",
        "### Images",
        "",
        ...args.imagePaths.map(
          (
            path,
            index
          ) =>
            `![Journal image ${index + 1
            }](${path.replace(
              /^journal\//,
              ""
            )})`
        ),
      ].join("\n")
      : "";

  return [
    `# ${args.date}`,
    "",
    titleLine,
    "",
    timeLine,
    "",
    args.content.trim(),
    imageMarkdown,
    "",
    "---",
    "",
  ].join("\n");
}

async function getExistingMarkdown(
  token: string,
  owner: string,
  repo: string,
  branch: string
) {
  const journalPath =
    "journal/journal.md";

  const file =
    await getGithubFile(
      token,
      owner,
      repo,
      journalPath,
      branch
    );

  if (!file) {
    return {
      path: journalPath,
      sha: undefined,
      markdown: "",
    };
  }
  const sha =
    file.sha;

  let markdown = "";

  if (file.content) {
    try {
      const cleanContent =
        file.content.replace(
          /\n/g,
          ""
        );

      markdown =
        Buffer.from(
          cleanContent,
          file.encoding ===
            "base64"
            ? "base64"
            : "utf8"
        ).toString(
          "utf8"
        );
    } catch (error) {
      console.error(
        "Failed to decode journal.md:",
        error
      );

      markdown = "";
    }
  }

  return {
    path: journalPath,
    sha,
    markdown,
  };
}

export async function POST(
  request: Request,
  context: {
    params: {
      id: string;
    };
  }
) {
  try {
    const userId =
      cookies().get(
        "journal_user_id"
      )?.value;

    if (!userId) {
      return jsonResponse(
        {
          error:
            "Not authenticated.",
        },
        401
      );
    }

    const bookId =
      context.params.id;

    const {
      data: book,
      error: bookError,
    } = await supabase
      .from("journal_books")
      .select("*")
      .eq("id", bookId)
      .eq("user_id", userId)
      .single();

    if (
      bookError ||
      !book
    ) {
      return jsonResponse(
        {
          error:
            "Journal book not found.",
        },
        404
      );
    }

    if (!book.github_repo) {
      return jsonResponse(
        {
          error:
            "No GitHub repository is connected to this journal.",
        },
        400
      );
    }

    const {
      data: user,
      error: userError,
    } = await supabase
      .from("users")
      .select("*")
      .eq("id", userId)
      .single();

    if (
      userError ||
      !user
    ) {
      return jsonResponse(
        {
          error:
            "User account not found. Please log out and sign in again.",
        },
        404
      );
    }

    if (
      !user.github_access_token
    ) {
      return jsonResponse(
        {
          error:
            "GitHub is not connected. Reconnect GitHub from Profile.",
        },
        400
      );
    }

    const input =
      await parsePublishRequest(
        request
      );

    if (!input.date) {
      return jsonResponse(
        {
          error:
            "Entry date is required.",
        },
        400
      );
    }

    if (
      !input.content.trim()
    ) {
      return jsonResponse(
        {
          error:
            "Write something before publishing.",
        },
        400
      );
    }

    if (
      input.imageFiles.length <
      2
    ) {
      return jsonResponse(
        {
          error:
            "Please add both images before publishing.",
        },
        400
      );
    }

    for (const file of
      input.imageFiles) {
      if (
        file.size >
        5 * 1024 * 1024
      ) {
        return jsonResponse(
          {
            error:
              "Each image must be smaller than 5 MB.",
          },
          400
        );
      }
    }

    const repo =
      parseRepo(
        book.github_repo
      );

    const githubUser =
      await getGithubUser(
        user.github_access_token
      );

    const repository =
      await getRepository(
        user.github_access_token,
        repo.owner,
        repo.repo
      );

    const defaultBranch =
      repository.default_branch ||
      "main";

    if (
      repository.permissions &&
      repository.permissions
        .push === false
    ) {
      return jsonResponse(
        {
          error:
            `You can access ${repo.owner}/${repo.repo}, but you do not have permission to push to it.`,

          githubUser:
            githubUser.login ||
            null,

          repository:
            `${repo.owner}/${repo.repo}`,
        },
        403
      );
    }

    if (
      githubUser.scopes.length >
      0 &&
      repository.private &&
      !githubUser.scopes.includes(
        "repo"
      )
    ) {
      return jsonResponse(
        {
          error:
            "Your GitHub connection does not have the repo permission required to write to this private repository. Reconnect GitHub and grant repository access.",

          repository:
            `${repo.owner}/${repo.repo}`,
        },
        403
      );
    }

    if (
      githubUser.scopes.length >
      0 &&
      !repository.private &&
      !githubUser.scopes.includes(
        "repo"
      ) &&
      !githubUser.scopes.includes(
        "public_repo"
      )
    ) {
      return jsonResponse(
        {
          error:
            "Your GitHub connection does not have permission to write repository contents. Reconnect GitHub and grant repository access.",

          repository:
            `${repo.owner}/${repo.repo}`,
        },
        403
      );
    }

    const branch =
      await ensureJournalBranch(
        user.github_access_token,
        repo.owner,
        repo.repo,
        defaultBranch
      );

    let timeSeconds = 0;

    let currentHackatimeSeconds:
      | number
      | null = null;

    if (
      book.tracking_mode ===
      "manual"
    ) {
      timeSeconds =
        manualSeconds(
          input.sessions
        );

      if (
        timeSeconds <= 0
      ) {
        return jsonResponse(
          {
            error:
              "Add some manual time first.",
          },
          400
        );
      }
    } else {
      if (
        !user.hackatime_access_token
      ) {
        return jsonResponse(
          {
            error:
              "Hackatime is not connected.",
          },
          400
        );
      }

      currentHackatimeSeconds =
        await getHackatimeSeconds(
          user.hackatime_access_token,
          book.hackatime_project ||
          ""
        );

      if (
        currentHackatimeSeconds ===
        null
      ) {
        return jsonResponse(
          {
            error:
              "Could not read the selected Hackatime project.",
          },
          502
        );
      }

      const previous =
        Number(
          book.last_hackatime_seconds ||
          0
        );

      timeSeconds =
        Math.max(
          currentHackatimeSeconds -
          previous,
          0
        );
    }

    const imagePaths: string[] =
      [];

    const imageUploads: Array<{
      path: string;
      file: File;
    }> = [];

    for (
      let index = 0;
      index <
      input.imageFiles.length;
      index += 1
    ) {
      const file =
        input.imageFiles[index];

      const cleanName =
        safeFileName(
          file.name
        );

      const extension =
        cleanName.includes(".")
          ? cleanName
            .split(".")
            .pop() ||
          "png"
          : "png";

      const baseName =
        cleanName.replace(
          /\.[^.]+$/,
          ""
        ) ||
        `image-${index + 1}`;

      const path =
        `journal/images/${Date.now()}-${index + 1}-${baseName}.${extension}`;

      imagePaths.push(path);

      imageUploads.push({
        path,
        file,
      });
    }

    const existingJournal =
      await getExistingMarkdown(
        user.github_access_token,
        repo.owner,
        repo.repo,
        branch
      );

    console.log(
      "Existing journal file:",
      {
        exists:
          Boolean(
            existingJournal
          ),

        sha:
          existingJournal.sha,

        hasMarkdown:
          Boolean(
            existingJournal.markdown
          ),

        branch,
      }
    );

    const entryMarkdown =
      buildEntryMarkdown({
        date: input.date,

        title:
          input.title,

        content:
          input.content,

        timeSeconds,

        imagePaths,
      });

    const newMarkdown =
      existingJournal.markdown
        ? `${existingJournal.markdown.replace(
          /\s*$/,
          ""
        )}\n\n${entryMarkdown}`
        : `# ${book.name}\n\n${entryMarkdown}`;


    for (const upload of
      imageUploads) {
      const bytes =
        Buffer.from(
          await upload.file.arrayBuffer()
        );

      const existingImage =
        await getGithubFile(
          user.github_access_token,
          repo.owner,
          repo.repo,
          upload.path,
          branch
        );

      await putGithubFile(
        user.github_access_token,
        repo.owner,
        repo.repo,
        upload.path,
        bytes,
        `journal: add image for ${input.date}`,
        branch,
        existingImage?.sha
      );
    }

    const journalResult =
      await putGithubFile(
        user.github_access_token,
        repo.owner,
        repo.repo,
        existingJournal.path,
        Buffer.from(
          newMarkdown,
          "utf8"
        ),
        `journal: add entry for ${input.date}`,
        branch,
        existingJournal.sha
      );

    const {
      data: entry,
      error: entryError,
    } = await supabase
      .from("journal_entries")
      .insert({
        book_id:
          bookId,

        title:
          input.title || null,

        content_markdown:
          input.content,

        entry_date:
          input.date,

        time_seconds:
          timeSeconds,

        sessions:
          input.sessions,

        image_paths:
          imagePaths,

        github_commit_sha:
          journalResult?.commit
            ?.sha || null,
      })
      .select("*")
      .single();

    if (entryError) {
      console.error(
        "Journal entry database error after GitHub publish:",
        entryError
      );

      return jsonResponse(
        {
          success: true,

          githubPublished:
            true,

          databaseSaved:
            false,

          warning:
            "Published to GitHub successfully, but the local journal entry could not be saved.",

          githubCommitSha:
            journalResult?.commit
              ?.sha || null,

          githubJournalPath:
            "journal/journal.md",

          githubImagePaths:
            imagePaths,

          githubRepository:
            `${repo.owner}/${repo.repo}`,

          githubBranch:
            branch,
        },
        201
      );
    }

    if (
      book.tracking_mode ===
      "hackatime" &&
      currentHackatimeSeconds !==
      null
    ) {
      const {
        error: updateError,
      } = await supabase
        .from("journal_books")
        .update({
          last_hackatime_seconds:
            currentHackatimeSeconds,

          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          bookId
        )
        .eq(
          "user_id",
          userId
        );

      if (updateError) {
        console.error(
          "Journal book baseline update error:",
          updateError
        );
      }
    } else {
      const {
        error: updateError,
      } = await supabase
        .from("journal_books")
        .update({
          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          bookId
        )
        .eq(
          "user_id",
          userId
        );

      if (updateError) {
        console.error(
          "Journal book updated_at error:",
          updateError
        );
      }
    }

    return jsonResponse(
      {
        success: true,

        githubPublished:
          true,

        databaseSaved:
          true,

        entry,

        currentHackatimeSeconds,

        timeSeconds,

        githubCommitSha:
          journalResult?.commit
            ?.sha || null,

        githubJournalPath:
          "journal/journal.md",

        githubImagePaths:
          imagePaths,

        githubRepository:
          `${repo.owner}/${repo.repo}`,

        githubBranch:
          branch,
      },
      201
    );
  } catch (error) {
    console.error(
      "Journal publish error:",
      error
    );

    return jsonResponse(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to publish journal to GitHub.",
      },
      500
    );
  }
}

export async function GET() {
  return jsonResponse(
    {
      error:
        "Publishing a journal entry requires POST.",
    },
    405
  );
}