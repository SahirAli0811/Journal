"use client";

import { useEffect, useState } from "react";

type Project = {
  name: string;
  total_seconds: number;
  most_recent_heartbeat: string;
  languages: string[];
  archived: boolean;
};

function formatTime(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  return `${minutes}m`;
}

export default function ProjectList() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadProjects() {
      try {
        const response = await fetch("/api/hackatime/projects");

        if (!response.ok) {
          throw new Error("Failed to load projects");
        }

        const data = await response.json();

        setProjects(data.projects || []);
      } catch (err) {
        console.error(err);
        setError("Could not load your projects.");
      } finally {
        setLoading(false);
      }
    }

    loadProjects();
  }, []);

  if (loading) {
    return (
      <div className="dashboard-loading">
        Loading your projects...
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-error">
        {error}
      </div>
    );
  }

  return (
    <section className="projects-section">
      <div className="section-heading">
        <div>
          <p className="section-eyebrow">YOUR BUILDING JOURNEY</p>
          <h2>Your Projects</h2>
        </div>

        <span className="project-count">
          {projects.length} projects
        </span>
      </div>

      <div className="project-list">
        {projects.map((project) => (
          <article
            className="project-card"
            key={project.name}
          >
            <div className="project-main">
              <div className="project-icon">
                📖
              </div>

              <div>
                <h3>{project.name}</h3>

                <div className="language-list">
                  {project.languages.map((language) => (
                    <span key={language}>
                      {language}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="project-time">
              <strong>
                {formatTime(project.total_seconds)}
              </strong>

              <span>Total time</span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}