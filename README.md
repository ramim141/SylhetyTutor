# SylhetyTutor

[![React](https://img.shields.io/badge/React-19-blue.svg)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38bdf8.svg)](https://tailwindcss.com/)
[![Django](https://img.shields.io/badge/Django-5.1-092e20.svg)](https://www.djangoproject.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791.svg)](https://www.postgresql.org/)

**SylhetyTutor** is a modern tutoring platform connecting verified university student tutors in Sylhet, Bangladesh (SUST, Metropolitan University, Leading University, etc.) with guardians seeking trusted home tutors for their children.

---

## 🛠️ Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 19, Vite 6, JavaScript (JSX), Tailwind CSS v4, Zustand, Axios, Lucide Icons |
| **Backend** | Python 3.12+, Django 5.1, Django REST Framework, SimpleJWT, django-filters, drf-spectacular |
| **Database & Cache** | PostgreSQL 16, Redis 7 |
| **Infra & DevOps** | Docker, Docker Compose, Nginx (prod) |

---

## 🚀 Quick Start (নতুন Clone থেকে রান করার নিয়ম)

### পদ্ধতি ১: Docker Compose দিয়ে রান করা (Recommended)

১. রিপোজিটরি ক্লোন করুন ও প্রজেক্ট ফোল্ডারে ঢুকুন:
```bash
git clone https://github.com/ramim141/SylhetyTutor.git
cd SylhetyTutor
```

২. এনভায়রনমেন্ট ভ্যারিয়েবল সেট করুন:
```bash
cp .env.example .env
```

৩. ডকার কনটেইনার বিল্ড ও রান করুন:
```bash
docker compose up --build
```

সার্ভার চালু হলে ব্রাউজারে দেখুন:
- 🌐 **Frontend**: [http://localhost:5173/](http://localhost:5173/)
- ⚙️ **Backend Health**: [http://localhost:8000/api/v1/health/](http://localhost:8000/api/v1/health/)
- 📖 **API Swagger Docs**: [http://localhost:8000/api/docs/](http://localhost:8000/api/docs/)

---

### পদ্ধতি ২: ডকার ছাড়া লোকালি রান করা (Local Development)

#### ১. ফ্রন্টএন্ড রান করা:
```bash
cd frontend
npm install
npm run dev
```
ফ্রন্টএন্ড চালু হবে: `http://localhost:5173/`

#### ২. ব্যাকএন্ড রান করা:
```bash
cd backend
python -m venv venv

# Windows-এ:
venv\Scripts\activate

# Mac/Linux-এ:
# source venv/bin/activate

pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```
ব্যাকএন্ড চালু হবে: `http://localhost:8000/`

---

## 📂 Project Structure (Monorepo)

```
SylhetyTutor/
├── backend/                      # Django 5.1 + DRF REST API
│   ├── config/                   # Settings (base, development, production), URLs, WSGI
│   ├── apps/                     # Django domain apps (accounts, tutors, lookups, etc.)
│   ├── requirements.txt          # Python dependencies
│   ├── manage.py
│   └── Dockerfile
├── frontend/                     # React 19 + JSX + Vite + Tailwind v4
│   ├── src/
│   │   ├── components/           # UI, TutorCard, BottomNav, BottomSheet, Header
│   │   ├── i18n/                 # Trilingual engine (English, বাংলা, Mixed)
│   │   ├── store/                # Zustand stores (theme, language, auth)
│   │   └── styles/               # theme.css (@theme tokens), base.css
│   ├── package.json
│   ├── vite.config.js
│   └── Dockerfile
├── docker-compose.yml            # Local multi-container orchestration
├── .env.example                  # Environment variables template
├── DESIGN.md                     # Design system, colors, typography, UI patterns
├── SylhetyTutor — System Architecture Document.md  # Comprehensive system spec
├── SylhetyTutor Sprint Plan.md   # 8-week sprint roadmap
└── Sprint_0.md                   # Sprint 0 groundwork summary
```

---

## 📖 Key Documentation

* [DESIGN.md](file:///d:/SylhetyTutor/DESIGN.md) — কালার প্যালেট, টাইপোগ্রাফি, WCAG AA অ্যাক্সেসিবিলিটি এবং রিইউজেবল কম্পোনেন্ট গাইড।
* [SylhetyTutor — System Architecture Document.md](file:///d:/SylhetyTutor/SylhetyTutor%20%E2%80%94%20System%20Architecture%20Document.md) — ডাটাবেজ স্কিমা, এপিআই এন্ডপয়েন্ট এবং বিজনেস মডেল।
* [SylhetyTutor Sprint Plan.md](file:///d:/SylhetyTutor/SylhetyTutor%20Sprint%20Plan.md) — ৮ সপ্তাহের স্প্রিন্ট রোডম্যাপ।
* [Sprint_0.md](file:///d:/SylhetyTutor/Sprint_0.md) — স্প্রিন্ট ০-এর কাজের স্থিতি ও অগ্রগতি।

---

## 👥 Authors
* Developed by **Webnify IT Solution**, Sylhet, Bangladesh.
