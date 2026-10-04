import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/supabase";

type HackatimeProject = {
  name: string;
  total_seconds: number;
  most_recent_heartbeat?: string | null;
  languages?: string[];
  archived?: boolean;
};

type HackatimeUser = {
  id?: number | string;
  emails?: string[];
  email?: string;
  slack_id?: string | null;
  github_username?: string | null;
};

type HackatimeHours = {
  total_seconds?: number;
};

function getDateRange(range: string) {
  const now = new Date();

  const start = new Date(now);
  const end = new Date(now);

  if (range === "today") {
    start.setHours(0, 0, 0, 0);
  } else if (range === "week") {
    const day = start.getDay();
    const diff = day === 0 ? 6 : day - 1;

    start.setDate(start.getDate() - diff);
    start.setHours(0, 0, 0, 0);
  } else if (range === "month") {
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
  } else if (range === "year") {
    start.setMonth(0, 1);
    start.setHours(0, 0, 0, 0);
  } else {
    // Hackatime's hours endpoint requires a date.
    // Use a very early date for "all time".
    start.setFullYear(2000, 0, 1);
    start.setHours(0, 0, 0, 0);
  }

  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  };
}

function safeNumber(value: unknown) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return 0;
  }

  return number;
}

function getString(
  value: unknown,
  fallback: string | null = null
): string | null {
  if (typeof value !== "string") {
    return fallback;
  }

  if (!value.trim()) {
    return fallback;
  }

  return value;
}

