import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { supabase } from "@/lib/supabase/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type GithubRepository = {
    id: number;
    name: string;
    full_name: string;
    html_url: string;
    private: boolean;
    description: string | null;
    default_branch: string;
    owner?: {
        login?: string;
    };
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
        const cookieStore = cookies();

        const userId =
            cookieStore.get(
                "journal_user_id"
            )?.value;

        if (!userId) {
            return jsonResponse(
                {
                    error: "Not authenticated",
                    repositories: [],
                },
                401
            );
        }

        const { data: user, error } =
            await supabase
                .from("users")
                .select(
                    `
            id,
            github_access_token,
            github_connected
          `
                )
                .eq("id", userId)
                .single();

        if (error) {
            console.error(
                "Supabase GitHub user lookup error:",
                error
            );

            return jsonResponse(
                {
                    error:
                        "Failed to load your account.",
                    repositories: [],
                },
                500
            );
        }

        if (!user) {
            return jsonResponse(
                {
                    error:
                        "User account not found.",
                    repositories: [],
                },
                404
            );
        }

        if (!user.github_access_token) {
            return jsonResponse(
                {
                    error:
                        "GitHub is not connected. Reconnect GitHub from your Profile page.",
                    repositories: [],
                },
                400
            );
        }

        const githubResponse =
            await fetch(
                "https://api.github.com/user/repos?visibility=all&affiliation=owner,collaborator,organization_member&per_page=100&sort=updated&direction=desc",
                {
                    method: "GET",
                    headers: {
                        Accept:
                            "application/vnd.github+json",

                        Authorization:
                            `Bearer ${user.github_access_token}`,

                        "X-GitHub-Api-Version":
                            "2026-03-10",
                    },

                    cache: "no-store",
                }
            );

        const responseText =
            await githubResponse.text();

        let githubData: unknown = null;

        if (responseText.trim()) {
            try {
                githubData =
                    JSON.parse(responseText);
            } catch {
                githubData = null;
            }
        }

        if (!githubResponse.ok) {
            console.error("GitHub API error:", {
                    status:
                        githubResponse.status,
                    body:
                        responseText,
                }
            );

            const githubMessage =
                typeof githubData === "object" &&
                    githubData !== null &&
                    "message" in githubData &&
                    typeof (
                        githubData as {
                            message?: unknown;
                        }
                    ).message === "string"
                    ? (
                        githubData as {
                            message: string;
                        }
                    ).message
                    : null;

            return jsonResponse(
                {
                    error:
                        githubMessage ||
                        responseText ||
                        `GitHub returned HTTP ${githubResponse.status}.`,
                    repositories: [],
                },
                githubResponse.status
            );
        }

        if (!Array.isArray(githubData)) {
            console.error("Unexpected GitHub repository response:", githubData);

            return jsonResponse(
                {
                    error:
                        "GitHub returned an unexpected repository response.",
                    repositories: [],
                },
                502
            );
        }

        const repositories =
            githubData.map(
                (repo: GithubRepository) => ({
                    id: repo.id,
                    name: repo.name,
                    full_name:
                        repo.full_name,
                    html_url:
                        repo.html_url,
                    private:
                        Boolean(repo.private),
                    description:
                        repo.description ??
                        null,
                    default_branch:
                        repo.default_branch ||
                        "main",
                })
            );

        console.log(`Loaded ${repositories.length} GitHub repositories for user ${userId}`);

        return jsonResponse({
            repositories,
        });
    } catch (error) {
        console.error("GitHub repositories route error:", error);

        return jsonResponse(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : "Failed to load GitHub repositories.",
                repositories: [],
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
            repositories: [],
        },
        405
    );
}