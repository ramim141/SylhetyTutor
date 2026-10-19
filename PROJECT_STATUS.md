# SylhetyTutor — প্রজেক্টের বর্তমান অবস্থা

> **শেষ হালনাগাদ:** 2026-10-19 · **Branch:** `feat/sprint-7-reviews-seo-safety` (Sprint 7 শেষ)
> **Test:** backend 413 · frontend 388 · সব পাস (Docker-এ Python 3.12 + PostgreSQL 16); ruff check/format, oxlint, build, `makemigrations --check` ১০০% পরিষ্কার।
>
> এই ফাইলই "এখন পর্যন্ত কী হয়েছে" এর একমাত্র সংক্ষিপ্ত রেকর্ড। **কোনো feature, endpoint, পাতা, command, সিদ্ধান্ত বা জানা-সমস্যা বদলালে একই commit-এ এটা হালনাগাদ করতে হবে** (নিচের "পরিবর্তনের তালিকা"-য় এক লাইন + উপরের তারিখ ও test সংখ্যা)। বিস্তারিত contract আছে `Sprint_1.md` থেকে `Sprint_7.md`-এ; নিয়মকানুন `CLAUDE.md`-এ।

## Sprint-ভিত্তিক অবস্থা

| Sprint | বিষয় | অবস্থা |
| --- | --- | --- |
| 0 | Foundation: Docker, CI, Django/Vite structure, design tokens, i18n, API client | ✅ শেষ |
| 1 | Auth: register/login/refresh/logout/me, lookup + seed | ✅ শেষ (+ পাসওয়ার্ড বদল, আগের পেজে ফেরা, avatar) |
| 2 | Tutor search: filter, sort, pagination, URL-synced, shareable | ✅ শেষ |
| 3 | Tutor profile ও registration: ৬-ধাপের form, NID/ID upload, public profile | ✅ শেষ (imgBB-তে আসল key দিয়ে ছবি এখনো যাচাই বাকি) |
| 4 | Verification (admin), guardian requirement | ✅ শেষ |
| 5 | Apply → shortlist → demo booking → contact খোলা, notification | ✅ শেষ |
| 6 | bKash manual payment, unlock fee, guardian confirmation, commission | ✅ শেষ |
| 7 | Review & Rating, Home Polish, SEO & Area Landing, Safety/Reports & Guarantee, Legal/Trust Pages, UTM Tracking | ✅ শেষ (বিস্তারিত `Sprint_7.md`) |
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
| Apply / Demo | `POST tutors/me/apply/{req}/` · `GET tutors/me/applications/` · `GET requirements/{id}/applications/` · `POST applications/{id}/shortlist|reject|book-demo/` — contact শুধু book-এর পর (fee বন্ধ থাকলে); বিস্তারিত `Sprint_5.md` |
| Payment / Commission | `GET payments/info/` · `POST tutors/me/applications/{id}/pay-unlock/` · `GET tutors/me/payments/` · `GET tutors/me/commissions/` · `POST tutors/me/commissions/{id}/pay/` · `GET/POST confirmations/{token}/` (login ছাড়া, signed link) · admin: `payments/` (+verify/reject), `commissions/` (+mark-paid/waive), `call-list/` (+answer) — বিস্তারিত `Sprint_6.md` |
| Reviews & Ratings | `GET/POST tutors/{id}/reviews/` (শুধু confirmed guardian; ১–৫ star, comment, ১টি প্রতি tutor; `rating_avg` ও `review_count` signal auto-update) · `GET tutors/{id}/reviews/status/` (`can_review`, `already_reviewed`) |
| Safety & Guarantee | `POST safety/reports/` (অভিযোগ: ৭টি category, min ১০ অক্ষর বিবরণ) · `POST safety/replacements/` (১১.৫ ৪৮-ঘণ্টা সন্তুষ্টির নিশ্চয়তা: confirmed match-এর বিকল্প আবেদন) · admin: `GET safety/admin/reports/` (+status filter), `POST safety/admin/reports/{id}/resolve/` (dismiss/warn/suspend), `POST safety/admin/reports/{id}/suspend-tutor/` (one-click suspend + notification), `GET safety/admin/replacements/`, `POST safety/admin/replacements/{id}/resolve/` |
| SEO & Discovery | `GET sitemap.xml` (dynamic sitemap: static + areas + approved tutors) · `GET robots.txt` · `GET tutors/featured/` (home page preview, ১৫ মিনিট cache) |
| অন্যান্য | `GET health/` (DB + cache) · `api/docs/` (Swagger) · Django admin |

