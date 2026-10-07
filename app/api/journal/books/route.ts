import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabase } from "@/lib/supabase/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CreateBookBody = {
  name?: string;
  ysws?: string;
  trackingMode?: "hackatime" | "manual";
  hackatimeProject?: string | null;
  githubRepo?: string;
  githubUrl?: string | null;
};

type HackatimeProject = {
  name?: string;
  total_seconds?: number;
  archived?: boolean;
};

function jsonResponse(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}

function getUserId() {
  const cookieStore = cookies();

  return cookieStore.get("journal_user_id")?.value ?? null;
}

export async function GET() {
  try {
    const userId = getUserId();

    if (!userId) {
      return jsonResponse(
        {
          error: "Not authenticated.",
          books: [],
        },
        401
      );
    }

    const { data: books, error } = await supabase
      .from("journal_books")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      console.error("Journal books GET error:", error);

      return jsonResponse(
        {
          error: "Failed to load journal books.",
          details: error.message,
          books: [],
        },
        500
      );
    }

    return jsonResponse({
      books: books ?? [],
    });
  } catch (error) {
    console.error("Journal books GET exception:", error);

    return jsonResponse(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to load journal books.",
        books: [],
      },
      500
    );
  }
}

export async function POST(request: Request) {
  try {
    const userId = getUserId();

    if (!userId) {
      return jsonResponse(
        {
          error: "Not authenticated.",
        },
        401
      );
    }

    let body: CreateBookBody;

    try {
      body = (await request.json()) as CreateBookBody;
    } catch {
      return jsonResponse(
        {
          error: "Invalid JSON request body.",
        },
        400
      );
    }

    const name = body.name?.trim() ?? "";
    const ysws = body.ysws?.trim() ?? "";
    const githubRepo = body.githubRepo?.trim() ?? "";
    const githubUrl = body.githubUrl?.trim() || null;

    const trackingMode =
      body.trackingMode === "manual"
        ? "manual"
        : "hackatime";

    const hackatimeProject =
      body.hackatimeProject?.trim() || null;

    if (!name) {
      return jsonResponse(
        {
          error: "Project name is required.",
        },
        400
      );
    }

    if (!ysws) {
      return jsonResponse(
        {
          error: "YSWS / shipping program is required.",
        },
        400
      );
    }

    if (!githubRepo) {
      return jsonResponse(
        {
          error: "GitHub repository is required.",
        },
        400
      );
    }

    if (
      trackingMode === "hackatime" &&
      !hackatimeProject
    ) {
      return jsonResponse(
        {
          error:
            "Hackatime project is required when using Hackatime tracking.",
        },
        400
      );
    }

    const {
      data: user,
      error: userError,
    } = await supabase
      .from("users")
      .select(
        "id, github_access_token, github_connected, hackatime_access_token, hackatime_connected"
      )
      .eq("id", userId)
      .single();

    if (userError) {
      console.error(
        "Journal books user lookup error:",
        userError
      );

      return jsonResponse(
        {
          error: "Failed to load your account.",
          details: userError.message,
        },
        500
      );
    }

    if (!user) {
      return jsonResponse(
        {
          error: "User account not found.",
        },
        404
      );
    }

    if (!user.github_access_token) {
      return jsonResponse(
        {
          error:
            "GitHub is not connected. Reconnect GitHub from your Profile page.",
        },
        400
      );
    }

    let initialHackatimeSeconds = 0;

    if (trackingMode === "hackatime") {
      if (!user.hackatime_access_token) {
        return jsonResponse(
          {
            error:
              "Hackatime is not connected. Reconnect Hackatime from your Profile page.",
          },
          400
        );
      }

      try {
        const response = await fetch(
          "https://hackatime.hackclub.com/api/v1/authenticated/projects?include_archived=false",
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${user.hackatime_access_token}`,
              Accept: "application/json",
            },
            cache: "no-store",
          }
        );

        const text = await response.text();

        let data: unknown = null;

        if (text.trim()) {
          try {
            data = JSON.parse(text);
          } catch {
            data = null;
          }
        }

        if (!response.ok) {
          console.error(
            "Hackatime projects error:",
            response.status,
            text
          );

          return jsonResponse(
            {
              error:
                "Failed to read your Hackatime projects.",
            },
            502
          );
        }

        let projects: HackatimeProject[] = [];

        if (Array.isArray(data)) {
          projects = data as HackatimeProject[];
        } else if (
          data &&
          typeof data === "object"
        ) {
          const objectData = data as {
            projects?: HackatimeProject[];
            data?: HackatimeProject[];
          };

          if (Array.isArray(objectData.projects)) {
            projects = objectData.projects;
          } else if (Array.isArray(objectData.data)) {
            projects = objectData.data;
          }
        }

        const selectedProject = projects.find(
          (project) =>
            project.name?.trim() === hackatimeProject
        );

        if (selectedProject) {
          initialHackatimeSeconds =
            Number(
              selectedProject.total_seconds ?? 0
            );
        }
      } catch (error) {
        console.error(
          "Hackatime request error:",
          error
        );

        return jsonResponse(
          {
            error:
              "Unable to contact Hackatime while creating the journal book.",
          },
          502
        );
      }
    }

    const {
      data: book,
      error: insertError,
    } = await supabase
      .from("journal_books")
      .insert({
        user_id: userId,
        name,
        ysws,
        github_repo: githubRepo,
        github_url: githubUrl,
        tracking_mode: trackingMode,
        hackatime_project:
          trackingMode === "hackatime"
            ? hackatimeProject
            : null,
        last_hackatime_seconds:
          initialHackatimeSeconds,
      })
      .select("*")
      .single();

    if (insertError) {
      console.error(
        "Journal book INSERT error:",
        insertError
      );

      return jsonResponse(
        {
          error:
            insertError.message ||
            "Failed to create journal book.",
        },
        500
      );
    }

    return jsonResponse(
      {
        success: true,
        book,
      },
      201
    );
  } catch (error) {
    console.error(
      "Journal book POST error:",
      error
    );

    return jsonResponse(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to create journal book.",
      },
      500
    );
  }
}