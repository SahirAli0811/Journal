
"use client";

import React from "react";

export default function Home() {
    return (
        <main>

            <section className="hero" id="home">

                <a
                    href="https://hackclub.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hackclub-badge"
                >
                    <img
                        src="/images/hackclub.png"
                        alt="Hack Club"
                    />
                </a>

                <nav className="navbar">
                    <div className="nav-links">
                        <a href="#signup">Sign up</a>
                        <a href="#about">About</a>
                        <a href="#faq">FAQ</a>
                    </div>
                </nav>

                <div className="hero-content">

                    <div className="hero-text">

                        <p className="eyebrow">
                            A place to keep your building journey
                        </p>

                        <h1>
                            Your projects.
                            <br />
                            Your time.
                            <br />
                            Your journal.
                        </h1>

                        <p className="hero-description">
                            Turn your Hack Club journey into a journal you can look back on.
                            Track your projects, record your sessions, add photos and publish
                            everything to GitHub.
                        </p>

                        <form
                            className="signup-box"
                            id="signup"
                            onSubmit={(e) => {
                                e.preventDefault();
                                window.location.href = "/auth/hackatime";
                            }}
                        >
                            <input
                                type="email"
                                placeholder="example@gmail.com"
                                aria-label="Email address"
                            />

                            <button type="submit">
                                Sign Up!
                            </button>
                        </form>

                    </div>
                    <div className="hero-logo">
                        <img
                            src="/images/logo-bg.png"
                            alt="Journal Logo"
                        />
                    </div>

                </div>
            </section>


            <section className="about-section" id="about">

                <div className="about-content">

                    <div className="about-text">

                        <p className="section-label">
                            ABOUT THE JOURNAL
                        </p>

                        <h2>
                            Build it.
                            <br />
                            Write it.
                            <br />
                            Remember it.
                        </h2>

                        <p>
                            Your projects are more than just finished files sitting on
                            GitHub. The late nights, experiments, broken builds, tiny
                            improvements and random ideas are part of the journey too.
                        </p>

                        <p>
                            This journal gives you a simple place to keep all of those
                            moments together while you build.
                        </p>

                    </div>

                    <div className="about-image">
                        <img
                            src="/images/about.png"
                            alt="About The Journal"
                        />
                    </div>

                </div>

            </section>


            <section className="journey-section" id="journey">

                <div className="journey-content">

                    <p className="section-label">
                        HOW IT WORKS
                    </p>

                    <h2>
                        Your building journey,
                        <br />
                        all in one place.
                    </h2>

                    <div className="journey-grid">

                        <div className="journey-card">
                            <span className="number">01</span>

                            <h3>
                                Write
                            </h3>

                            <p>
                                Write about what you worked on, what you learned and what
                                happened during each session.
                            </p>
                        </div>


                        <div className="journey-card">
                            <span className="number">02</span>

                            <h3>
                                Track
                            </h3>

                            <p>
                                Keep track of your projects, sessions and progress as your
                                ideas slowly turn into real things.
                            </p>
                        </div>


                        <div className="journey-card">
                            <span className="number">03</span>

                            <h3>
                                Add
                            </h3>

                            <p>
                                Add screenshots, photos and other memories that show how your
                                project changed over time.
                            </p>
                        </div>


                        <div className="journey-card">
                            <span className="number">04</span>

                            <h3>
                                Publish
                            </h3>

                            <p>
                                Turn your journal into Markdown and publish it directly to
                                GitHub when you're ready.
                            </p>
                        </div>

                    </div>

                </div>

            </section>



            <section className="faq-section" id="faq">

                <div className="faq-content">

                    <p className="section-label">
                        FAQ
                    </p>

                    <h2>
                        Questions?
                    </h2>

                    <div className="faq-list">

                        <details>
                            <summary>
                                What is this?
                            </summary>

                            <p>
                                A journal made for documenting your building journey,
                                projects and everything that happens along the way.
                            </p>
                        </details>


                        <details>
                            <summary>
                                Can I publish my journal?
                            </summary>

                            <p>
                                Yes. The journal is designed around turning your entries into
                                Markdown that can be published to GitHub.
                            </p>
                        </details>


                        <details>
                            <summary>
                                Is this for Hack Club projects?
                            </summary>

                            <p>
                                It is designed around the Hack Club building experience, but
                                you can use the journal for any projects you want to document.
                            </p>
                        </details>

                    </div>

                </div>

            </section>

            <footer className="footer">

                <div className="footer-inner">

                    {/* Left */}
                    <div className="footer-brand">

                        <a
                            href="https://hackclub.com/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="footer-hackclub"
                        >
                            <img
                                src="/images/hackclub.png"
                                alt="Hack Club"
                            />
                        </a>

                        <div className="footer-links">

                            <a
                                href="https://hackclub.com/"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                Hack Club
                            </a>

                            <a
                                href="https://slack.hackclub.com/"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                Slack
                            </a>

                            <a
                                href="https://hackclub.com/clubs"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                Clubs
                            </a>

                            <a
                                href="https://hackathons.hackclub.com/"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                Hackathons
                            </a>

                        </div>

                    </div>


                    {/* Right */}
                    <div className="footer-text">

                        <p>
                            Hack Club is a 501(c)(3) nonprofit and network of 100k+
                            technical high schoolers. We believe you learn best by
                            building, so we're creating community and providing grants so
                            you can make awesome projects.
                        </p>


                        <p>
                            In the past few years, we've sent 30 teen hackers hiking the
                            Pacific Crest Trail,{" "}
                            <a
                                href="https://www.youtube.com/watch?v=ufMUJ9D1fi8"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                hosted a hackathon for the worst ideas
                            </a>
                            , and{" "}
                            <a
                                href="https://www.youtube.com/watch?v=8iM1W8kXrQA"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                ran the largest teen hardware hackathon at GitHub HQ
                            </a>
                            .
                        </p>


                        <p>
                            Read about Hack Club in{" "}
                            <a
                                href="https://www.wsj.com/articles/teen-hackers-try-to-convince-parents-they-are-up-to-good-11569922200"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                The Wall Street Journal
                            </a>
                            ,{" "}
                            <a
                                href="https://www.cbsnews.com/sanfrancisco/news/hack-club-hosts-teen-coders-san-francisco/"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                CBS News
                            </a>
                            , and{" "}
                            <a
                                href="https://www.nasa.gov/learning-resources/space-out-this-summer-with-variety-of-nasa-stem-activities/"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                NASA
                            </a>
                            , or watch us on stage with{" "}
                            <a
                                href="https://www.youtube.com/watch?v=kaEFv7e49mo"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                AMD CEO Lisa Su
                            </a>
                            .
                        </p>


                        <p>
                            Made with ♥ by teenagers, for teenagers at Hack Club.
                        </p>

                    </div>

                </div>

            </footer>

        </main>
    );
}
