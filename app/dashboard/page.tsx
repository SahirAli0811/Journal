import ProjectList from "@/components/dashboard/ProjectList";

export default function DashboardPage() {
  return (
    <main className="dashboard-page">

      <header className="dashboard-topbar">
        <div className="dashboard-logo">
          <div className="dashboard-logo-icon">
            📖
          </div>

          <span>Journal</span>
        </div>

        <div className="dashboard-user">
          <span>My Journal</span>
          <div className="user-avatar">
            S
          </div>
        </div>
      </header>


      <div className="dashboard-layout">

        <aside className="dashboard-sidebar">

          <div className="sidebar-brand">
            <div className="sidebar-book">
              📖
            </div>

            <div>
              <strong>Journal</strong>
              <span>Your journey</span>
            </div>
          </div>


          <nav className="sidebar-nav">

            <a
              href="/dashboard"
              className="active"
            >
              <span>⌂</span>
              Dashboard
            </a>

            <a href="#projects">
              <span>▣</span>
              Projects
            </a>

            <a href="#activity">
              <span>◷</span>
              Activity
            </a>

            <a href="#journal">
              <span>✎</span>
              Journal
            </a>

            <a href="#github">
              <span>●</span>
              GitHub
            </a>

          </nav>


          <div className="sidebar-bottom">

            <a href="#settings">
              ⚙ Settings
            </a>

            <a href="/">
              ← Back to Journal
            </a>

          </div>

        </aside>


        <div className="dashboard-content">

          <section className="dashboard-welcome">

            <p className="welcome-eyebrow">
              YOUR BUILDING JOURNEY
            </p>

            <h1>
              Welcome back 👋
            </h1>

            <p>
              Keep track of the things you build,
              the time you spend, and the moments
              worth remembering.
            </p>

          </section>


          <section className="stats-grid">

            <div className="stat-card">
              <span>Total coding time</span>
              <strong>—</strong>
              <small>From Hackatime</small>
            </div>

            <div className="stat-card">
              <span>Projects</span>
              <strong>—</strong>
              <small>Hackatime projects</small>
            </div>

            <div className="stat-card">
              <span>GitHub</span>
              <strong>Connected</strong>
              <small>Your repositories</small>
            </div>

            <div className="stat-card">
              <span>Journal entries</span>
              <strong>0</strong>
              <small>Start documenting</small>
            </div>

          </section>


          <ProjectList />

        </div>

      </div>

    </main>
  );
}