- **Model:** `User` (UUID, phone/email, role, UTM: `acquisition_source/medium/campaign`), `Area/Subject/ClassLevel/University`, `TutorProfile` (`draft → pending → approved/rejected`, `rating_avg`, `review_count`), `TutorAvailability`, `VerificationEvent` (জমা/approve/reject-এর audit), `Notification` (kind + data; লেখা frontend বানায়; `REVIEW_RECEIVED`, `REPORT_ACTION_TAKEN`, `REPLACEMENT_REQUESTED`), `GuardianProfile`, `Requirement`, `TutorApplication` (applied/viewed/shortlisted/rejected), `Match` (demo_at, confirmation_*), `ContactUnlock` (কে-কার-কখন, fee_paid, payment), `Payment` (bKash TrxID, unique), `Commission` (due/paid/waived), `Review` (guardian → tutor, rating ১–৫, comment), `Report` (category, reason, status, action_taken, admin_notes), `ReplacementRequest` (match, reason, status, resolution_notes); `TutorProfile.founding_until`, `suspended_at`।
- **Admin verification:** Django admin-এ শুধু জমা-দেওয়া (draft নয়) profile দেখায়; status হাতে বদলানো যায় না, শুধু "Approve" / "Reject" action (reject-এ কারণ বাধ্যতামূলক); প্রতিটি সিদ্ধান্ত `VerificationEvent`-এ ও tutor-কে notification + (email থাকলে) তাঁর ভাষায় email। Mail সার্ভার ব্যর্থ হলে সিদ্ধান্ত আটকায় না। নিয়ম `apps/tutors/review.py`-এ; React-এর জন্য একই service-এর ওপর admin API (error code: `not_pending`, `incomplete_profile` + `fields`, `self_approval` 403, reason `required`/`too_short`/`too_long` — ১০–৫০০ অক্ষর)। Admin অন্যের NID/ID পড়লে `VerificationEvent(document_viewed)` লেখা হয় (মালিক নিজে পড়লে নয়)।
- **Command:** `send_confirmations [--days-ahead N]` (guardian-কে "টিউশন শুরু হয়েছে?" link) · `process_commissions [--days-ahead N]` (১৪ দিনে reminder, ২১ দিনে apply বন্ধ) — দুটোই দিনে একবার, cron থেকে · `seed_data` (১৪ area, ১২ subject, ৫ class, ৩ university) · `seed_demo` (৩০ demo tutor, ২৬ approved; production-এ চলে না; `--reset`)।
- **নিরাপত্তা (বাস্তবায়িত ও test করা):** login প্রতি account-এ ৫/মিনিট; password change/upload throttle; error shape `{detail, code, fields}`; `admin` role API দিয়ে নয়; approved profile অসম্পূর্ণ হতে পারে না (model `clean()`-এ, তাই Django admin ও `full_clean` আটকায়; ডাটাবেস-স্তরে constraint নয়); public profile ও card-এ phone/email/ID কখনো নেই (allow-list)।
- **NID/Student ID:** `PRIVATE_MEDIA_ROOT`-এ (`MEDIA_ROOT`-এর বাইরে, কোনো URL নেই), আসল ছবি কি না decode করে যাচাই, ৫ MB, EXIF মুছে JPEG, এলোমেলো নাম, pending/approved-এ লক, profile মুছলে ফাইলও মোছে, admin-এ session-সুরক্ষিত লিঙ্ক।
- **প্রোফাইল ছবি:** imgBB-তে (public host, শুধু ছবি; NID কখনো নয়), ৫১২px বর্গ, EXIF ছাড়া। `delete_url` গোপন।

## Frontend (React 19 + Vite + Tailwind v4, JSX)

