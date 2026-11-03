# VeriSite: build rules

Read together with `CLAUDE.md` in this folder (design and product rules) and `bantayasenso/AGENTS.md` (Next.js version notes).

## Where things go
- All new pages live inside `bantayasenso/app/verisite`, one folder per screen, e.g. `app/verisite/home/page.tsx`.
- Reuse the shared components in `bantayasenso/components`. Don't copy their code into a page; extend the component instead.
- Images live in `bantayasenso/public/verisite` and are referenced as `/verisite/<name>.png`.
- Sample data comes from one shared file: `bantayasenso/app/verisite/sample-data.ts`. Don't connect to Supabase or Gemini.

## Don't touch
- `app/page.tsx`, `app/scan`, `app/admin`, `app/api` and `lib`.

## Flow
- Link the screens together so the whole app can be clicked through, following the links in `screens/*.html`.

## Git
- Work only on the `frontend` branch.
- Commit locally after each batch. Never push.

## Before finishing
- Run the build (`npm run build` in `bantayasenso`) and fix every error.
- Open each page at 390 x 844 (and check 360 x 740) and compare it with `screenshots/`.
- Screenshots ending in `-full` show the whole scrolling page.
- Report what you checked and anything unfinished or different from the mockup.
