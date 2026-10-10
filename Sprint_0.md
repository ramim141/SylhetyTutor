# 🚀 SylhetyTutor — Sprint 0 Summary & Status

**তারিখ**: ১০ অক্টোবর, ২০২৬  
**ফেজ**: Sprint 0 (Groundwork & Foundation Setup)  
**স্ট্যাটাস**: 🟡 Foundation প্রস্তুত (Frontend লাইভ ও ভেরিফায়েড, Backend কাঠামো তৈরি — DB ও সার্ভার রান Sprint 1-এ হবে)  
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
  - সমস্ত কোড গিটহাবে সফলভাবে পুশ ও ট্র্যাক করা হয়েছে।
- **রুট কনফিগারেশন ফাইলস**:
  - `.gitignore`: পাইথন ভার্চুয়াল এনভায়রনমেন্ট, ডকার, মিডিয়া ও নোড মডিউল প্রটেক্টেড।
  - `.env.example`: ব্যাকএন্ড ও ফ্রন্টএন্ডের জন্য এনভায়রনমেন্ট ভেরিয়েবল টেমপ্লেট।
  - `docker-compose.yml`: PostgreSQL 16, Redis 7, Django Backend এবং React Frontend-এর মাল্টি-কনটেইনার অর্কেস্ট্রেশন।
- **ডকার সেটআপ গাইড**: উইন্ডোজের জন্য WSL 2 ভিত্তিক Docker Desktop ইনস্টলেশন গাইডলাইন প্রস্তুত।

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
  - এক ক্লিকেই রিলোড ছাড়াই **English (EN)**, **বাংলা (BN)** এবং **Mixed** মোডে সম্পূর্ণ টেক্সট রূপান্তরের সুবিধা।
- **নেটিভ মোবাইল অ্যাপ-লাইক UI (Native App Feel)**:
  - `BottomNav.jsx`: মোবাইলে স্ক্রিনের নিচে ফিক্সড আধুনিক ৫-ট্যাব বটম নেভিগেশন বার (সেন্টারে বড় অরেঞ্জ প্লাস বাটন)।
  - `BottomSheet.jsx`: নিচ থেকে স্মুথভাবে স্লাইড হয়ে আসা ড্রয়ার (টিউশন পোস্ট ফর্ম, ল্যাঙ্গুয়েজ সিলেক্টর ও ফিল্টারের জন্য)।
  - `Header.jsx`: স্লিম মোবাইল অ্যাপ-বার, কুইক ল্যাঙ্গুয়েজ চিপ ও থিম টগল।
  - এরিয়া চিপস: আঙুল দিয়ে ডানে-বামে স্মুথভাবে সোয়াইপ করার মতো হরিজোন্টাল স্ন্যাপ স্ক্রোলিং।
  - `TutorCard.jsx`: WCAG AA কনট্রাস্ট মানদণ্ড মেনে ভেরিফায়েড ব্যাজ, রেটিং ও প্রাইস ট্যাগসহ টিউটর কার্ড।
- **লাইভ স্ট্যাটাস**: প্রোডাকশন বিল্ড (`vite build`) মাত্র ২.৪ সেকেন্ডে সম্পন্ন এবং ব্রাউজার সাব-এজেন্ট দ্বারা মোবাইল (375x750) ও ডেস্কটপ ভিউপোর্টে সফলভাবে ভেরিফায়েড।

---

## ৪. ব্যাকএন্ড ফাউন্ডেশন (Django 5.1 + DRF Scaffolding) — [কাঠামো প্রস্তুত]

- **আর্কিটেকচার স্কেলিং**:
  - `backend/manage.py`: এন্ট্রি পয়েন্ট স্ক্রিপ্ট।
  - `config/settings/base.py`: Django 5.1, DRF, SimpleJWT, CORS, django-filters এবং OpenAPI/Swagger (`drf-spectacular`) কনফিগ।
  - `config/settings/development.py`: লোকাল ডেভলপমেন্টের জন্য PostgreSQL অথবা স্বয়ংক্রিয় SQLite ফলব্যাক সুবিধা।
  - `config/urls.py`, `wsgi.py`, `asgi.py`: এপিআই রাউটিং ও হেলথ চেক এন্ডপয়েন্ট (`/api/v1/health/`)।
- **কনটেইনারাইজেশন ও ডিপেন্ডেন্সিজ**:
  - `backend/requirements.txt`: ব্যাকএন্ডের সকল ডিপেন্ডেন্সিজ তালিকাভুক্ত।
  - `backend/Dockerfile` ও `.dockerignore` তৈরি।
  - `apps/` ফোল্ডার স্ট্রাকচার প্রস্তুত।
- **স্ট্যাটাস**: ব্যাকএন্ডের মূল ফাইল ও সেটিংস কাঠামো রেডি করা হয়েছে। তবে পাইথন প্যাকেজ ইনস্টলেশন, মাইগ্রেশন এবং ডাটাবেজ কানেকশন এখনও রান করা হয়নি—যা Sprint 1-এর প্রাথমিক কাজ হিসেবে সম্পন্ন করা হবে।

---

## ৫. গিট কমিট হিস্ট্রি (Commit Log)

| Commit Hash | Commit Message | বিবরণ |
| :--- | :--- | :--- |
| `087e26f` | `chore: initial monorepo configuration` | রুট কনফিগ, ডকার ও আর্কিটেকচার ডকুমেন্টস |
| `20c5493` | `feat(frontend): initialize React + Tailwind v4` | ফ্রন্টএন্ড সেটআপ ও ডিজাইন সিস্টেম |
| `dddee1a` | `refactor(frontend): switch from TS to pure JSX` | টাইপস্ক্রিপ্ট সরিয়ে পিওর JSX-এ রূপান্তর |
| `fd1713f` | `feat(mobile): add native app-like bottom navigation` | বটম বার, বটম শিট ও মোবাইল টাচ লেআউট |
| `948b443` | `feat(backend): initialize Django 5.1 boilerplate` | ব্যাকএন্ড আর্কিটেকচার, সেটিংস ও ডকারফাইল |

---

## 🎯 পরবর্তী লক্ষ্য: Sprint 1 (সপ্তাহ ১)
1. **Backend Environment Setup**: ভার্চুয়াল এনভায়রনমেন্ট তৈরি ও `requirements.txt` প্যাকেজ ইনস্টল করা।
2. **Custom User Model**: ফোন ও ইমেইল অথেনটিকেশন (Guardian/Tutor/Admin)।
3. **Database Migrations & JWT API**: Register, Login, Refresh, Logout, এবং `/auth/me/`।
4. **Lookup Seed Data**: সিলেটের ১৪টি এলাকা, ১২টি বিষয়, শ্রেণি স্তর এবং বিশ্ববিদ্যালয়ের ডেটাবেজ সিড কমান্ড (`seed_data`)।
5. **Auth Screens**: ফ্রন্টএন্ডে লগইন ও রেজিস্ট্রেশন ইন্টারফেস।
