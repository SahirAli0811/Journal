"use client";

import { useEffect, useState } from "react";

interface Project {
    name: string;
    total_seconds: number;
    most_recent_heartbeat: string | null;
    languages: string[];
    archived: boolean;
}

function formatTime(seconds: number){
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor(seconds % 3600/60);

    if (hours>0){
        return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
}

export default function HackatimeProjects(){
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        async function loadProjects(){
            try{
                const response = await fetch(
                    "/api/hackatime/projects"
                );

                const data = await response.json();

                if(!response.ok){
                    throw new Error(
                        data.error || "Failed to load projects"
                    );
                }

                setProjects(data.projects || []);
            }catch (error){
                setError(
                    error instanceof Error
                    ? error.message
                    : "Something Went Wrong"
                );
            } finally {
                setLoading(false);
            }
        }
        
        loadProjects();

    }, []);

    if (loading){
        return <p> Loding Your Projects...</p>;
    }

    if (error) {
        return <p> Could not load your project: {error}</p>;
    }

    return (
        <section>
            <h2> Your Projects </h2>

            {projects.length === 0 ? (
                <p> No Hackatime Project Found </p>
            ) : (
                <div>
                    {projects
                      .filter((project) => !project.archived)
                      .map((project) => (
                        <div key={project.name}>
                            <h3>{project.name}</h3>
                            <p>{formatTime(project.total_seconds)}</p>
                            <p>{project.languages.join(", ")}</p>
                        </div>
                      ))}
                </div>
            )}
        </section>
    );
}