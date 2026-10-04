import { NextResponse, NextRequest } from "next/server";

import { supabase } from "@/lib/supabase/supabase";

function getString(
    value: unknown
): string | null {
    if (typeof value !== "string") {
        return null;
    }
    const trimmed = value.trim();

    return trimmed.length > 0 ? trimmed : null;
}
function getBoolean(
  value: unknown,
  fallback: boolean
) {
  if (typeof value === "boolean") {
    return value;
  }

  return fallback;
}

export async function GET(
  request: NextRequest
) {
  try {
    const userId =
      request.cookies.get("journal_user_id")?.value;

    if (!userId) {
      return NextResponse.json(
        {
          error: "Not authenticated",
        },
        {
          status: 401,
        }
      );
    }

    const { data: user, error } =
      await supabase
        .from("users")
        .select("*")
        .eq("id", userId)
        .single();

    if (error || !user) {
      console.error(
        "Profile user lookup error:",
        error
      );

      return NextResponse.json(
        {
          error: "User account not found",
        },
        {
          status: 404,
        }
      );
    }

    const hackClubFirstName = getString(
      user.hackclub_first_name
    );

    const hackClubLastName = getString(
      user.hackclub_last_name
    );

    const hackClubFullName =
      [hackClubFirstName, hackClubLastName]
        .filter(Boolean)
        .join(" ")
        .trim() || null;

    const name =
      getString(user.name) ??
      hackClubFullName ??
      getString(user.github_name) ??
      "Builder";

    const email =
      getString(user.email) ??
      getString(user.hackclub_email) ??
      getString(user.github_email);

    const username =
      getString(user.github_username);

    const avatarUrl =
      getString(user.avatar_url) ??
      getString(user.github_avatar_url);

    const hackClubConnected =
      getBoolean(
        user.hackclub_connected,
        Boolean(
          getString(user.hackclub_id)
        )
      );

    const githubConnected =
      getBoolean(
        user.github_connected,
        Boolean(
          getString(
            user.github_access_token
          )
        )
      );

    const hackatimeConnected =
      getBoolean(
        user.hackatime_connected,
        Boolean(
          getString(
            user.hackatime_access_token
          )
        )
      );

    return NextResponse.json({
      profile: {
        name,
        email,
        username,
        avatar_url: avatarUrl,
        hackclub_id:
          getString(user.hackclub_id),
        hackclub_slack_id:
          getString(
            user.hackclub_slack_id
          ),
      },

      connections: {
        hackclub: {
          connected:
            hackClubConnected,
          label: "Hack Club",
        },

        github: {
          connected:
            githubConnected,
          label: "GitHub",
          username,
        },

        hackatime: {
          connected:
            hackatimeConnected,
          label: "Hackatime",
        },
      },
    });
  } catch (error) {
    console.error(
      "Profile API error:",
      error
    );

    return NextResponse.json(
      {
        error: "Failed to load profile",
      },
      {
        status: 500,
      }
    );
  }
}