import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabase } from "@/lib/supabase/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type HackatimeProject = {
  name: string;
  total_seconds: number;
  most_recent_heartbeat: string | null;
  languages: string[];
  archived: boolean;
};

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

export async function GET() {
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
          projects: [],
        },
        401
      );
    }

    const {
      data: user,
      error: userError,
    } = await supabase
      .from("users")
      .select(
        `
          id,
          hackatime_access_token,
          hackatime_connected
        `
      )
      .eq("id", userId)
      .single();

    if (userError) {
      console.error(
        "Hackatime user lookup error:",
        userError
      );

      return jsonResponse(
        {
          error:
            "Failed to load your account.",
          projects: [],
        },
        500
      );
    }

    if (!user) {
      return jsonResponse(
        {
          error:
            "User account not found.",
          projects: [],
        },
        404
      );
    }

    if (
      !user.hackatime_access_token
    ) {
      return jsonResponse(
        {
          error:
            "Hackatime is not connected.",
          projects: [],
        },
        400
      );
    }

    const hackatimeResponse =
      await fetch(
        "https://hackatime.hackclub.com/api/v1/authenticated/projects?include_archived=false",
        {
          method: "GET",
          headers: {
            Authorization:
              `Bearer ${user.hackatime_access_token}`,
            Accept:
              "application/json",
          },
          cache: "no-store",
        }
      );

    const responseText =
      await hackatimeResponse.text();

    let hackatimeData: unknown =
      null;

    if (
      responseText.trim()
    ) {
      try {
        hackatimeData =
          JSON.parse(
            responseText
          );
      } catch (error) {
        console.error(
          "Hackatime JSON parse error:",
          error
        );
      }
    }

    if (
      !hackatimeResponse.ok
    ) {
      console.error(
        "Hackatime projects request failed:",
        {
          status:
            hackatimeResponse.status,
          response:
            hackatimeData,
        }
      );

      if (
        hackatimeResponse.status ===
        401 ||
        hackatimeResponse.status ===
        403
      ) {
        return jsonResponse(
          {
            error:
              "Your Hackatime connection has expired. Reconnect Hackatime from your Profile.",
            projects: [],
          },
          401
        );
      }

      return jsonResponse(
        {
          error:
            "Failed to load Hackatime projects.",
          projects: [],
        },
        502
      );
    }

    let rawProjects: unknown[] = [];

    if (
      Array.isArray(
        hackatimeData
      )
    ) {
      rawProjects =
        hackatimeData;
    } else if (
      hackatimeData &&
      typeof hackatimeData ===
      "object" &&
      "projects" in
      hackatimeData
    ) {
      const projectsValue =
        (
          hackatimeData as {
            projects?: unknown;
          }
        ).projects;

      if (
        Array.isArray(
          projectsValue
        )
      ) {
        rawProjects =
          projectsValue;
      }
    }


    const projects: HackatimeProject[] =
      rawProjects
        .filter(
          (
            project
          ): project is Record<
            string,
            unknown
          > =>
            Boolean(
              project &&
              typeof project ===
              "object"
            )
        )
        .map(
          (project) => {
            const languagesValue =
              project.languages;

            let languages: string[] =
              [];

            if (
              Array.isArray(
                languagesValue
              )
            ) {
              languages =
                languagesValue
                  .filter(
                    (
                      language
                    ): language is string =>
                      typeof language ===
                      "string"
                  )
                  .map(
                    (
                      language
                    ) =>
                      language.trim()
                  )
                  .filter(
                    Boolean
                  );
            } else if (
              languagesValue &&
              typeof languagesValue ===
              "object"
            ) {

              languages =
                Object.keys(
                  languagesValue
                );
            }

            return {
              name: String(
                project.name ||
                ""
              ),

              total_seconds:
                Number(
                  project.total_seconds ||
                  0
                ),

              most_recent_heartbeat:
                typeof project.most_recent_heartbeat ===
                  "string"
                  ? project.most_recent_heartbeat
                  : null,

              languages,

              archived:
                Boolean(
                  project.archived
                ),
            };
          }
        )
        .filter(
          (project) =>
            project.name.length >
            0
        );


    projects.sort(
      (a, b) =>
        b.total_seconds -
        a.total_seconds
    );

    return jsonResponse({
      projects,
    });
  } catch (error) {
    console.error(
      "Hackatime projects API error:",
      error
    );

    return jsonResponse(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to load Hackatime projects.",
        projects: [],
      },
      500
    );
  }
}

export async function POST() {
  return jsonResponse(
    {
      error:
        "POST is not supported for this endpoint. Use GET.",
      projects: [],
    },
    405
  );
}