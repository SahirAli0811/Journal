import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/supabase";
import { getHackatimeProjects } from "@/lib/hackatime/projects";

export async function GET() {
  try {
    const { data: user, error } = await supabase
      .from("users")
      .select("id, hackatime_id, hackatime_access_token")
      .not("hackatime_access_token", "is", null)
      .limit(1)
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        {
          error: "Failed to find user",
          details: error.message,
        },
        { status: 500 }
      );
    }

    if (!user) {
      return NextResponse.json(
        { error: "No Hackatime user found" },
        { status: 404 }
      );
    }

    if (!user.hackatime_access_token) {
      return NextResponse.json(
        { error: "Hackatime is not connected" },
        { status: 401 }
      );
    }

    const projects = await getHackatimeProjects(
      user.hackatime_access_token
    );

    return NextResponse.json({
      success: true,
      projects,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        error: "Failed to fetch Hackatime projects",
        details:
          error instanceof Error
            ? error.message
            : "Unknown error",
      },
      { status: 500 }
    );
  }
}