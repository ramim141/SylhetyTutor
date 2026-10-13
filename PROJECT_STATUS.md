# SylhetyTutor — প্রজেক্টের বর্তমান অবস্থা

> **শেষ হালনাগাদ:** 2026-10-14 · **Base:** `main` (`a5f5417`; PR #5–#7 merge হয়েছে, CI সবুজ)
> **Test:** backend 323 (SQLite) · frontend 321 · সব পাস; ruff, `makemigrations --check` পরিষ্কার। Frontend ও Postgres/ব্রাউজারে requirement flow এখনো যাচাই হয়নি।
>
> এই ফাইলই "এখন পর্যন্ত কী হয়েছে" এর একমাত্র সংক্ষিপ্ত রেকর্ড। **কোনো feature, endpoint, পাতা, command, সিদ্ধান্ত বা জানা-সমস্যা বদলালে একই commit-এ এটা হালনাগাদ করতে হবে** (নিচের "পরিবর্তনের তালিকা"-য় এক লাইন + উপরের তারিখ ও test সংখ্যা)। বিস্তারিত contract আছে `Sprint_1.md`, `Sprint_2.md`, `Sprint_3.md`, `Sprint_4.md`-এ; নিয়মকানুন `CLAUDE.md`-এ।

## Sprint-ভিত্তিক অবস্থা

| Sprint | বিষয় | অবস্থা |
| --- | --- | --- |
| 0 | Foundation: Docker, CI, Django/Vite structure, design tokens, i18n, API client | ✅ শেষ |
| 1 | Auth: register/login/refresh/logout/me, lookup + seed | ✅ শেষ (+ পাসওয়ার্ড বদল, আগের পেজে ফেরা, avatar) |
| 2 | Tutor search: filter, sort, pagination, URL-synced, shareable | ✅ শেষ |
| 3 | Tutor profile ও registration: ৬-ধাপের form, NID/ID upload, public profile | ✅ শেষ (imgBB-তে আসল key দিয়ে ছবি এখনো যাচাই বাকি) |
| 4 | Verification (admin), guardian requirement | 🟡 Verification, notification ও **requirement backend** (GuardianProfile, Requirement, matching) শেষ; requirement form, "আমার requirement" ও tutor-এর "আপনার জন্য tuition" পাতা (frontend) বাকি — `Sprint_4.md` |
| 5 | Apply → demo booking, notification (SMS স্থগিত) | ⬜ |
| 6 | bKash manual payment, commission | ⬜ |
| 7 | Review, Home polish, SEO, safety/report | ⬜ |
| 8 | Production, soft launch | ⬜ |

## Backend (Django 5.1 + DRF) — `/api/v1/`

| কাজ | Endpoint |
| --- | --- |
| Auth | `POST auth/register/` · `login/` · `token/refresh/` · `logout/` · `GET/PATCH auth/me/` · `PUT/DELETE auth/me/avatar/` (imgBB) · `POST auth/password/change/` |
| Lookups | `GET lookups/` (এক call-এ সব, ১ ঘণ্টা cache, save/delete-এ মোছে) · `lookups/areas|subjects|class-levels|universities/` |
| Tutor search | `GET tutors/` — `area, subject, class_level, university, gender, fee_min, fee_max, q, sort, page, page_size` (প্রতি page ২০) |
| Public profile | `GET tutors/{slug}/` (শুধু approved) |
| নিজের profile | `GET/PATCH tutors/me/` · `POST tutors/me/submit/` |
| NID / Student ID | `PUT/DELETE tutors/me/documents/{nid|student_id}/` · `GET tutors/documents/{id}/{kind}/` (শুধু মালিক ও admin) |
| Admin verification | `GET admin/approvals/?status=` (pending ডিফল্ট, পুরোনো জমা আগে, `counts` সহ) · `GET admin/approvals/{id}/` · `POST …/approve/` · `POST …/reject/ {reason}` (শুধু admin; draft কখনো নয়) |
| Notification | `GET notifications/` (+`unread_count`) · `GET notifications/unread-count/` · `POST notifications/read-all/` · `POST notifications/{id}/read/` (শুধু নিজেরটা; অন্যেরটা 404) |
| Guardian / Requirement | `GET guardians/me/` · `GET/POST requirements/` (draft তৈরি, ১০/ঘণ্টা) · `GET/PATCH/DELETE requirements/{id}/` (PATCH/DELETE শুধু draft; open-এ DELETE → `use_close`) · `POST …/publish/` (limit: ৩ open, ৫ draft; `too_many_open`, `incomplete_requirement`) · `POST …/close/` · `GET requirements/matching/` ও `matching/{id}/` (শুধু approved tutor; area + class + ≥১ subject + gender মিললে; `budget_fits` শুধু flag) |
| অন্যান্য | `GET health/` (DB + cache) · `api/docs/` (Swagger) · Django admin |

- **Model:** `User` (UUID, phone/email, role), `Area/Subject/ClassLevel/University`, `TutorProfile` (`draft → pending → approved/rejected`), `TutorAvailability`, `VerificationEvent` (জমা/approve/reject-এর audit), `Notification` (kind + data; লেখা frontend বানায়)।
- **Admin verification:** Django admin-এ শুধু জমা-দেওয়া (draft নয়) profile দেখায়; status হাতে বদলানো যায় না, শুধু "Approve" / "Reject" action (reject-এ কারণ বাধ্যতামূলক); প্রতিটি সিদ্ধান্ত `VerificationEvent`-এ ও tutor-কে notification + (email থাকলে) তাঁর ভাষায় email। Mail সার্ভার ব্যর্থ হলে সিদ্ধান্ত আটকায় না। নিয়ম `apps/tutors/review.py`-এ; React-এর জন্য একই service-এর ওপর admin API (error code: `not_pending`, `incomplete_profile` + `fields`, `self_approval` 403, reason `required`/`too_short`/`too_long` — ১০–৫০০ অক্ষর)। Admin অন্যের NID/ID পড়লে `VerificationEvent(document_viewed)` লেখা হয় (মালিক নিজে পড়লে নয়)।
- **Command:** `seed_data` (১৪ area, ১২ subject, ৫ class, ৩ university) · `seed_demo` (৩০ demo tutor, ২৬ approved; production-এ চলে না; `--reset`)।
- **নিরাপত্তা (বাস্তবায়িত ও test করা):** login প্রতি account-এ ৫/মিনিট; password change/upload throttle; error shape `{detail, code, fields}`; `admin` role API দিয়ে নয়; approved profile অসম্পূর্ণ হতে পারে না (model `clean()`-এ, তাই Django admin ও `full_clean` আটকায়; ডাটাবেস-স্তরে constraint নয়); public profile ও card-এ phone/email/ID কখনো নেই (allow-list)।
- **NID/Student ID:** `PRIVATE_MEDIA_ROOT`-এ (`MEDIA_ROOT`-এর বাইরে, কোনো URL নেই), আসল ছবি কি না decode করে যাচাই, ৫ MB, EXIF মুছে JPEG, এলোমেলো নাম, pending/approved-এ লক, profile মুছলে ফাইলও মোছে, admin-এ session-সুরক্ষিত লিঙ্ক।
- **প্রোফাইল ছবি:** imgBB-তে (public host, শুধু ছবি; NID কখনো নয়), ৫১২px বর্গ, EXIF ছাড়া। `delete_url` গোপন।

## Frontend (React 19 + Vite + Tailwind v4, JSX)

| পাতা | কী আছে |
| --- | --- |
| `/` Home | hero search → `/tutors?q=`, area chip → `/tutors?area=`, সেরা ৬ tutor, "সব tutor দেখুন", stat (আসল মোট) |
| `/tutors` Search | URL-synced filter, sort, pagination, desktop sidebar / ফোনে bottom sheet, removable chip, skeleton/empty/error |
| `/tutors/:slug` | public profile: header, bio, বিষয়/শ্রেণি/এলাকা, সাপ্তাহিক সময়সূচি, "New"/আসল rating, 404/retry |
| `/login` `/register` | JWT, আগের পেজে ফেরা (query সহ), তিন ভাষায় error |
| `/notifications` | নিজের notification (approve/reject + কারণ), "সব read", খালি/error অবস্থা; Header-এ bell ও unread সংখ্যা |
| `/admin/verification` | (শুধু admin; অন্য role-এ "অনুমতি নেই") Pending / Approved / Rejected ট্যাব ও সংখ্যা, পুরোনো জমা আগে, URL-এ ট্যাব ও পাতা, skeleton/empty/error |
| `/admin/verification/:id` | তথ্য + যোগাযোগ, NID/Student ID viewer (blob, full-screen, "শেয়ার করবেন না" সতর্কতা), checklist (৩টা টিক ছাড়া Approve বন্ধ), Approve/Reject dialog (কারণের chip, ১০–৫০০), সিদ্ধান্তের পর পরের pending-এ যাওয়া, history |
| `/dashboard` | account, ভাষা, পাসওয়ার্ড বদল, tutor-এর status কার্ড (draft/pending/rejected/approved) |
| `/tutor/profile` | ৬ ধাপ + review: প্রতি ধাপে save, মাঝপথ থেকে resume, ছবি ও NID/ID upload, approved-এ শুধু ৪–৬ |
| `/dev/ui` | component gallery (শুধু dev) |

- তিন ভাষা (EN / বাং / Mixed, default Mixed); light/dark token swap; mobile-first (360px যাচাই); কোনো hard-coded রং বা লেখা নেই।
- **Infra:** GitHub Actions (backend + frontend, Postgres 16), pre-commit (ruff + oxlint), CODEOWNERS, PR template, `main`-এ branch ruleset; Docker compose (Postgres + Redis + backend + frontend)।

## যা যাচাই হয়েছে / হয়নি

- ✅ **আসল ব্রাউজারে (Chromium, আসল backend):** Home, Search, filter sheet, profile, registration-এর পুরো প্রবাহ (আসল multipart upload সহ), dashboard, 360px ও desktop, light ও dark।
- ✅ **Postgres 16.15-এ পুরো backend suite (253) ও migration** — পাস। (CI-তে চলা এখনো বাকি, কারণ PR নেই।)
- ✅ **আসল ব্রাউজারে bell ও `/notifications`** — 360px ও 1440px, light ও dark, Mixed ভাষা।
- ✅ **আসল ব্রাউজারে admin queue/detail** — 360px ও 1440px, light ও dark; আসল backend ও আসল upload করা scan; approve → পরের profile, reject (chip) → tutor-এর `/notifications`-এ বার্তা; ভুল role-এ "অনুমতি নেই"। শুধু Mixed ভাষায় দেখা (BN/EN ব্রাউজারে দেখা হয়নি)।
- ✅ **Docker compose + PostgreSQL 16, শূন্য database থেকে (2026-10-14, `main`)** — ১২টা migration সব সফল, backend ০ বার restart, `seed_data`/`seed_demo`, public API (search, filter, page ২, profile) ঠিক, profile-এ যোগাযোগের তথ্য নেই।
- ✅ **Docker + Postgres-এ আসল ব্রাউজারে admin approve/reject (2026-10-14)** — approve → public search ২৬ থেকে ২৭, slug, audit (`document_viewed`, `approved`), tutor-এর notification; reject (১০ অক্ষরের নিচে error; chip) → কারণ সংরক্ষিত, `verified_at` খালি, notification; আবার জমা → `pending`। আসল API-তে অনুমতি: 401/403/404 ও 409 (`not_pending`, `self_approval`)। 375px ও dark-এও দেখা। (শুধু Mixed ভাষায়।)
- ❌ **আসল SMTP দিয়ে email** — শুধু locmem backend-এ test; আসল mail server যাচাই হয়নি।
- ❌ **imgBB-তে আসল key দিয়ে ছবি আপলোড** (এই sandbox থেকে imgBB পৌঁছানো যায় না; শুধু mock ও "unavailable" বার্তা যাচাই)।
- ❌ NID আপলোডের **দুজনের security review** (Sprint Plan অনুযায়ী বাধ্যতামূলক; admin এখন আসল document দেখতে পারে, তাই আসল NID নেওয়ার আগে করতে হবে)।

## জানা সমস্যা ও বাকি কাজ

| বিষয় | বিবরণ |
| --- | --- |
| Password reset | নেই (SMS স্থগিত; Sprint 4–5-এ email) |
| imgBB ছবি মোছা | সরালে/বদলালে সাইট নতুনটা দেখায়, কিন্তু imgBB-তে পুরোনো কপি থাকে (imgBB-র স্বয়ংক্রিয় delete API নেই; `avatar_delete_url` শুধু DB-তে, কখনো expose হয় না) — সীমাবদ্ধতা, বাইরের নির্ভরতা |
| Admin UI | React queue ও detail আছে; `is_staff` কিন্তু role≠admin ব্যবহারকারী React পাতায় "অনুমতি নেই" দেখে (API তাকে অনুমতি দেয়) — `/auth/me` এ `is_staff` নেই |
| Notification | শুধু approve/reject; bell ফোকাসে/লোডে refresh হয়, লাইভ push/polling নেই; admin-কে "নতুন জমা" নোটিশ নেই |
| Bundle | main 509 kB (gzip 159 kB; বাড়ছে মূলত i18n key-তে — তিন ভাষার সব লেখা main-এ), বাকি পাতা আলাদা chunk; লক্ষ্য <200 kB gzip এর ভেতরে প্রায় আছে, আসল ফোন/নেটওয়ার্কে মাপা হয়নি |
| Production-এর আগে | `PRIVATE_MEDIA_ROOT` persistent volume (বা private bucket) + backup; Nginx-এ কখনো খোলা নয় |
| Requirement frontend | requirement form, "আমার requirement" তালিকা, tutor-এর "আপনার জন্য tuition" পাতা, Home-এর "Post" শিট (এখনো "শীঘ্রই আসছে") বাকি; tutor-কে নতুন requirement-এর notification নেই (`Sprint_4.md`) |

## পরের ধাপ (প্রস্তাব)

1. Sprint 4-এর বাকি: `GuardianProfile`, `Requirement`, matching, requirement form, tutor-এর "আপনার জন্য tuition" (`Sprint_4.md`)।
2. NID আপলোডের দুজনের security review (আসল NID নেওয়ার আগে)।
3. Sprint 5: apply → demo booking (notification কাঠামো তৈরি আছে)।

## পরিবর্তনের তালিকা (নতুনটা উপরে যোগ হবে)

- **2026-10-14** — Sprint 4 backend: `apps/guardians` (`GuardianProfile` + signal + পুরোনো guardian-দের backfill migration, `Requirement`: draft/open/closed, ৩০ দিনে expire, limit ৩ open/৫ draft lock-সহ), `schedule_note`-এ ফোন/e-mail/link/chat-app/বাংলা সংখ্যা আটকানো, matching (area, class, subject, gender), `IsApprovedTutor`, tutor-এর response-এ guardian-এর কোনো তথ্য নেই (allow-list; test আছে), Django admin read-only। `Sprint_4.md` থেকে পার্থক্য: `title` রাখা হয়নি; admin-এর জন্য আলাদা guardian API নেই, শুধু Django admin; budget ৫০০–১,০০,০০০ টাকা। Test +৪৭ (323)।
- **2026-10-14** — Stabilize: `test_avatar`-এর ৫ MB বাইট test-এর নামে ঢুকত (Windows-এ ২টা error ও ১০ MB output) — `ids=` দিয়ে ঠিক; frontend test-এর অপেক্ষার সীমা ১s থেকে ৫s (`/dev/ui` lazy route সাময়িক ব্যর্থ হত); `VerificationDetail` approve test-এর race ঠিক; `Sprint_4.md` (পরিকল্পনা) যোগ; `main` Docker ও Postgres 16-এ শূন্য থেকে যাচাই।
- **2026-10-13** — Sprint 4 Part 2: React admin verification (queue, detail, document viewer, checklist, approve/reject dialog), `RoleRoute`, `Dialog`, dashboard-এ admin কার্ড, তিন ভাষা। Test-এ ধরা পড়া বাগ ঠিক: dialog প্রতি keystroke-এ focus হারাত।
- **2026-10-13** — Sprint 4 Part 1: admin approvals API (list/detail/approve/reject), verification error code (`not_pending`, `incomplete_profile`, `self_approval`), reason ১০–৫০০, `document_viewed` audit; exception handler এখন custom 403/409 code রাখে। Backend 276 (SQLite ও Postgres 16 দুটোতেই)। React admin পাতা পরের part।
- **2026-10-12** — Stabilize + Sprint 4 (আংশিক), commit হয়নি: Search কার্ড তিন ভাষায় (API কার্ড এখন object পাঠায় — `Sprint_2.md` দেখুন), হার্ডকোডেড `aria-label` ঠিক, Register-এ password-similarity, route-ভিত্তিক lazy-load ও অব্যবহৃত `react-hook-form` বাদ, admin verification (approve/reject + কারণ + audit) ও notification (API, email, bell, `/notifications`), Postgres 16-এ suite যাচাই।
- **2026-10-12** — Sprint 3 শেষ: ৬-ধাপের registration form, ছবি ও NID/ID upload, dashboard status কার্ড, public profile ও slug, `seed_demo`-র ছবি; imgBB-তে avatar।
- **2026-10-12** — Sprint 2 শেষ: search API ও `/tutors` পাতা, filter sidebar/sheet, Home ↔ Search, `seed_demo`, lookups cache।
- **2026-10-12** — Sprint 1-এর ফাঁক ভরা: password change, আগের পেজে ফেরা, permission test, throttle ডক ঠিক।
- **আগে** — Sprint 0 ও Sprint 1 (auth, lookups, Docker, CI, design system)।