| পাতা | কী আছে |
| --- | --- |
| `/` Home | hero search → `/tutors?q=`, area chip → `/tutors?area=`, সেরা ৬ tutor, "সব tutor দেখুন", stat (আসল মোট) |
| `/tutors` Search | URL-synced filter, sort, pagination, desktop sidebar / ফোনে bottom sheet, removable chip, skeleton/empty/error |
| `/tutors/:slug` | public profile: header, bio, বিষয়/শ্রেণি/এলাকা, সাপ্তাহিক সময়সূচি, "New"/আসল rating, review তালিকা, confirmed guardian-দের Review Dialog, Report Tutor Dialog, SEO Person JSON-LD, 404/retry |
| `/tutors/area/:slug` | Area Landing: এলাকাভিত্তিক টিউটর তালিকা, breadcrumbs, "Post Tuition in {Area}" CTA, SEO WebPage JSON-LD |
| `/about` `/terms` `/privacy` `/faq` `/safety` | Legal, Info & Trust পাতা: FAQ accordion (FAQPage JSON-LD), Safety (৪৮ ঘণ্টার সন্তুষ্টির নিশ্চয়তা, বহুস্তরীয় ভেরিফিকেশন, রিপোর্ট গাইডলাইন), Privacy (প্রাইভেট ডকুমেন্ট স্টোরেজ), Terms, About |
| `/admin/reports` | (শুধু admin) Complaints ও Replacements কিউ: ফিল্টার, তদন্ত, resolve (dismiss/warn/suspend + নোট), ওয়ান-ক্লিক suspend tutor বোতাম |
| Cookie & Attribution | `CookieConsent` ব্যানার (localStorage মনে রাখে) · UTM ট্র্যাকিং (`utm_source, utm_medium, utm_campaign` capture ও registration payload) |
| `/login` `/register` | JWT, আগের পেজে ফেরা (query সহ), তিন ভাষায় error, UTM attribution সহ রেজিস্ট্রেশন |
| `/notifications` | নিজের notification (approve/reject/review/report/replacement), "সব read", খালি/error অবস্থা; Header-এ bell ও unread সংখ্যা |
| `/admin/verification` | (শুধু admin; অন্য role-এ "অনুমতি নেই") Pending / Approved / Rejected ট্যাব ও সংখ্যা, পুরোনো জমা আগে, URL-এ ট্যাব ও পাতা, skeleton/empty/error |
| `/admin/verification/:id` | তথ্য + যোগাযোগ, NID/Student ID viewer (blob, full-screen, "শেয়ার করবেন না" সতর্কতা), checklist (৩টা টিক ছাড়া Approve বন্ধ), Approve/Reject dialog (কারণের chip, ১০–৫০০), সিদ্ধান্তের পর পরের pending-এ যাওয়া, history |
| `/dashboard` | account, ভাষা, পাসওয়ার্ড বদল; tutor-এর status কার্ড + "আপনার জন্য tuition" কার্ড; guardian-এর "requirement post করুন / আমার requirement" কার্ড; admin-এর জন্য Verification, Payments ও Reports কিউ কার্ড |
| `/requirements/new` · `/requirements/:id/edit` | (শুধু guardian) এক পাতার form: class, এলাকা, subject chip, budget, tutor-এর পছন্দ, দিন-সময়; "Publish" ও "Draft save"; দিন-সময়ে ফোন/link ঢুকলে ঘরের পাশে বাংলা error; publish ব্যর্থ হলেও draft থাকে, আবার চাপলে নতুন draft হয় না |
| `/requirements` | (শুধু guardian) নিজের তালিকা: draft/open/closed/expired, publish, edit, delete (নিশ্চিত করে), close (কারণ বেছে), আবার publish; খালি/error অবস্থা |
| `/tutor/requirements` | (শুধু tutor) matching requirement, **Apply** বাটন + note dialog (আবেদন হলে "Applied" ট্যাগ): class + subject, এলাকা, budget, "budget আপনার fee-র সাথে মেলে/মেলে না" ট্যাগ, "কত আগে post"; approved না হলে লক-অবস্থা (profile-এ যাওয়ার লিঙ্ক); guardian-এর কোনো তথ্য নেই |
| Home "Post" শিট / BottomNav | guardian-কে সরাসরি form-এ নেয়; অন্য সবাইকে বলে কী করতে হবে |
| `/tutor/applications` | (শুধু tutor) নিজের application: status, demo-র সময়, demo ঠিক হলে guardian-এর নাম/ফোন (`tel:` লিঙ্ক); fee চালু থাকলে "unlock fee বাকি" বার্তা |
| `/requirements/:id/applicants` | (শুধু guardian) applicant card + note, Shortlist / "এখন নয়", Demo ঠিক করুন (date-time dialog, ১ ঘণ্টা–৩০ দিন), booking-এর পর tutor-এর ফোন; `/requirements`-এ open requirement-এ "Applicants (n)" |
| `/tutor/payments` | (শুধু tutor) commission তালিকা (due/overdue/paid/waived), bKash dialog (কোথায়, কত, TrxID, sender নম্বর), payment history, apply বন্ধ থাকলে লাল সতর্কতা; `/tutor/applications`-এ unlock fee চালু থাকলে একই dialog |
| `/confirm/:token` | (কেউ, login ছাড়া, navbar নেই) "টিউশন কি শুরু হয়েছে?" হ্যাঁ/না, একবারই; ভুল/পুরোনো link-এ "আর বৈধ নয়" |
| `/admin/payments` | (শুধু admin) ৩ ট্যাব: Payments (verify / কারণসহ reject), Commissions (mark paid / waive), Call list (ফোন + WhatsApp, উত্তর লেখা) |
| `/tutor/profile` | ৬ ধাপ + review: প্রতি ধাপে save, মাঝপথ থেকে resume, ছবি ও NID/ID upload, approved-এ শুধু ৪–৬ |
| `/dev/ui` | component gallery (শুধু dev) |

