# 🚀 SylhetyTutor — Sprint 0 Summary & Status

**তারিখ**: ১০ অক্টোবর, ২০২৬  
**ফেজ**: Sprint 0 (Groundwork & Foundation Setup)  
**স্ট্যাটাস**: 🟡 Foundation প্রায় প্রস্তুত — Frontend বিল্ড হয়, Backend লোকালি চালু হয় (SQLite); Docker/PostgreSQL, CI ও test setup বাকি (নিচে "বাকি কাজ")  
**গিটহাব রিপোজিটরি**: [https://github.com/ramim141/SylhetyTutor](https://github.com/ramim141/SylhetyTutor)

---

## ১. বিজনেস ও অপারেশনাল সিদ্ধান্ত (Strategic Alignment)

- **টিউটর সংগ্রহ (Stage 0)**: প্রজেক্ট শুরুর প্রাক-প্রস্তুতি হিসেবে প্রাথমিক টিউটর সংগ্রহের কাজ অফলাইনে সম্পন্ন হয়েছে।
- **পেমেন্ট ফ্লো**: প্রাথমিক পর্যায়ে পেমেন্ট গেটওয়ের জটিলতা এড়াতে ম্যানুয়াল **bKash Send Money + TrxID জমা** নেওয়ার ফ্লো চূড়ান্ত করা হয়েছে (Sprint 6-এর আর্কিটেকচার অনুযায়ী)।
- **এসএমএস গেটওয়ে**: অনুমোদনের বিলম্বের কারণে এসএমএস ইন্টিগ্রেশন পরবর্তী ফেজের জন্য স্থগিত রাখা হয়েছে (আপাতত ইমেইল ও ডিরেক্ট WhatsApp লিঙ্ক ব্যবহৃত হবে)।
- **লোকালহোস্ট ডিপ্লয়মেন্ট**: ফ্রন্টএন্ড (`localhost:5173`) ও ব্যাকএন্ড (`localhost:8000`) ডোমেন ছাড়া লোকালহোস্টে চালানো হচ্ছে।

---

## ২. গিট মনোরিপো ও ইনফ্রাস্ট্রাকচার (Monorepo & DevOps)

- **গিট রিপোজিটরি ইনিশিয়ালাইজেশন**:
  - `main` ব্রাঞ্চ তৈরি ও রিমোট অরিজিন যুক্ত করা হয়েছে: `https://github.com/ramim141/SylhetyTutor.git`।
  - সমস্ত কোড গিটহাবে সফলভাবে পুশ ও ট্র্যাক করা হয়েছে। Sprint 0 এর ঠিক করার কাজ `sprint-0` branch এ।
- **রুট কনফিগারেশন ফাইলস**:
  - `.gitignore`: পাইথন ভার্চুয়াল এনভায়রনমেন্ট, `.env`, মিডিয়া ও নোড মডিউল প্রটেক্টেড। (আগে `.dockerignore` ভুল করে ignore হচ্ছিল — ঠিক করা হয়েছে, এখন দুটো `.dockerignore` ট্র্যাক হয়।)
  - `.env.example`: ব্যাকএন্ড ও ফ্রন্টএন্ডের জন্য এনভায়রনমেন্ট ভেরিয়েবল টেমপ্লেট।
  - `docker-compose.yml`: PostgreSQL 16, Redis 7, Django Backend এবং React Frontend-এর মাল্টি-কনটেইনার অর্কেস্ট্রেশন।
- **ডকার সেটআপ গাইড**: root `README.md` এ `docker compose up --build` দিয়ে চালানোর নির্দেশনা। ⚠️ `docker compose up` এখনো একবারও end-to-end চালিয়ে যাচাই হয়নি।

---

## ৩. ফ্রন্টএন্ড ফাউন্ডেশন (React 19 + Pure JSX + Tailwind v4) — [লাইভ ও ভেরিফায়েড]

- **টেক স্ট্যাক চয়েস**: ব্যবহারকারীর পছন্দ অনুযায়ী সম্পূর্ণ ফ্রন্টএন্ড **TypeScript বাদ দিয়ে পিওর JavaScript ও JSX (`.jsx` / `.js`)**-এ সাজানো হয়েছে।
- **Tailwind CSS v4 & থিমিং**:
  - `@tailwindcss/vite` প্লাগইন ইন্টিগ্রেশন।
  - `DESIGN.md` অনুযায়ী সম্পূর্ণ সেমান্টিক টোকেন (`navy`, `orange`, `orange-text`, `on-orange`, `on-navy`) দিয়ে `theme.css` ও `base.css` তৈরি।
  - গুগল ফন্টস: **Plus Jakarta Sans** (Display) ও **Hind Siliguri** (Bengali Body)।
  - **Zero-Flash Theme**: রেন্ডারিংয়ের পূর্বেই `data-theme` সেট করার স্ক্রিপ্ট (Light / Dark / System)।
- **ট্রি-লিঙ্গুয়াল i18n (Trilingual Engine)**:
  - ডিফল্ট হিসেবে **Mixed (Banglish)** মোড সক্রিয়।
  - এক ক্লিকেই রিলোড ছাড়াই **English (EN)**, **বাংলা (BN)** এবং **Mixed** মোডে রূপান্তর। ⚠️ আংশিক: `App.jsx`, `BottomNav`, `BottomSheet` এর অনেক লেখা এখনো সরাসরি component এ লেখা, `t()` দিয়ে নয়।
- **নেটিভ মোবাইল অ্যাপ-লাইক UI (Native App Feel)**:
  - `BottomNav.jsx`: মোবাইলে স্ক্রিনের নিচে ফিক্সড আধুনিক ৫-ট্যাব বটম নেভিগেশন বার (সেন্টারে বড় অরেঞ্জ প্লাস বাটন)।
  - `BottomSheet.jsx`: নিচ থেকে আসা ড্রয়ার (টিউশন পোস্ট ফর্ম, ল্যাঙ্গুয়েজ সিলেক্টর ও ফিল্টারের জন্য)। ⚠️ `animate-in`/`slide-in` class এর plugin নেই বলে animation চলে না; Esc এ বন্ধ হয় না।
  - `Header.jsx`: স্লিম মোবাইল অ্যাপ-বার, কুইক ল্যাঙ্গুয়েজ চিপ ও থিম টগল।
  - এরিয়া চিপস: আঙুল দিয়ে ডানে-বামে স্মুথভাবে সোয়াইপ করার মতো হরিজোন্টাল স্ন্যাপ স্ক্রোলিং।
  - `TutorCard.jsx`: WCAG AA কনট্রাস্ট মানদণ্ড মেনে ভেরিফায়েড ব্যাজ, রেটিং ও প্রাইস ট্যাগসহ টিউটর কার্ড।
- **লাইভ স্ট্যাটাস**: প্রোডাকশন বিল্ড (`vite build`) ৩–৪ সেকেন্ডে সম্পন্ন; মোবাইল (375x750) ও ডেস্কটপ ভিউপোর্টে দেখা হয়েছে।
- **জানা UI সমস্যা (DESIGN.md এর বিরুদ্ধে)**: Dark mode এ টিউটর ব্যানার ও Footer এর সাদা লেখা হালকা navy এর উপর পড়া যায় না (1.5:1, `text-on-navy` লাগবে); কয়েক জায়গায় `text-white`/`gray-*`, লেখায় `text-orange`; icon বাটনে `aria-label` নেই; stats (150+, 98.5%) placeholder সংখ্যা — আসল data না আসা পর্যন্ত সরাতে হবে।

---

## ৪. ব্যাকএন্ড ফাউন্ডেশন (Django 5.1 + DRF Scaffolding) — [লোকালি চালু]

- **আর্কিটেকচার স্কেলিং**:
  - `backend/manage.py`: এন্ট্রি পয়েন্ট স্ক্রিপ্ট।
  - `config/settings/base.py`: Django 5.1, DRF, SimpleJWT, CORS, django-filters এবং OpenAPI/Swagger (`drf-spectacular`) কনফিগ।
  - `config/settings/development.py`: লোকাল ডেভলপমেন্টের জন্য PostgreSQL অথবা স্বয়ংক্রিয় SQLite ফলব্যাক সুবিধা।
  - `config/urls.py`, `wsgi.py`, `asgi.py`: এপিআই রাউটিং ও হেলথ চেক এন্ডপয়েন্ট (`/api/v1/health/`)।
- **কনটেইনারাইজেশন ও ডিপেন্ডেন্সিজ**:
  - `backend/requirements.txt`: ব্যাকএন্ডের সকল ডিপেন্ডেন্সিজ তালিকাভুক্ত।
  - `backend/Dockerfile` ও `.dockerignore` তৈরি।
  - `apps/accounts`: Custom User model (Architecture Doc 3.1) — UUID PK, phone/email (অন্তত একটা বাধ্যতামূলক, DB constraint), role, `preferred_language` (default `mixed`), admin ও প্রথম migration।
  - বাকি app (`lookups`, `tutors`, ...) তৈরি হলে তবেই `LOCAL_APPS` এ যোগ হবে।
- **স্ট্যাটাস**: `development.py` এর SyntaxError ও না-থাকা app এর ImportError ঠিক করা হয়েছে; `.env` এখন load হয়। যাচাই: `manage.py check` পরিষ্কার, SQLite এ `migrate` চলে, `/api/v1/health/` ও `/api/schema/` 200। ⚠️ PostgreSQL (Docker) এ এখনো চালানো হয়নি।

---

## ৫. গিট কমিট হিস্ট্রি (Commit Log)

| Commit Hash | Commit Message | বিবরণ |
| :--- | :--- | :--- |
| `087e26f` | `chore: initial monorepo configuration` | রুট কনফিগ, ডকার ও আর্কিটেকচার ডকুমেন্টস |
| `20c5493` | `feat(frontend): initialize React + Tailwind v4` | ফ্রন্টএন্ড সেটআপ ও ডিজাইন সিস্টেম |
| `dddee1a` | `refactor(frontend): switch from TS to pure JSX` | টাইপস্ক্রিপ্ট সরিয়ে পিওর JSX-এ রূপান্তর |
| `fd1713f` | `feat(mobile): add native app-like bottom navigation` | বটম বার, বটম শিট ও মোবাইল টাচ লেআউট |
| `948b443` | `feat(backend): initialize Django 5.1 boilerplate` | ব্যাকএন্ড আর্কিটেকচার, সেটিংস ও ডকারফাইল |
| `33557d4` | `docs: update DESIGN.md, Architecture Doc, add root README...` | ডকুমেন্ট হালনাগাদ, root README |
| `a960719` | `chore(backend): streamline settings and env loading` | SyntaxError ঠিক, `.env` load, `LOCAL_APPS` ছাঁটাই |
| `da66ecd` | `chore: track dockerignores, clean frontend deps, and add accounts scaffold` | `.dockerignore` ট্র্যাক, Windows-only dependency বাদ, User model |

---

## ⏳ Sprint 0 এর বাকি কাজ (Sprint 1 শুরুর আগে / প্রথম দিনে)

- [x] `docker compose up --build` end-to-end চালিয়ে দেখা (PostgreSQL + Redis + backend + frontend)
- [x] `docker-compose.yml` এ `env_file: .env` ব্যবহার; `.env.example` এর সাথে মেলানো
- [x] CI: `.github/workflows/backend.yml` (ruff, `makemigrations --check`, pytest) ও `frontend.yml` (oxlint, vitest, `vite build`)
- [x] `CODEOWNERS`, `pull_request_template.md`, `.pre-commit-config.yaml`; `main` এ branch protection
- [x] Test setup: pytest + pytest-django + `config/settings/test.py`; Vitest + React Testing Library
- [x] `production.py`, Redis `CACHES`, CORS শুধু `localhost:5173`
- [x] Health check এ DB ও Redis যাচাই (Architecture Doc 12.6)
- [x] Frontend: React Router, `src/api/client.js` (Axios + JWT refresh), `/dev/ui`, 404 page; `typescript` ও Vite টেমপ্লেটের ফাইল বাদ (`@types/*` editor autocomplete এর জন্য রাখা)
- [ ] উপরের "জানা UI সমস্যা" ঠিক করা
- [ ] Sprint Plan এ SMS স্থগিতের সিদ্ধান্ত লেখা (Sprint 5 এখনো SMS ধরে আছে)

---

## 🎯 পরবর্তী লক্ষ্য: Sprint 1 (সপ্তাহ ১)
1. **Backend Environment Setup**: ভার্চুয়াল এনভায়রনমেন্ট (`.venv`) তৈরি ও `requirements.txt` প্যাকেজ ইনস্টল করা।
2. **Auth backend**: User model তৈরি আছে; phone অথবা email দিয়ে লগইনের auth backend (Guardian/Tutor/Admin)।
3. **JWT API**: Register, Login, Refresh, Logout, এবং `/auth/me/` + ১০টা test।
4. **Lookup Seed Data**: সিলেটের ১৪টি এলাকা, ১২টি বিষয়, শ্রেণি স্তর এবং বিশ্ববিদ্যালয়ের ডেটাবেজ সিড কমান্ড (`seed_data`)।
5. **Auth Screens**: ফ্রন্টএন্ডে লগইন ও রেজিস্ট্রেশন ইন্টারফেস।