export async function GET(request: NextRequest) {
  try {
    // ---------------------------------------------------------
    // JOURNAL USER
    // ---------------------------------------------------------

    const userId = request.cookies.get("journal_user_id")?.value;

    if (!userId) {
      return NextResponse.json(
        {
          error: "Not authenticated",
        },
        { status: 401 }
      );
    }

    // ---------------------------------------------------------
    // LOAD USER
    //
    // select("*") is intentional here.
    // Your Supabase schema has evolved during development
    // (for example avatar_url / hackatime_user_id), so we
    // don't want the dashboard to fail because an older column
    // name was used.
    // ---------------------------------------------------------

    const { data: user, error: userError } = await supabase
      .from("users")
      .select("*")
      .eq("id", userId)
      .single();

    if (userError || !user) {
      console.error("Dashboard user error:", userError);

      return NextResponse.json(
        {
          error: "User account not found",
        },
        { status: 404 }
      );
    }

    // ---------------------------------------------------------
    // HACKATIME TOKEN
    // ---------------------------------------------------------

    const hackatimeToken =
      user.hackatime_access_token ??
      user.hackatime_token ??
      null;

    if (!hackatimeToken) {
      return NextResponse.json(
        {
          error: "Hackatime is not connected",
        },
        { status: 400 }
      );
    }

    // ---------------------------------------------------------
    // FILTERS
    // ---------------------------------------------------------

    const range =
      request.nextUrl.searchParams.get("range") || "all";

    const selectedProject =
      request.nextUrl.searchParams.get("project") || "all";

    const selectedLanguage =
      request.nextUrl.searchParams.get("language") || "all";

    const dateRange = getDateRange(range);

    // ---------------------------------------------------------
    // HACKATIME HEADERS
    // ---------------------------------------------------------

    const headers = {
      Authorization: `Bearer ${hackatimeToken}`,
      Accept: "application/json",
    };

    // ---------------------------------------------------------
    // HACKATIME API
    // ---------------------------------------------------------

    const [
      meResponse,
      projectsResponse,
      hoursResponse,
      streakResponse,
    ] = await Promise.all([
      fetch(
        "https://hackatime.hackclub.com/api/v1/authenticated/me",
        {
          headers,
          cache: "no-store",
        }
      ),

      fetch(
        "https://hackatime.hackclub.com/api/v1/authenticated/projects?include_archived=false",
        {
          headers,
          cache: "no-store",
        }
      ),

      fetch(
        `https://hackatime.hackclub.com/api/v1/authenticated/hours?start_date=${dateRange.startDate}&end_date=${dateRange.endDate}`,
        {
          headers,
          cache: "no-store",
        }
      ),

      fetch(
        "https://hackatime.hackclub.com/api/v1/authenticated/streak",
        {
          headers,
          cache: "no-store",
        }
      ),
    ]);

    // ---------------------------------------------------------
    // PARSE ME
    // ---------------------------------------------------------

    let hackatimeProfile: HackatimeUser = {};

    if (meResponse.ok) {
      try {
        hackatimeProfile = await meResponse.json();
      } catch {
        hackatimeProfile = {};
      }
    } else {
      console.warn(
        "Hackatime /me failed:",
        meResponse.status
      );
    }

    // ---------------------------------------------------------
    // PARSE PROJECTS
    // ---------------------------------------------------------

    let projectsData: {
      projects?: HackatimeProject[];
    } = {};

    if (projectsResponse.ok) {
      try {
        projectsData = await projectsResponse.json();
      } catch {
        projectsData = {};
      }
    } else {
      console.warn(
        "Hackatime projects failed:",
        projectsResponse.status
      );
    }

    const projects: HackatimeProject[] =
      Array.isArray(projectsData.projects)
        ? projectsData.projects
        : [];

    const activeProjects = projects.filter(
      (project) => !project.archived
    );

    // ---------------------------------------------------------
    // PARSE HOURS
    // ---------------------------------------------------------

    let hoursData: HackatimeHours = {};

    if (hoursResponse.ok) {
      try {
        hoursData = await hoursResponse.json();
      } catch {
        hoursData = {};
      }
    } else {
      console.warn(
        "Hackatime hours failed:",
        hoursResponse.status
      );
    }

    const totalSeconds = safeNumber(
      hoursData.total_seconds
    );

    // ---------------------------------------------------------
    // PARSE STREAK
    // ---------------------------------------------------------

    let streakData: {
      streak_days?: number;
    } = {};

    if (streakResponse.ok) {
      try {
        streakData = await streakResponse.json();
      } catch {
        streakData = {};
      }
    }

    const streakDays = safeNumber(
      streakData.streak_days
    );

    // ---------------------------------------------------------
    // PROJECT FILTER
    // ---------------------------------------------------------

    let visibleProjects = [...activeProjects];

    if (selectedProject !== "all") {
      visibleProjects = visibleProjects.filter(
        (project) =>
          project.name === selectedProject
      );
    }

    if (selectedLanguage !== "all") {
      visibleProjects = visibleProjects.filter(
        (project) =>
          project.languages?.includes(
            selectedLanguage
          )
      );
    }

    // ---------------------------------------------------------
    // PROJECT BREAKDOWN
    //
    // IMPORTANT:
    // Hackatime's documented /projects endpoint gives
    // project totals, not date-filtered project totals.
    //
    // Therefore these bars are all-time project totals.
    // The Total Time card below is correctly date filtered
    // through /hours.
    // ---------------------------------------------------------

    const projectDurations = visibleProjects
      .map((project) => ({
        name: project.name,
        seconds: safeNumber(
          project.total_seconds
        ),
      }))
      .sort((a, b) => b.seconds - a.seconds)
      .slice(0, 12);

    // ---------------------------------------------------------
    // LANGUAGE BREAKDOWN
    // ---------------------------------------------------------

    const languageMap = new Map<
      string,
      number
    >();

    for (const project of activeProjects) {
      const seconds = safeNumber(
        project.total_seconds
      );

      for (const language of project.languages || []) {
        if (!language) {
          continue;
        }

        const current =
          languageMap.get(language) || 0;

        languageMap.set(
          language,
          current + seconds
        );
      }
    }

    const languageBreakdown = Array.from(
      languageMap.entries()
    )
      .map(([name, seconds]) => ({
        name,
        seconds,
      }))
      .sort((a, b) => b.seconds - a.seconds)
      .slice(0, 12);

    // ---------------------------------------------------------
    // FILTER OPTIONS
    // ---------------------------------------------------------

    const projectOptions = Array.from(
      new Set(
        activeProjects
          .map((project) => project.name)
          .filter(Boolean)
      )
    ).sort((a, b) =>
      a.localeCompare(b)
    );

    const languageOptions = Array.from(
      new Set(
        activeProjects.flatMap(
          (project) =>
            project.languages || []
        )
      )
    ).sort((a, b) =>
      a.localeCompare(b)
    );

    // ---------------------------------------------------------
    // PROFILE
    //
    // Your current database has used:
    // name
    // avatar_url
    // github_user_id
    // hackatime_user_id
    //
    // We support both your newer and older column names.
    // ---------------------------------------------------------

    const firstName =
      getString(
        user.hackclub_first_name
      );

    const lastName =
      getString(
        user.hackclub_last_name
      );

    const hackClubFullName = [
      firstName,
      lastName,
    ]
      .filter(Boolean)
      .join(" ");

    const profileName =
      (getString(user.name) ??
        hackClubFullName) ||
      getString(user.github_name) ||
      getString(
        hackatimeProfile.github_username
      ) ||
      "Builder";

    const profileEmail =
      getString(user.email) ??
      getString(user.hackclub_email) ??
      getString(user.hackatime_email) ??
      hackatimeProfile.emails?.[0] ??
      null;

    const profileUsername =
      getString(user.github_username) ??
      getString(
        hackatimeProfile.github_username
      );

    const profileAvatar =
      getString(user.avatar_url) ??
      getString(user.github_avatar_url) ??
      null;

    const profileSlackId =
      getString(user.hackclub_slack_id) ??
      getString(hackatimeProfile.slack_id);

    // ---------------------------------------------------------
    // TOP PROJECT
    // ---------------------------------------------------------

    const topProject =
      projectDurations[0] || null;

    const topLanguage =
      languageBreakdown[0] || null;

    // ---------------------------------------------------------
    // RESPONSE
    // ---------------------------------------------------------

    return NextResponse.json({
      profile: {
        name: profileName,
        email: profileEmail,
        username: profileUsername,
        avatar_url: profileAvatar,
        slack_id: profileSlackId,
      },

      filters: {
        selected: {
          range,
          project: selectedProject,
          language: selectedLanguage,
        },

        options: {
          projects: projectOptions,
          languages: languageOptions,
        },
      },

      stats: {
        // THIS is the important date-filtered value.
        totalSeconds,

        topProject: topProject
          ? {
            name: topProject.name,
            seconds: topProject.seconds,
          }
          : null,

        topLanguage: topLanguage
          ? {
            name: topLanguage.name,
            seconds: topLanguage.seconds,
          }
          : null,

        projects: visibleProjects.length,

        streakDays,
      },

      projects: activeProjects,

      projectDurations,

      languages: languageBreakdown,

      // Kept only as metadata if you want to use it later.
      latestHeartbeat: null,

      dateRange: {
        range,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      },
    });
  } catch (error) {
    console.error(
      "Dashboard API error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to load dashboard",
      },
      { status: 500 }
    );
  }
}