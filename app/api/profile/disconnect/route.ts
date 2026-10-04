import {
  NextRequest,
  NextResponse,
} from "next/server";

import { supabase } from "@/lib/supabase/supabase";

type Provider =
  | "github"
  | "hackatime";

export async function POST(
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

    const body = await request.json();

    const provider =
      body?.provider as Provider;

    if (
      provider !== "github" &&
      provider !== "hackatime"
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid provider",
        },
        {
          status: 400,
        }
      );
    }

    if (provider === "github") {
      const { error } =
        await supabase
          .from("users")
          .update({
            github_access_token: null,
            github_connected: false,
          })
          .eq("id", userId);

      if (error) {
        console.error(
          "GitHub disconnect error:",
          error
        );

        return NextResponse.json(
          {
            error:
              "Failed to disconnect GitHub",
          },
          {
            status: 500,
          }
        );
      }
    }

    if (provider === "hackatime") {
      const { error } =
        await supabase
          .from("users")
          .update({
            hackatime_access_token: null,
            hackatime_connected: false,
          })
          .eq("id", userId);

      if (error) {
        console.error(
          "Hackatime disconnect error:",
          error
        );

        return NextResponse.json(
          {
            error:
              "Failed to disconnect Hackatime",
          },
          {
            status: 500,
          }
        );
      }
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(
      "Disconnect API error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Failed to disconnect account",
      },
      {
        status: 500,
      }
    );
  }
}