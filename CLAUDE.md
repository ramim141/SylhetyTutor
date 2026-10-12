# SylhetyTutor

Home-tutor marketplace for Sylhet, Bangladesh: verified university-student tutors ↔ guardians.
Two developers (@ramim141, @Mahdi-HasanIO), monorepo, 8-sprint MVP. Mobile-first: most guardians use phones.

Source of truth for scope and design (read before building a feature):
`SylhetyTutor — System Architecture Document.md` (models §3, API §4, rules §8.8) ·
`SylhetyTutor Sprint Plan.md` (what each sprint delivers) · `DESIGN.md` (colors, components, UI rules) ·
`Sprint_1.md` (API contract and auth rules) · `Sprint_2.md` (tutor search contract). Where docs and code disagree, code is current; fix the doc.

## Layout

```
backend/   Django 5.1 + DRF, Python 3.12   apps: accounts, lookups, tutors  (config/settings: base, development, production, test)
frontend/  React 19 + Vite 6, plain JSX (no TypeScript), Tailwind v4, Zustand, Axios, Vitest, oxlint
docker-compose.yml  db(Postgres 16) + redis + backend + frontend for local dev
.github/   CI (backend.yml, frontend.yml), CODEOWNERS, PR template
```

## Commands (run the ones for the side you touched before saying "done")

```bash
# Backend (from backend/)
pip install -r requirements-dev.txt
python -m pytest -q                              # SQLite by default, no Docker/Redis needed
python -m ruff check . && python -m ruff format --check .
python manage.py makemigrations --check --dry-run   # must print "No changes detected"
python manage.py seed_data                       # 14 areas, 12 subjects, 5 class levels, 3 universities (idempotent)
python manage.py seed_demo                       # 30 demo tutors (26 approved), local/staging only; --reset removes them

# Frontend (from frontend/) — needs Node >= 24
npm ci
npm run lint && npm test && npm run build

# Whole stack (needs Docker; not available in cloud sessions)
docker compose up -d        # http://localhost:5173 · API http://localhost:8000/api/docs/
```

Local backend uses SQLite when `DATABASE_URL` is empty; Docker, CI and production use Postgres.
`config.settings.production` refuses to start without a strong `DJANGO_SECRET_KEY`, real
`DJANGO_ALLOWED_HOSTS` and `DATABASE_URL`. Never commit `.env`, keys, tokens or `db.sqlite3`.

## Rules that already cost us bugs

**Text and languages.** Three modes: EN, বাং, Mixed (Banglish, default). No user-visible text hard-coded
in components: use `t("key")` (supports `{param}`) and add the key to **all three** of `src/i18n/{en,bn,mixed}.js`
(`i18n.test.jsx` fails otherwise). Bengali runs ~20–30% longer than English: leave room. Error messages
come from API error `code`s mapped in `src/api/errors.js`, never from raw server English.

**Design system (DESIGN.md).** Colors only through tokens in `src/styles/theme.css`: no hex, no `text-white`,
`gray-*`, `slate-*`. Text on colored backgrounds uses `on-*` tokens; orange *text* is `text-orange-text`.
No `dark:` utilities: dark mode is a token swap. Tailwind v4 syntax (`bg-linear-to-b`, `@theme`).
Inputs ≥ 16px (stops iOS zoom), touch targets ≥ 44px, check 360–375px phones **and** large screens, light **and** dark.
Logo: use `<Logo />` (picks the right file per theme), never re-type the wordmark.
Login/Register have no navbar or bottom nav; the Register card fits the viewport at `xl`.

**API.** Errors are `{detail, code, fields: {field: [{code, message}]}, retry_after?}` (`config/exceptions.py`).
Breaking an endpoint's shape means updating `Sprint_1.md`/Swagger and the frontend in the same PR.

**Data and safety rules.**
- Phones are stored as `01XXXXXXXXX` (accepts `+880…`/`880…`/spaces); emails lowercase. Use `apps/accounts/validators.py`.
- `admin` role is never assignable through the API. New `TutorProfile` is `pending` until an admin approves.
- Tutor/guardian phone, address and documents never appear in public or list responses (commission model:
  contact opens only after a booked demo, Architecture Doc §8.8). NID/Student-ID files must be private storage.
- No invented numbers: no fake ratings, counts or testimonials. No review → show "New", not 0.0 or 5.0.
- Login is throttled per account (5/min), not per IP: mobile carriers share IPs (CGNAT).

**Tests ship with the change.** Backend: pytest + permission tests for any endpoint. Frontend: Vitest + Testing
Library; mock `api/*` modules in page/route tests (no real network). Prefer fixing the cause over loosening a test.

## Workflow

- Never push to `main` (ruleset: PR + squash merge + passing CI + another approver). Branch per task, e.g.
  `feat/12-tutor-search`, `fix/…`, `chore/…`. Keep PRs focused (~300–400 lines); fill the PR template checklist.
- Conventional Commits (`feat(tutors): …`). pre-commit runs ruff + oxlint locally; CI repeats them on Postgres 16.
- Migrations are committed; one developer changes models of an app at a time (conflicts). Rebase before PR.
- Cloud/headless sessions have no Docker or browser: rely on tests, lint and build. Setup:
  `pip install -r backend/requirements-dev.txt && cd frontend && npm ci` (Node 24).
- Windows dev machines print "LF will be replaced by CRLF" warnings; harmless.

## Decisions already made (don't reopen)

JavaScript not TypeScript · Mixed language default · manual bKash Send-Money + TrxID before any gateway ·
SMS postponed (email + WhatsApp link for now) · Founding-tutor and commission model per Architecture Doc §8.8 ·
Sprint order per the Sprint Plan (Sprint 2 = tutor search: filters, URL-synced, shareable).

## Working with the owner

The owner writes Banglish/Bengali: answer in Bengali (technical terms in English), short and concrete.
Say plainly what was verified and what was not. Confirm before anything outward-facing (push, PR, deploy).
