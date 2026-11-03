# VeriSite: build rules

Read together with `CLAUDE.md` in this folder (design and product rules) and `bantayasenso/AGENTS.md` (Next.js version notes).

## What we are building
VeriSite is a real working app, not a clickable mockup.
Citizens scan a project's paskil or site. AI flags wrong billboard information and possible hazards. Users send reports to the LGU, track them, and earn streaks and badges. Urgent sites rank higher to catch the LGU's attention.

- Screenshots guide the look. `CLAUDE.md` and this file define behavior.
- Think about what each control should do. Every button, filter, checkbox, input and link must work unless it is listed as unfinished below.
- Build real state, validation, and empty, loading and error states.
- Keep one shared data layer with functions the backend can replace later. Save data in localStorage for now. Don't connect to Supabase or Gemini yet.
- You may adjust layout or add small missing pieces when a feature needs it. List these in your report.
- Test features by using them in a real browser (tapping, typing, refreshing), not only by looking at them.

## Where things go
- All pages live inside `bantayasenso/app/verisite`, one folder per screen, e.g. `app/verisite/home/page.tsx`.
- Reuse the shared components in `bantayasenso/components`. Don't copy their code into a page; extend the component instead.
- Images live in `bantayasenso/public/verisite` and are referenced as `/verisite/<name>.png`.
- Data, all in `bantayasenso/app/verisite`:
  - `data.ts`: the one data layer (projects, reports, followed projects, current user, updates, the scan in progress). Screens read and write only through it. Swap its insides for backend calls later.
  - `store.ts`: pure rules (status, streak, badges, report saving, paskil vs record). Has a self-check: `node --test app/verisite/store.test.mjs`.
  - `sample-data.ts`: what a fresh install starts with.
  - `ai.ts`: mock AI with the same fields as `app/api/analyze`. Replace its body with the real call later.

## Don't touch
- `app/page.tsx`, `app/scan`, `app/admin`, `app/api` and `lib` (importing from `lib` is fine).

## Flow
- Link the screens together following the links in `screens/*.html`, unless the behavior rules say otherwise.

## Unfinished (links may lead to a missing page)
- Screens: Login, Signup, Verify (Welcome goes straight to Home for now), Profile, Badges, MyReports, Updates.
- LGUDetail has no LGU-only access yet: anyone can change statuses until login and roles exist.
- Location: "Malapit sa akin" and project matching don't use GPS yet.

## Git
- Work only on the `frontend` branch.
- Commit locally after each batch. Never push.

## Before finishing
- Run the build (`npm run build` in `bantayasenso`) and lint, and fix every error.
- Use each changed feature in a real browser at 390 x 844 (and check 360 x 740), and compare the look with `screenshots/`.
- Screenshots ending in `-full` show the whole scrolling page.
- Report what works, what is mocked, layout changes, and anything unfinished.
