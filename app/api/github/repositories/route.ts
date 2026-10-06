import {
    NextRequest,
    NextResponse,
} from "next/server";

import { supabase } from "@/lib/supabase/supabase";

type GitHubRepository = {
    id: number;
    name: string;
    full_name: string;
    html_url: string;
    description: string | null;
    private: boolean;
    owner?: {
        login?: string;
    };
};

export async function GET(
    request: NextRequest
) {
    try {
        const userId =
            request.cookies.get(
                "journal_user_id"
            )?.value;

        if (!userId) {
            return NextResponse.json({
                error: "Not authenticated",
            },
                { status: 401 }
            )
        }

        const { data: user, error } =
            await supabase
                .from("users")
                .select("github_access_token, github_connected")
                .eq("id", userId)
                .single();

        if (error || !user) {
            console.error(
                "Github rrpository user lookup error:", error
            );

            return NextResponse.json(
                {
                    error: "User account not found",
                },
                { status: 404 }
            );
        }

        const token = user.github_access_token;

        if (!token) {
            return NextResponse.json(
                {
                    error: "Github is not connected",
                },
                { status: 400 }
            );
        }

        const githubResponse = await fetch("https://api.github.com/user/repos?per_page=100&sort=updated&direction=desc&affiliation=owner,collaborator,organization_member",
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept:
                        "application/vnd.github+json",
                    "X-Github-Api-Version":
                        "2022-11-28",
                    "User-Agent":
                        "Journal-App",
                },
                cache: "no-store",
            }
        );

        const contentType = githubResponse.headers.get("content-type") || "";

        if (!githubResponse.ok) {
            const text = await githubResponse.text();

            console.error("Github repositories API failed:", githubResponse.status, text);

            return NextResponse.json(
                {
                    error: "Github returned an erro while loading repositories.",
                    details: contentType.includes("aaplication/json")
                        ? safeGitHubMessage(text)
                        : text.slice(0, 300),
                },
                { status: githubResponse.status }
            );
        }

        if (!contentType.includes("application/json")) {
            const text = await githubResponse.text();

            return NextResponse.json(
                {
                    error: " Github returned an unexpected response.",
                    details: text.slice(0, 300),
                },
                { status: 502 }
            );
        }
        const repositories =
            (await githubResponse.json()) as GitHubRepository[];

        const cleanedRepositories =
            repositories
                .filter(
                    (repository) =>
                        repository &&
                        typeof repository.id ===
                        "number" &&
                        typeof repository.name ===
                        "string" &&
                        typeof repository.full_name ===
                        "string"
                )
                .map((repository) => ({
                    id: repository.id,
                    name: repository.name,
                    full_name:
                        repository.full_name,
                    html_url:
                        repository.html_url,
                    description:
                        repository.description,
                    private:
                        Boolean(repository.private),
                    owner: {
                        login:
                            repository.owner
                                ?.login || "",
                    },
                }));

        return NextResponse.json({
            repositories:
                cleanedRepositories,
        });
    } catch (error) {
        console.error(
            "GitHub repositories route error:",
            error
        );

        return NextResponse.json(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : "Failed to load GitHub repositories",
            },
            {
                status: 500,
            }
        );
    }
}

function safeGitHubMessage(
    text: string
) {
    try {
        const parsed = JSON.parse(text);

        return (
            parsed?.message ||
            "GitHub API request failed."
        );
    } catch {
        return text.slice(0, 300);

    }
}