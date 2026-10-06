import {
  NextRequest,
  NextResponse,
} from "next/server";

import { supabase } from "@/lib/supabase/supabase";

export async function GET(
  request: NextRequest,
  {
    params,
  }: {
    params: {
      id: string;
    };
  }
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
      data: book,
      error,
    } = await supabase
      .from("journal_books")
      .select("*")
      .eq("id", params.id)
      .eq("user_id", userId)
      .single();

    if (
      error ||
      !book
    ) {
      return NextResponse.json(
        {
          error:
            "Journal book not found.",
        },
        {
          status: 404,
        }
      );
    }

    let currentSeconds =
      Number(
        book.last_hackatime_seconds ||
          0
      );

    let newSeconds = 0;

    if (
      book.tracking_mode ===
        "hackatime" &&
      book.hackatime_project
    ) {
      const {
        data: user,
      } = await supabase
        .from("users")
        .select(
          "hackatime_access_token"
        )
        .eq("id", userId)
        .single();

      const token =
        user?.hackatime_access_token;

      if (token) {
        const response =
          await fetch(
            "https://hackatime.hackclub.com/api/v1/authenticated/projects?include_archived=false",
            {
              headers: {
                Authorization: `Bearer ${token}`,
                Accept:
                  "application/json",
              },
              cache:
                "no-store",
            }
          );

        if (response.ok) {
          const data =
            await response.json();

          const projects =
            Array.isArray(
              data?.projects
            )
              ? data.projects
              : [];

          const selected =
            projects.find(
              (project: {
                name?: string;
                total_seconds?: number;
              }) =>
                project.name ===
                book.hackatime_project
            );

          currentSeconds =
            Number(
              selected?.total_seconds ||
                0
            );

          newSeconds =
            Math.max(
              0,
              currentSeconds -
                Number(
                  book.last_hackatime_seconds ||
                    0
                )
            );
        }
      }
    }

    return NextResponse.json({
      book,
      time: {
        currentSeconds,
        newSeconds,
      },
    });
  } catch (error) {
    console.error(
      "Journal book GET error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to load journal book.",
      },
      {
        status: 500,
      }
    );
  }
}