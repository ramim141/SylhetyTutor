# SylhetyTutor — প্রজেক্টের বর্তমান অবস্থা

> **শেষ হালনাগাদ:** 2026-10-12 · **Branch:** `sprint-1-fursuu` (push করা, `main`-এ এখনো PR খোলা হয়নি)
> **Test:** backend 253 · frontend 295 · সব পাস (backend SQLite **ও** PostgreSQL 16.15-এ); ruff, oxlint, build, `makemigrations --check` পরিষ্কার
>
> এই ফাইলই "এখন পর্যন্ত কী হয়েছে" এর একমাত্র সংক্ষিপ্ত রেকর্ড। **কোনো feature, endpoint, পাতা, command, সিদ্ধান্ত বা জানা-সমস্যা বদলালে একই commit-এ এটা হালনাগাদ করতে হবে** (নিচের "পরিবর্তনের তালিকা"-য় এক লাইন + উপরের তারিখ ও test সংখ্যা)। বিস্তারিত contract আছে `Sprint_1.md`, `Sprint_2.md`, `Sprint_3.md`-এ; নিয়মকানুন `CLAUDE.md`-এ।

## Sprint-ভিত্তিক অবস্থা

| Sprint | বিষয় | অবস্থা |
| --- | --- | --- |
| 0 | Foundation: Docker, CI, Django/Vite structure, design tokens, i18n, API client | ✅ শেষ |
| 1 | Auth: register/login/refresh/logout/me, lookup + seed | ✅ শেষ (+ পাসওয়ার্ড বদল, আগের পেজে ফেরা, avatar) |
| 2 | Tutor search: filter, sort, pagination, URL-synced, shareable | ✅ শেষ |
| 3 | Tutor profile ও registration: ৬-ধাপের form, NID/ID upload, public profile | ✅ শেষ (imgBB-তে আসল key দিয়ে ছবি এখনো যাচাই বাকি) |
| 4 | Verification (admin), guardian requirement | 🟡 Verification ও notification বাস্তবায়িত (Django admin-এ); `GuardianProfile`/`Requirement` বাকি |
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
| Notification | `GET notifications/` (+`unread_count`) · `GET notifications/unread-count/` · `POST notifications/read-all/` · `POST notifications/{id}/read/` (শুধু নিজেরটা; অন্যেরটা 404) |
| অন্যান্য | `GET health/` (DB + cache) · `api/docs/` (Swagger) · Django admin |

- **Model:** `User` (UUID, phone/email, role), `Area/Subject/ClassLevel/University`, `TutorProfile` (`draft → pending → approved/rejected`), `TutorAvailability`, `VerificationEvent` (জমা/approve/reject-এর audit), `Notification` (kind + data; লেখা frontend বানায়)।
- **Admin verification:** Django admin-এ শুধু জমা-দেওয়া (draft নয়) profile দেখায়; status হাতে বদলানো যায় না, শুধু "Approve" / "Reject" action (reject-এ কারণ বাধ্যতামূলক); প্রতিটি সিদ্ধান্ত `VerificationEvent`-এ ও tutor-কে notification + (email থাকলে) তাঁর ভাষায় email। Mail সার্ভার ব্যর্থ হলে সিদ্ধান্ত আটকায় না। নিয়ম `apps/tutors/review.py`-এ।
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
| `/dashboard` | account, ভাষা, পাসওয়ার্ড বদল, tutor-এর status কার্ড (draft/pending/rejected/approved) |
| `/tutor/profile` | ৬ ধাপ + review: প্রতি ধাপে save, মাঝপথ থেকে resume, ছবি ও NID/ID upload, approved-এ শুধু ৪–৬ |
| `/dev/ui` | component gallery (শুধু dev) |

- তিন ভাষা (EN / বাং / Mixed, default Mixed); light/dark token swap; mobile-first (360px যাচাই); কোনো hard-coded রং বা লেখা নেই।
- **Infra:** GitHub Actions (backend + frontend, Postgres 16), pre-commit (ruff + oxlint), CODEOWNERS, PR template, `main`-এ branch ruleset; Docker compose (Postgres + Redis + backend + frontend)।

## যা যাচাই হয়েছে / হয়নি

