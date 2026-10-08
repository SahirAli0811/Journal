# Journal

Journal is a Hack Club project made for people who love building things.

It helps you keep a record of the projects you work on, the time you spend coding, what you learned, and the moments you want to remember. Journal connects with Hack Club, GitHub, and Hackatime so your development journey can stay connected to the projects you are already working on.

## Features

- Connect your Hack Club account
- Connect GitHub and Hackatime
- See your projects and coding time
- Create a journal for each project
- Track time automatically with Hackatime
- Add manual sessions when Hackatime is not being used
- Write journal entries in Markdown
- Add images to entries
- Publish your journal directly to your GitHub repository
- Light and dark themes

## How publishing works

When you publish a journal entry, Journal does not immediately change the `main` branch.

Instead, Journal creates or updates a separate branch for your journal and puts the new journal files there.

The changes are then placed in a Pull Request for your repository.

The Pull Request contains files such as:

```text
journal/
├── journal.md
└── images/
    ├── image-1.png
    └── image-2.png

You can review the Pull Request and merge it into main when you are ready.
This keeps journal publishing separate from your normal development work and helps prevent Journal changes from accidentally interfering with an older local copy of your repository.
Working on your repository after a Journal update
After you merge a Journal Pull Request into main, the remote repository has changed.
If you are working on the repository from your computer, update your local main before pushing new changes:
git checkout main
git pull origin main

This keeps your local repository up to date with the Journal changes.
Do not force-push an old local main over the remote repository.
Journal files
Published journal content is stored inside the connected GitHub repository:
journal/
├── journal.md
└── images/

journal.md contains your journal entries in Markdown, while the images folder contains the images uploaded with your entries.
Development
Install dependencies:
npm install

Run the development server:
npm run dev

Then open:
http://localhost:3000

To create a production build:
npm run build

Environment variables
Create a .env.local file with the required credentials:
HACKATIME_CLIENT_ID=
HACKATIME_CLIENT_SECRET=

GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=

NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SECRET_KEY=
SUPABASE_SERVICE_ROLE_KEY=

NEXT_PUBLIC_SITE_URL=

Never commit .env.local or any secret credentials to GitHub.
Production
Journal is designed to run on Vercel.
Production URL:
https://journal.hackclub.com

The production OAuth callback URLs are:
https://journal.hackclub.com/auth/github/callback
https://journal.hackclub.com/auth/hackclub/callback
https://journal.hackclub.com/auth/hackatime/callback

Project structure
journal/
├── app/
│   ├── auth/
│   ├── dashboard/
│   ├── journal/
│   ├── profile/
│   ├── settings/
│   └── api/
├── components/
├── lib/
├── types/
├── prisma/
├── public/
├── package.json
└── README.md

Git workflow
For normal development, work on a separate branch instead of changing main directly.
A simple workflow is:
git checkout main
git pull origin main

git checkout -b my-feature

git add .
git commit -m "Describe my changes"

git push -u origin my-feature

Then create a Pull Request and merge it into main when the changes are ready.
Security
Keep GitHub tokens, Hackatime tokens, Supabase secret keys, and OAuth secrets private.
Never commit secrets to the repository and never force-push over changes that you have not pulled locally.
```