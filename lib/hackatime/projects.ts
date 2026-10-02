const HACKATIME_API_URL = "https://hackatime.hackclub.com/api/v1";

export interface HackatimeProject {
  name: string;
  total_seconds: number;
  most_recent_heartbeat: string | null;
  languages: string[];
  archived: boolean;
}

export interface HackatimePrjectResponse {
  projects: HackatimeProject[];
}

export async function getHackatimeProjects(
    accessToken: string,
    includeArchived = false
): Promise<HackatimeProject[]> {
    const url = new URL(
        `${HACKATIME_API_URL}/authenticated/projects`
    );

    url.searchParams.set(
        "include_archived",
        String(includeArchived)
    );

    const response = await fetch(url.toString(), {
        method: "GET",
        headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/json",
        },
        cache: "no-store",
    });

    if (!response.ok){
        const errorText = await response.text();

        throw new Error
        (`Hackatime Projects Request Failed: ${response.status} ${errorText}`);
    }

    const data:HackatimePrjectResponse = 
    await response.json();

    return data.projects ?? [];
}