- ✅ **আসল ব্রাউজারে (Chromium, আসল backend):** Home, Search, filter sheet, profile, registration-এর পুরো প্রবাহ (আসল multipart upload সহ), dashboard, 360px ও desktop, light ও dark।
- ✅ **Postgres 16.15-এ পুরো backend suite (253) ও migration** — পাস। (CI-তে চলা এখনো বাকি, কারণ PR নেই।)
- ✅ **আসল ব্রাউজারে bell ও `/notifications`** — 360px ও 1440px, light ও dark, Mixed ভাষা।
- ❌ **আসল SMTP দিয়ে email** — শুধু locmem backend-এ test; আসল mail server যাচাই হয়নি।
- ❌ **imgBB-তে আসল key দিয়ে ছবি আপলোড** (এই sandbox থেকে imgBB পৌঁছানো যায় না; শুধু mock ও "unavailable" বার্তা যাচাই)।
- ❌ **Docker compose** (cloud-এ Docker নেই); ❌ NID আপলোডের **দুজনের security review** (Sprint Plan অনুযায়ী বাধ্যতামূলক)।

## জানা সমস্যা ও বাকি কাজ

| বিষয় | বিবরণ |
| --- | --- |
| Password reset | নেই (SMS স্থগিত; Sprint 4–5-এ email) |
| imgBB ছবি মোছা | সরালে/বদলালে সাইট নতুনটা দেখায়, কিন্তু imgBB-তে পুরোনো কপি থাকে (imgBB-র স্বয়ংক্রিয় delete API নেই; `avatar_delete_url` শুধু DB-তে, কখনো expose হয় না) — সীমাবদ্ধতা, বাইরের নির্ভরতা |
| Admin UI | verification এখন শুধু Django admin; React admin পাতা নেই |
| Notification | শুধু approve/reject; bell ফোকাসে/লোডে refresh হয়, লাইভ push/polling নেই; admin-কে "নতুন জমা" নোটিশ নেই |
| Bundle | main 496 kB (gzip 153 kB), বাকি পাতা আলাদা chunk; লক্ষ্য <200 kB gzip এর ভেতরে প্রায় আছে, আসল ফোন/নেটওয়ার্কে মাপা হয়নি |
| Production-এর আগে | `PRIVATE_MEDIA_ROOT` persistent volume (বা private bucket) + backup; Nginx-এ কখনো খোলা নয় |
| Branch | Sprint 1–3 এক branch-এ জমেছে; `main`-এ PR ভাগ করে (Sprint 1+2, Sprint 3) খোলা বাকি |

## পরের ধাপ (প্রস্তাব)

1. এই পরিবর্তনগুলো commit করা ও PR খোলা (CI Postgres-এ সবুজ করা, দুজনের security review)।
2. Sprint 4-এর বাকি: `GuardianProfile`, `Requirement`।
3. Sprint 5: apply → demo booking (notification কাঠামো তৈরি আছে)।

## পরিবর্তনের তালিকা (নতুনটা উপরে যোগ হবে)

- **2026-10-12** — Stabilize + Sprint 4 (আংশিক), commit হয়নি: Search কার্ড তিন ভাষায় (API কার্ড এখন object পাঠায় — `Sprint_2.md` দেখুন), হার্ডকোডেড `aria-label` ঠিক, Register-এ password-similarity, route-ভিত্তিক lazy-load ও অব্যবহৃত `react-hook-form` বাদ, admin verification (approve/reject + কারণ + audit) ও notification (API, email, bell, `/notifications`), Postgres 16-এ suite যাচাই।
- **2026-10-12** — Sprint 3 শেষ: ৬-ধাপের registration form, ছবি ও NID/ID upload, dashboard status কার্ড, public profile ও slug, `seed_demo`-র ছবি; imgBB-তে avatar।
- **2026-10-12** — Sprint 2 শেষ: search API ও `/tutors` পাতা, filter sidebar/sheet, Home ↔ Search, `seed_demo`, lookups cache।
- **2026-10-12** — Sprint 1-এর ফাঁক ভরা: password change, আগের পেজে ফেরা, permission test, throttle ডক ঠিক।
- **আগে** — Sprint 0 ও Sprint 1 (auth, lookups, Docker, CI, design system)।