- তিন ভাষা (EN / বাং / Mixed, default Mixed); light/dark token swap; mobile-first (360px যাচাই); কোনো hard-coded রং বা লেখা নেই।
- **Motion ও surface (DESIGN.md 5.3.1):** পাতা নিজে থেকে নরমভাবে ওঠে (`main` fade-up), card grid ক্রমে আসে (`.stagger`), loading-এ shimmer `.skeleton`, sheet/dialog নিচ থেকে উঠে আসে, card hover-এ হালকা lift, দুই-স্তরের নরম shadow; `prefers-reduced-motion` এ সব বন্ধ।
- **Infra:** GitHub Actions (backend + frontend, Postgres 16), pre-commit (ruff + oxlint), CODEOWNERS, PR template, `main`-এ branch ruleset; Docker compose (Postgres + Redis + backend + frontend)।

## যা যাচাই হয়েছে / হয়নি

- ✅ **আসল ব্রাউজারে (Chromium, আসল backend):** Home, Search, filter sheet, profile, registration-এর পুরো প্রবাহ (আসল multipart upload সহ), dashboard, 360px ও desktop, light ও dark।
- ✅ **Postgres 16.15-এ পুরো backend suite (253) ও migration** — পাস। (CI-তে চলা এখনো বাকি, কারণ PR নেই।)
- ✅ **আসল ব্রাউজারে bell ও `/notifications`** — 360px ও 1440px, light ও dark, Mixed ভাষা।
- ✅ **আসল ব্রাউজারে admin queue/detail** — 360px ও 1440px, light ও dark; আসল backend ও আসল upload করা scan; approve → পরের profile, reject (chip) → tutor-এর `/notifications`-এ বার্তা; ভুল role-এ "অনুমতি নেই"। শুধু Mixed ভাষায় দেখা (BN/EN ব্রাউজারে দেখা হয়নি)।
- ✅ **Docker compose + PostgreSQL 16, শূন্য database থেকে (2026-10-14, `main`)** — ১২টা migration সব সফল, backend ০ বার restart, `seed_data`/`seed_demo`, public API (search, filter, page ২, profile) ঠিক, profile-এ যোগাযোগের তথ্য নেই।
- ✅ **Docker + Postgres-এ আসল ব্রাউজারে admin approve/reject (2026-10-14)** — approve → public search ২৬ থেকে ২৭, slug, audit (`document_viewed`, `approved`), tutor-এর notification; reject (১০ অক্ষরের নিচে error; chip) → কারণ সংরক্ষিত, `verified_at` খালি, notification; আবার জমা → `pending`। আসল API-তে অনুমতি: 401/403/404 ও 409 (`not_pending`, `self_approval`)। 375px ও dark-এও দেখা। (শুধু Mixed ভাষায়।)
- ✅ **Docker + Postgres 16-এ requirement flow, আসল ব্রাউজারে (2026-10-14)** — ২টা নতুন migration সফল; guardian: form, ফোন নম্বর দেওয়া note আটকে বাংলা error, ঠিক করে publish, তালিকায় "Open"; tutor (approved): class না মিললে খালি, মিললে card ও "budget মেলে" ট্যাগ। শুধু Mixed ভাষা; ফোনের মতো সরু (~৫০০px) ও dark-এ tutor পাতা, light-এ guardian পাতা দেখা। **দেখা হয়নি:** EN/বাং ভাষা, ৩৬০px ও বড় পর্দা, Home-এর Post শিট ও dashboard কার্ড (শুধু test-এ আছে), close/delete dialog (শুধু test-এ), limit (৩ open) আসল ব্রাউজারে। Test user মুছে ফেলা হয়েছে।
- ✅ **Sprint 5 ও 6 আসল ব্রাউজারে (Chromium pane, SQLite, আসল backend, Mixed ভাষা, ৩৭৫px ও dark; admin পাতা desktop-এও) — 2026-10-15:** apply → shortlist → demo → (fee চালু) bKash TrxID জমা (ভুল TrxID আটকানো) → admin verify → contact খোলা → `send_confirmations --days-ahead 10` → login-ছাড়া link-এ "হ্যাঁ" → commission ৳500 due → `process_commissions --days-ahead 21` (apply বন্ধ সতর্কতা) → commission pay → admin verify → suspension উঠে গেছে; email console backend-এ। **দেখা হয়নি:** light theme, EN/বাং ভাষা, ৩৬০px, Postgres/Docker, reject/waive/call-list ব্রাউজারে (শুধু test-এ), আসল SMTP।
- ✅ **Docker + PostgreSQL 16 + Python 3.12 (2026-10-16, Sprint 6 সহ কোড, `main`-এর সমান)** — migration সফল, `manage.py check` পরিষ্কার, **পুরো backend suite ৩৯৯ পাস**; লাইভ API-তে Sprint 1–6 পুরো চক্র ৬৮টা যাচাইয়ের ৬৭টা পাস (বাকি ১টা ছিল আমার স্ক্রিপ্টের ভুল sort নাম, API ঠিকই 400 দিয়েছে): register/login/language, search ও filter (ফোন-ইমেইল নেই), tutor profile ও NID/ID আপলোড, submit, admin reject → resubmit → approve, requirement ও matching (guardian-এর তথ্য নেই), apply, shortlist, demo, যোগাযোগ শুধু booking-এর পর, guardian confirmation link, commission, bKash TrxID, admin verify, Swagger/OpenAPI। এছাড়া সব ১৭টা পাতা × (ফোন/desktop × light/dark) Edge headless-এ: কোনো console error বা আড়াআড়ি overflow নেই (শুধু Mixed ভাষা)।
- ⚠️ **এখনো দেখা হয়নি:** EN/বাং ভাষায় পুরো প্রবাহ ব্রাউজারে হাতে চালিয়ে; `UNLOCK_FEE_ENABLED=true` অবস্থায় লাইভ API চক্র (শুধু test-এ আছে); আসল bKash/SMTP/imgBB।
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
| Requirement-এর বাকি | tutor-কে নতুন requirement-এর notification নেই; `seed_demo`-এ demo requirement/application নেই; guardian-এর phone OTP (`phone_verified` শুধু রাখা আছে, কেউ সেট করে না) |
| Sprint 6-এর বাকি | Commission-এর হার খোলা প্রশ্ন (এখন নির্দিষ্ট ৳৫০০, `COMMISSION_AMOUNT`); `BKASH_NUMBER` production-এ env-এ বসাতে হবে (ডিফল্ট dummy); দুই command cron-এ বসানো বাকি (Celery নেই); Pro/Premium subscription নেই (commission-মুক্ত শুধু founding tutor, Django admin-এ `founding_until`); "disputed" commission-এর action নেই; আসল bKash merchant API পরে (`services.gateway` বদলালেই হবে); payment করার আগে tutor-কে amount মেলানোর কোনো স্বয়ংক্রিয় যাচাই নেই — admin হাতে মেলায় |
| Sprint 5-এর বাকি | Celery + Redis চালু হয়নি (SMS স্থগিত; Sprint 6-এর guardian confirmation-এ লাগবে); admin-এর জন্য React shortlist পাতা নেই (Django admin action আছে); `UNLOCK_FEE_ENABLED` চালু করলে contact আটকে থাকে যতক্ষণ Sprint 6-এর payment না আসে; application withdraw নেই; booked demo বাতিল করার উপায় নেই (শুধু সময় বদল) |

