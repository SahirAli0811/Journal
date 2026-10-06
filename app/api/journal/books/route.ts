import {
  NextRequest,
  NextResponse,
} from "next/server";

import { supabase } from "@/lib/supabase/supabase";

type CreateBookBody = {
  name?: string;
  ysws?: string;
  githubRepo?: string;
  githubUrl?: string | null;
  trackingMode?: "hackatime" | "manual";
  hackatimeProject?: string | null;
};

function clean(
  value: unknown
) {
  return typeof value === "string"
    ? value.trim()
    : "";
}

async function getHackatimeProject(
  token: string,
  projectName: string
) {
  const response = await fetch(
    "https://hackatime.hackclub.com/api/v1/authenticated/projects?include_archived=false",
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      cache: "no-store",
    }
  );

  if (!response.ok) {
    const text =
      await response.text();

    console.error(
      "Hackatime projects error:",
      text
    );

    throw new Error(
      "Could not load Hackatime projects."
    );
  }

  const data =
    await response.json();

  const projects =
    Array.isArray(data?.projects)
      ? data.projects
      : [];

  return (
    projects.find(
      (project: {
        name?: string;
      }) =>
        project.name ===
        projectName
    ) || null
  );
}

export async function GET(
  request: NextRequest
) {
  try {
    const userId =
      request.cookies.get(
        "journal_user_id"
      )?.value;

    if (!userId) {
      return NextResponse.json(
        {
          error:
            "Not authenticated",
        },
        {
          status: 401,
        }
      );
    }

    const {
      data,
      error,
    } = await supabase
      .from("journal_books")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      console.error(
        "journal_books GET:",
        error
      );

      return NextResponse.json(
        {
          error:
            error.message,
        },
        {
          status: 500,
        }
      );
    }

    return NextResponse.json({
      books: data || [],
    });
  } catch (error) {
    console.error(
      "journal_books GET exception:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to load books.",
      },
      {
        status: 500,
      }
    );
  }
}

export async function POST(
  request: NextRequest
) {
  try {
    const userId =
      request.cookies.get(
        "journal_user_id"
      )?.value;

    if (!userId) {
      return NextResponse.json(
        {
          error:
            "Not authenticated",
        },
        {
          status: 401,
        }
      );
    }

    const body =
      (await request.json()) as CreateBookBody;

    const name =
      clean(body.name);

    const ysws =
      clean(body.ysws);

    const githubRepo =
      clean(body.githubRepo);

    const githubUrl =
      clean(body.githubUrl);

    const trackingMode =
      body.trackingMode ===
      "manual"
        ? "manual"
        : "hackatime";

    const hackatimeProject =
      clean(
        body.hackatimeProject
      );

    if (!name) {
      return NextResponse.json(
        {
          error:
            "Project name is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (!ysws) {
      return NextResponse.json(
        {
          error:
            "YSWS / Shipping On is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (!githubRepo) {
      return NextResponse.json(
        {
          error:
            "GitHub repository is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      trackingMode ===
        "hackatime" &&
      !hackatimeProject
    ) {
      return NextResponse.json(
        {
          error:
            "Select a Hackatime project.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * Get the current user.
     *
     * We intentionally use select("*") here because
     * your users table has evolved and already contains
     * the integration columns.
     */

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
      console.error(
        "users lookup:",
        userError
      );

      return NextResponse.json(
        {
          error:
            "User account not found.",
        },
        {
          status: 404,
        }
      );
    }

    /*
     * GitHub is required for every book.
     */

    const githubToken =
      user.github_access_token;

    if (!githubToken) {
      return NextResponse.json(
        {
          error:
            "GitHub is not connected. Connect GitHub from your Profile first.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * Hackatime is optional.
     */

    let initialSeconds = 0;

    if (
      trackingMode ===
      "hackatime"
    ) {
      const hackatimeToken =
        user.hackatime_access_token;

      if (!hackatimeToken) {
        return NextResponse.json(
          {
            error:
              "Hackatime is not connected.",
          },
          {
            status: 400,
          }
        );
      }

      const selectedProject =
        await getHackatimeProject(
          hackatimeToken,
          hackatimeProject
        );

      if (!selectedProject) {
        return NextResponse.json(
          {
            error:
              "The selected Hackatime project was not found.",
          },
          {
            status: 400,
          }
        );
      }

      initialSeconds =
        Number(
          selectedProject.total_seconds ||
            0
        );
    }

    /*
     * Create the book.
     */

    const {
      data: book,
      error: insertError,
    } = await supabase
      .from("journal_books")
      .insert({
        user_id: userId,

        name,

        ysws,

        github_repo:
          githubRepo,

        github_url:
          githubUrl || null,

        tracking_mode:
          trackingMode,

        hackatime_project:
          trackingMode ===
          "hackatime"
            ? hackatimeProject
            : null,

        last_hackatime_seconds:
          initialSeconds,
      })
      .select("*")
      .single();

    if (
      insertError ||
      !book
    ) {
      console.error(
        "journal_books INSERT:",
        insertError
      );

      return NextResponse.json(
        {
          error:
            insertError?.message ||
            "Could not create the journal book.",
        },
        {
          status: 500,
        }
      );
    }

    return NextResponse.json(
      {
        success: true,
        book,
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error(
      "journal_books POST exception:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to create journal book.",
      },
      {
        status: 500,
      }
    );
  }
}