## পরের ধাপ (প্রস্তাব)

1. UI polish PR (#13) review ও merge।
2. দুই command-এর (`send_confirmations`, `process_commissions`) cron; `UNLOCK_FEE_ENABLED=true` সহ লাইভ চক্র একবার।
3. NID আপলোডের দুজনের security review (আসল NID নেওয়ার আগে)।
4. Sprint 7: Review, Home, SEO, safety/report।

## পরিবর্তনের তালিকা (নতুনটা উপরে যোগ হবে)

- **2026-10-19** — **Admin Navigation, Dedicated URL & Python 3.14 Django Compatibility:**
  - **Python 3.14 Compatibility (`backend/config/__init__.py`):** Python 3.14-এ `copy.copy(super())`-এর অভ্যন্তরীণ পরিবর্তনের কারণে Django 5.1-এর `BaseContext.__copy__`-এ আসা `AttributeError: 'super' object has no attribute 'dicts'` সমাধান করা হয়েছে সেফ কপি প্যাচের মাধ্যমে। Django Admin (`/admin/accounts/user/`) এখন ১০০% সচল (HTTP 200)।
  - **Admin Dashboard Routes (`/admin` ও `/admin/dashboard`):** `App.jsx`-এ `/admin` (redirect) এবং `/admin/dashboard` রুট যোগ করা হয়েছে `RoleRoute roles={["admin"]}` সহ।
  - **Top Navigation (`Header.jsx`):** ডেস্কটপে লগইন করা অ্যাডমিনের জন্য নেভিগেশন বারে সরাসরি দৃশ্যমান "Admin Dashboard" লিঙ্ক যুক্ত করা হয়েছে।
  - **Admin Pages Desktop Navigation:** `Dashboard.jsx`, `VerificationQueue.jsx`, `PaymentsAdmin.jsx`, `ReportsAdmin.jsx`, এবং `VerificationDetail.jsx`-এ ডেস্কটপ মোডে শীর্ষ `<Header />` রেন্ডার করা হয়েছে যাতে অ্যাডমিন সহজে যেকোনো পেজে নেভিগেট করতে পারেন (বারবার ব্যাক বাটন চাপতে না হয়)।
  - **Admin Queue Card Improvements (`AdminQueueCard.jsx`):** Django Backend Admin প্যানেলে সরাসরি যাওয়ার জন্য সুবিধাজনক লিঙ্ক বাটন যুক্ত।
- **2026-10-19** — **Sprint 7 সম্পূর্ণ বাস্তবায়ন (branch `feat/sprint-7-reviews-seo-safety`):**
  - **Reviews & Ratings (`apps/reviews`):** `Review` মডেল (১–৫ star, comment, ১টি প্রতি confirmed tutor), post-save/delete signal দিয়ে `rating_avg` ও `review_count` স্বয়ংক্রিয় হিসাব; `TutorReviewListView`, `TutorReviewCreateView`, `GuardianReviewStatusView`; React: `ReviewDialog` ও `/tutors/:slug` এ রিভিউ তালিকা ও রেটিং প্রদর্শন।
  - **Homepage Polish & Featured Tutors (`apps/tutors`):** `GET /api/v1/tutors/featured/` (১৫ মিনিট cached); React Home পেজে featured টিউটর লোড ও fallback; reusable `Footer` কম্পোনেন্ট দিয়ে লিগ্যাল ও তথ্য পেজ সংযোগ।
  - **SEO, Discovery & Area Landing Pages:** `GET /sitemap.xml` (dynamic sitemap: static + areas + approved tutors), `GET /robots.txt`; React `SEO` কম্পোনেন্ট (Person, EducationalOrganization, WebPage, FAQPage JSON-LD schema ইনজেকশন); `/tutors/area/:slug` dynamic landing page (breadcrumbs, area tutors, "Post Tuition in {Area}" CTA)।
  - **Safety, Reports & 48-Hour Guarantee (`apps/safety`):** `Report` মডেল (৭টি ক্যাটাগরি, min ১০ অক্ষর বিবরণ); `ReplacementRequest` মডেল (১১.৫ সন্তুষ্টির নিশ্চয়তা: ড্যাশবোর্ড থেকে বিকল্প টিউটর চাওয়া); React `ReportDialog`, `ReplacementDialog`; `/admin/reports` (Complaints ও Replacements অ্যাডমিন কিউ: ফিল্টার, তদন্ত, নোটসহ resolve, এবং ওয়ান-ক্লিক suspend tutor বোতাম)।
  - **Legal, Trust & Info Pages:** `/about` (মিশন, কেন নির্ভরযোগ্য, সিলেটের প্রেক্ষাপট), `/terms` (শর্তাবলি), `/privacy` (গোপনীয়তা ও প্রাইভেট ডকুমেন্ট স্টোরেজ), `/faq` (অভিভাবক ও টিউটর একর্ডিয়ন), `/safety` (নিরাপত্তা নির্দেশিকা ও ৪৮ ঘণ্টার গ্যারান্টি ব্যানার)।
  - **Attribution & Cookie Banner:** `CookieConsent` ব্যানার (localStorage সম্মতি); UTM ক্যাপচার (`utm_source, utm_medium, utm_campaign`) ও রেজিস্ট্রেশনে পাস।
  - **API Error Codes & Translations:** ১১২টি নতুন i18n key তিন ভাষায় (`en.js`, `bn.js`, `mixed.js`) নিখুঁতভাবে সমন্বিত; ৩টি নতুন Notification kind (`REVIEW_RECEIVED`, `REPORT_ACTION_TAKEN`, `REPLACEMENT_REQUESTED`)।
  - **Testing & Verification:** Backend ৪১৩ পাস (নতুন +১৪; Docker + Postgres 16), Frontend ৩৮৮ পাস (নতুন +১১), ruff check/format, oxlint, vite build সব ১০০% পরিষ্কার ও সফল। `Sprint_7.md` যোগ।
- **2026-10-16** — সব sprint একসাথে যাচাই: Docker + Postgres 16-এ backend ৩৯৯ পাস, লাইভ API-তে Sprint 1–6 চক্র, সব পাতা ৪ মোডে console/overflow পরিষ্কার (বিস্তারিত "যাচাই হয়েছে"-তে)। কোড বদলায়নি।
- **2026-10-16** — UI polish (শুধু চেহারা, আচরণ বদলায়নি): `BottomSheet`-এর `animate-in slide-in-from-bottom` আসলে কোথাও ডিফাইন ছিল না (sheet ঝট করে আসত) — নিজস্ব motion token (`theme.css`) দিয়ে ঠিক; দুই-স্তরের shadow; `main` fade-up, `.stagger`, `.skeleton` shimmer (সব `animate-pulse` বদলানো); tutor card: featured-এর মোটা সবুজ border নরম ring-এ, "View Profile" ভারী কমলা outline থেকে শান্ত বোতাম + তীর, hover lift; hero-তে গভীরতা; smooth scroll, selection রং, নরম scrollbar, `prefers-reduced-motion`। `DESIGN.md` হালনাগাদ। Test অপরিবর্তিত (frontend 377 পাস, Sprint 6 সহ)। ব্রাউজারে (Edge headless) Home/Search আগে-পরে দেখা, light ও dark।
- **2026-10-16** — Sprint 6 `main`-এ আনা: PR #11-এর base ছিল `feat/sprint-5-apply-demo`, তাই merge হয়েও কোড `main`-এ ঢোকেনি। `main`-এর উপর একই tree (৬৭ ফাইল) নতুন branch-এ বসিয়ে PR; `main` + Sprint 6 একসাথে পুরো suite চালানো হয়েছে (backend 399, frontend 377)।
- **2026-10-15** — Sprint 6 (৫ ভাগে, branch `feat/sprint-6-payment-commission`): নতুন app `apps/payments` (`Payment` + `ManualBkash` gateway, `Commission`), unlock fee bKash TrxID + admin verify (verify হলে `ContactUnlock`), guardian confirmation (signed link, `send_confirmations`, call list), commission (founding মাফ, pay/mark-paid/waive, `process_commissions`: reminder ও apply-বন্ধ), ৬টা নতুন notification kind (+ তিন ভাষার email), `TutorProfile.founding_until/suspended_at`, throttle `payment_submit` ১০/ঘণ্টা ও `confirm_link` ৩০/ঘণ্টা; React: `PayDialog`, `/tutor/payments`, `/confirm/:token`, `/admin/payments`, ১১০টা নতুন i18n key। Test: backend +৩৯ (399), frontend +২৩ (377)। `Sprint_6.md` যোগ।
- **2026-10-15** — Sprint 5 (৫ ভাগে, branch `feat/sprint-5-apply-demo`): নতুন app `apps/matching` (`TutorApplication`, `Match`, `ContactUnlock`), apply / my-applications / applicants / shortlist / reject / book-demo API, contact শুধু booked demo-র পর, `UNLOCK_FEE_ENABLED` (বন্ধ), ৪টা নতুন notification kind (+ তিন ভাষার email), throttle `application_create` ৩০/ঘণ্টা; React: Apply dialog, `/tutor/applications`, `/requirements/:id/applicants`, ৭১টা নতুন i18n key। Test: backend +৩৭ (360), frontend +১৭ (354)। `Sprint_5.md` যোগ।
- **2026-10-14** — Sprint 4 frontend: `/requirements` (তালিকা, close/delete dialog, আবার publish), `/requirements/new` ও `/:id/edit` (এক পাতার form, draft save/resume), `/tutor/requirements` (matching + লক-অবস্থা), dashboard কার্ড, Home "Post" শিট ও BottomNav; ৮৫টা নতুন i18n key (তিন ভাষা); `Sprint_4.md`-এ পার্থক্যের তালিকা। Test +১৬ (frontend 337)।
- **2026-10-14** — Sprint 4 backend: `apps/guardians` (`GuardianProfile` + signal + পুরোনো guardian-দের backfill migration, `Requirement`: draft/open/closed, ৩০ দিনে expire, limit ৩ open/৫ draft lock-সহ), `schedule_note`-এ ফোন/e-mail/link/chat-app/বাংলা সংখ্যা আটকানো, matching (area, class, subject, gender), `IsApprovedTutor`, tutor-এর response-এ guardian-এর কোনো তথ্য নেই (allow-list; test আছে), Django admin read-only। `Sprint_4.md` থেকে পার্থক্য: `title` রাখা হয়নি; admin-এর জন্য আলাদা guardian API নেই, শুধু Django admin; budget ৫০০–১,০০,০০০ টাকা। Test +৪৭ (323)।
- **2026-10-14** — Stabilize: `test_avatar`-এর ৫ MB বাইট test-এর নামে ঢুকত (Windows-এ ২টা error ও ১০ MB output) — `ids=` দিয়ে ঠিক; frontend test-এর অপেক্ষার সীমা ১s থেকে ৫s (`/dev/ui` lazy route সাময়িক ব্যর্থ হত); `VerificationDetail` approve test-এর race ঠিক; `Sprint_4.md` (পরিকল্পনা) যোগ; `main` Docker ও Postgres 16-এ শূন্য থেকে যাচাই।
- **2026-10-13** — Sprint 4 Part 2: React admin verification (queue, detail, document viewer, checklist, approve/reject dialog), `RoleRoute`, `Dialog`, dashboard-এ admin কার্ড, তিন ভাষা। Test-এ ধরা পড়া বাগ ঠিক: dialog প্রতি keystroke-এ focus হারাত।
- **2026-10-13** — Sprint 4 Part 1: admin approvals API (list/detail/approve/reject), verification error code (`not_pending`, `incomplete_profile`, `self_approval`), reason ১০–৫০০, `document_viewed` audit; exception handler এখন custom 403/409 code রাখে। Backend 276 (SQLite ও Postgres 16 দুটোতেই)। React admin পাতা পরের part।
- **2026-10-12** — Stabilize + Sprint 4 (আংশিক), commit হয়নি: Search কার্ড তিন ভাষায় (API কার্ড এখন object পাঠায় — `Sprint_2.md` দেখুন), হার্ডকোডেড `aria-label` ঠিক, Register-এ password-similarity, route-ভিত্তিক lazy-load ও অব্যবহৃত `react-hook-form` বাদ, admin verification (approve/reject + কারণ + audit) ও notification (API, email, bell, `/notifications`), Postgres 16-এ suite যাচাই।
- **2026-10-12** — Sprint 3 শেষ: ৬-ধাপের registration form, ছবি ও NID/ID upload, dashboard status কার্ড, public profile ও slug, `seed_demo`-র ছবি; imgBB-তে avatar।
- **2026-10-12** — Sprint 2 শেষ: search API ও `/tutors` পাতা, filter sidebar/sheet, Home ↔ Search, `seed_demo`, lookups cache।
- **2026-10-12** — Sprint 1-এর ফাঁক ভরা: password change, আগের পেজে ফেরা, permission test, throttle ডক ঠিক।
- **আগে** — Sprint 0 ও Sprint 1 (auth, lookups, Docker, CI, design system)।
