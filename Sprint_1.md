# 🔐 SylhetyTutor — Sprint 1 Plan (সপ্তাহ ১): Foundation ও Auth

**সময়**: এক সপ্তাহ, শনিবার → বৃহস্পতিবার (শুক্রবার ছুটি)
**টিম**: @ramim141 ও @Mahdi-HasanIO (Dev A = Backend owner, Dev B = Frontend owner — কে কোনটা, শনিবারের planning এ ঠিক করুন)
**সূত্র**: Sprint Plan (Sprint 1), Architecture Doc §3.1–3.6, §4.1, §4.9, §5, §15

---

## 🎯 লক্ষ্য

> এক command এ পুরো project চালু, guardian register ও login করতে পারে, তিন ভাষার toggle, CI সবুজ।

**Demo (বৃহস্পতিবার)**: নতুন clone → `docker compose up` → register → dashboard → logout → phone দিয়ে login, তিন ভাষায়।

---

## ✅ Sprint 0 তে আগেই যা হয়ে গেছে

Sprint Plan এর Sprint 1 টেবিলের অর্ধেকের বেশি Sprint 0 তে শেষ — তাই এই সপ্তাহ শুধু **Auth + Lookup** এ মনোযোগ।

| Sprint Plan এর কাজ | অবস্থা |
| --- | --- |
| Docker, Django structure, settings, health endpoint | ✅ (health এ DB + cache check) |
| Vite + React + Tailwind v4, folder, lint/test | ✅ (oxlint, Vitest) |
| Design tokens, font, base component, `/dev/ui` | ✅ |
| `en`/`bn`/`mixed` i18n, Language toggle | ✅ (Header এ আছে) |
| Custom User model | ✅ (`apps/accounts`, migration সহ) |
| API client, refresh logic | ✅ (`src/api/client.js`, ৫টা test) |
| Backend CI, frontend CI | ✅ |
| **Lookup model + Sylhet seed** | ⏳ এই sprint |
| **JWT register/login/refresh/logout/me + ১০টা test** | ⏳ এই sprint |
| **Login/Register page, auth store** | ⏳ এই sprint |
| OpenAPI schema | ✅ চালু; এই sprint এ auth endpoint এর বিবরণ যোগ |
| ~~Schema থেকে type~~ | ❌ বাদ — frontend JSX এ, TypeScript নেই। Contract এর জন্য Swagger (`/api/docs/`) ই reference |

---

## 📝 শনিবারের আগে ঠিক করার সিদ্ধান্ত (API Contract)

শনিবার সকালের planning এ এগুলো চূড়ান্ত করে GitHub Issue তে লিখে রাখুন। নিচে আমার প্রস্তাব।

### ১. Endpoint (সব `/api/v1/` এর নিচে)

| Method | Endpoint | Auth | কাজ |
| --- | --- | --- | --- |
| POST | `/auth/register/` | Public | Guardian বা tutor account তৈরি, সাথে সাথে login (token ফেরত) |
| POST | `/auth/login/` | Public | Phone **অথবা** email + password → JWT pair |
| POST | `/auth/token/refresh/` | Public | নতুন access (ও rotated refresh) token |
| POST | `/auth/logout/` | Auth | Refresh token blacklist |
| GET | `/auth/me/` | Auth | নিজের profile |
| PATCH | `/auth/me/` | Auth | নাম, ভাষা, email বদল |

**এই sprint এ নয়**: `/auth/password/reset/` ও `/confirm/` — email/SMS পাঠানোর ব্যবস্থা লাগবে (SMS স্থগিত)। Sprint 4–5 এ email দিয়ে। আপাতত admin হাতে password বদলাবে।

### ২. Request / Response এর আকার

**User object** (সব response এ একই):

```json
{
  "id": "4f1c…uuid",
  "full_name": "Rahim Uddin",
  "phone": "01712345678",
  "email": "rahim@example.com",
  "role": "guardian",
  "preferred_language": "mixed",
  "avatar": null,
  "date_joined": "2026-10-17T10:00:00+06:00"
}
```

**Register** — `POST /auth/register/`

```json
// request
{ "full_name": "Rahim Uddin", "phone": "01712345678", "email": "", "password": "…", "role": "guardian", "preferred_language": "mixed" }
// 201
{ "user": { …User… }, "access": "…", "refresh": "…" }
```

**Login** — `POST /auth/login/`

```json
// request — identifier এ phone বা email যেকোনোটা
{ "identifier": "01712345678", "password": "…" }
// 200
{ "user": { …User… }, "access": "…", "refresh": "…" }
// 401
{ "detail": "Phone/email or password is incorrect.", "code": "invalid_credentials" }
```

**Logout** — `POST /auth/logout/` body `{ "refresh": "…" }` → `204`

**Error এর এক রকম আকার** (custom exception handler — সব endpoint এ):

```json
{
  "detail": "Invalid input.",
  "code": "invalid",
  "fields": {
    "phone": [{ "code": "unique", "message": "A user with this phone already exists." }],
    "password": [{ "code": "password_too_short", "message": "…" }]
  }
}
```

**কেন `code`**: frontend `code` দেখে তিন ভাষায় নিজের লেখা দেখাবে (`t("error.phone.unique")`)। Backend এর ইংরেজি `message` শুধু fallback।

### ৩. নিয়ম (দুজনকেই জানতে হবে)

| বিষয় | সিদ্ধান্ত |
| --- | --- |
| Phone format | বাংলাদেশি mobile: `01[3-9]XXXXXXXX` (১১ সংখ্যা)। `+8801…`, `8801…`, মাঝে space/`-` থাকলেও backend নিজে `01…` এ বদলে save করবে |
| Email | পুরোটা lowercase এ save ও খোঁজা (Postgres এ `Rahim@x.com` ও `rahim@x.com` আলাদা ধরা পড়ে, SQLite এ নয় — তাই আগেই ঠিক করা) |
| Phone বা email | অন্তত একটা বাধ্যতামূলক (model এ আগেই আছে) |
| Role | Register এ শুধু `guardian` বা `tutor`। `admin` কখনো API দিয়ে নয় (`createsuperuser`) |
| Tutor register | এই sprint এ শুধু user তৈরি; profile এর ৬ ধাপ Sprint 3 এ |
| Password | Django এর ৪টা validator (৮+ অক্ষর, সাধারণ password নয়, শুধু সংখ্যা নয়, নামের মতো নয়) |
| Phone বদল | `PATCH /auth/me/` এ phone ও role বদলানো যাবে না (পরে OTP দিয়ে) |
| Login ব্যর্থ | ভুল phone ও ভুল password এ **একই** বার্তা — কোন phone এ account আছে বোঝা যাবে না |
| Rate limit | Login: প্রতি **account** (phone/email) এ মিনিটে ৫ বার, সাথে IP প্রতি মিনিটে ৬০ বার; register: IP প্রতি ঘণ্টায় ৩০ বার (DRF throttle, cache এ)। IP তে ৫ নয়, কারণ মোবাইল operator এ অনেক user এক IP (CGNAT) |
| Token | Access ৩০ মিনিট, refresh ৭ দিন, rotate + blacklist (settings এ আগেই আছে)। Token এ `role` claim |
| Token storage (frontend) | এখন `localStorage` (`src/api/tokens.js`); Sprint 8 এ refresh token httpOnly cookie তে |

---

## 🛠️ Dev A — Backend

### কাজের তালিকা

| # | কাজ | ফাইল | Branch / Issue |
| --- | --- | --- | --- |
| A1 | `apps/lookups`: `Area`, `Subject`, `ClassLevel`, `University` model (UUID PK, `name_en`, `name_bn`, `slug` unique, `sort_order`, `is_active`), admin | `apps/lookups/models.py`, `admin.py` | `feat/lookups-models` |
| A2 | `seed_data` command — বারবার চালালেও duplicate নয় (`update_or_create` by slug) | `apps/lookups/management/commands/seed_data.py` | একই branch |
| A3 | Phone normalize + validate, email lowercase (model `clean()` + manager) | `apps/accounts/validators.py` | `feat/auth-api` |
| A4 | Phone অথবা email দিয়ে login এর auth backend | `apps/accounts/backends.py`, `AUTHENTICATION_BACKENDS` | একই |
| A5 | Register, Login, Me (GET/PATCH) serializer + view | `serializers.py`, `views.py`, `urls.py` | একই |
| A6 | Refresh (simplejwt view, `role` claim সহ) ও Logout (blacklist) | একই | একই |
| A7 | Custom exception handler (উপরের error আকার) | `config/exceptions.py` | একই |
| A8 | Throttle: `login`, `register` scope | `base.py` | একই |
| A9 | Permission class: `IsGuardian`, `IsTutor`, `IsAdmin`, `IsOwnerOrAdmin` (`IsApprovedTutor` Sprint 3 এ) | `apps/accounts/permissions.py` | একই |
| A10 | OpenAPI: auth endpoint এ tag, example, error response (`@extend_schema`) | views | একই |
| A11 | Test (নিচে) | `apps/accounts/tests/`, `apps/lookups/tests/` | একই |

### Seed data (A2) — ⚠️ business track এর কেউ বানান ও এলাকা যাচাই করবেন

**Subject (১২)** — Architecture Doc §3.4:

| slug | name_en | name_bn |
| --- | --- | --- |
| math | Math | গণিত |
| higher-math | Higher Math | উচ্চতর গণিত |
| physics | Physics | পদার্থবিজ্ঞান |
| chemistry | Chemistry | রসায়ন |
| biology | Biology | জীববিজ্ঞান |
| english | English | ইংরেজি |
| bangla | Bangla | বাংলা |
| ict | ICT | তথ্য ও যোগাযোগ প্রযুক্তি |
| accounting | Accounting | হিসাববিজ্ঞান |
| business-studies | Business Studies | ব্যবসায় শিক্ষা |
| general-science | General Science | সাধারণ বিজ্ঞান |
| ielts | IELTS | আইইএলটিএস |

**Class level (৫)** — Home page এর form এর সাথে মিল রেখে:

| sort | slug | name_en | name_bn |
| --- | --- | --- | --- |
| 1 | class-1-5 | Class 1–5 | ১ম–৫ম শ্রেণি |
| 2 | class-6-8 | Class 6–8 | ৬ষ্ঠ–৮ম শ্রেণি |
| 3 | ssc | SSC (Class 9–10) | এসএসসি (৯ম–১০ম) |
| 4 | hsc | HSC (Class 11–12) | এইচএসসি (১১শ–১২শ) |
| 5 | english-medium | English Medium | ইংলিশ মিডিয়াম |

**Area (১৪)** — সিলেট সিটি:

| slug | name_en | name_bn |
| --- | --- | --- |
| amberkhana | Amberkhana | আম্বরখানা |
| zindabazar | Zindabazar | জিন্দাবাজার |
| akhalia | Akhalia | আখালিয়া |
| shibganj | Shibganj | শিবগঞ্জ |
| subidbazar | Subidbazar | সুবিদবাজার |
| uposhohor | Uposhohor | উপশহর |
| tilagarh | Tilagarh | টিলাগড় |
| pathantula | Pathantula | পাঠানটুলা |
| lamabazar | Lamabazar | লামাবাজার |
| modina-market | Modina Market | মদিনা মার্কেট |
| bondor-bazar | Bondor Bazar | বন্দরবাজার |
| kumarpara | Kumarpara | কুমারপাড়া |
| mirabazar | Mirabazar | মীরাবাজার |
| chowhatta | Chowhatta | চৌহাট্টা |

**University (৩)** — §3.3: SUST (শাহজালাল বিজ্ঞান ও প্রযুক্তি বিশ্ববিদ্যালয়), Metropolitan University, Leading University। MC College সহ অন্য কলেজ লাগবে কিনা — শনিবার ঠিক করুন (campus ambassador তালিকায় MC College আছে)।

### Test (কমপক্ষে ১০টা auth + seed)

1. Phone দিয়ে guardian register → 201, token ফেরত, password hash করা
2. Email দিয়ে register (phone ছাড়া) → 201
3. Phone ও email দুটোই ছাড়া → 400, `fields` এ error
4. একই phone দুইবার (`+8801712…` ও `01712…` একই ধরা) → 400 `unique`
5. `role: "admin"` দিয়ে register → 400
6. দুর্বল password → 400
7. Phone দিয়ে login → 200; email দিয়ে login (বড় হাতের অক্ষরসহ) → 200
8. ভুল password ও অজানা phone → একই 401 বার্তা
9. Refresh → নতুন access; logout এর পর পুরোনো refresh → 401
10. `GET /auth/me/` token ছাড়া → 401, token সহ → নিজের data; `PATCH` এ `role`/`phone` বদলায় না
11. একই account এ ৬ষ্ঠ ভুল চেষ্টা → 429 (`retry_after` সহ); একই IP র অন্য user আটকায় না
12. `seed_data` দুইবার চালালে সংখ্যা একই (১২ / ৫ / ১৪ / ৩)

---

## 🎨 Dev B — Frontend

### কাজের তালিকা

| # | কাজ | ফাইল | Branch |
| --- | --- | --- | --- |
| B1 | **আগের UI সমস্যা ঠিক** (DoD এর জন্য দরকার): Banner/Footer এ `text-white`/`gray-*` → `on-navy` token, লেখায় `text-orange` → `orange-text`, icon বাটনে `aria-label`, BottomSheet এ Esc | `Home.jsx`, `BottomNav.jsx`, `BottomSheet.jsx`, `Header.jsx` | `fix/design-tokens` |
| B2 | Form component: `Input` (label, helper, error + icon, `aria-invalid`, `aria-describedby`, 16px font), `PasswordInput` (দেখাও/লুকাও), `Alert` — DESIGN.md §6.2, §6.5; `/dev/ui` তে যোগ | `src/components/ui/` | `feat/form-components` |
| B3 | `api/auth.js`: `register`, `login`, `logout`, `me`, `updateMe` | `src/api/auth.js` | `feat/auth-ui` |
| B4 | `authStore` (Zustand): `user`, `status` (`idle`/`loading`/`authenticated`/`guest`), `login`, `register`, `logout`, `loadUser`; `SESSION_EXPIRED_EVENT` শুনে logout; login এর পর user এর `preferred_language` এ ভাষা বদল | `src/store/authStore.js` | একই |
| B5 | `/login` page: phone/email + password, error message তিন ভাষায় (`code` → `t()`), "account নেই? Register" | `src/pages/Login.jsx` | একই |
| B6 | `/register` page: guardian / tutor বাছাই, নাম, phone, email (ঐচ্ছিক), password; phone এ `inputmode="tel"`, placeholder `01XXXXXXXXX` | `src/pages/Register.jsx` | একই |
| B7 | `ProtectedRoute` + `/dashboard` (আপাতত সাদামাটা: নাম, role, logout) | `src/components/auth/`, `src/pages/Dashboard.jsx` | একই |
| B8 | Header ও BottomNav: login থাকলে নাম + logout, না থাকলে Sign In → `/login` | `Header.jsx`, `BottomNav.jsx` | একই |
| B9 | Test (নিচে) | `*.test.jsx` | একই |

**Form library**: Architecture Doc এ `React Hook Form` আছে — `npm i react-hook-form`। Validation এর নিয়ম backend এর সাথে মিল (phone regex, password ৮+)।

**Backend তৈরি না হওয়া পর্যন্ত**: `src/api/auth.js` এর ফাংশনগুলো test এ fake adapter দিয়ে (`client.test.js` এর মতো)। Dev A সোমবার register/login merge করলে মঙ্গলবার থেকে আসল backend এ জোড়া।

### i18n key (তিন ভাষাতেই, `i18n.test.jsx` না মিললে fail করবে)

`auth.login.title`, `auth.register.title`, `auth.identifier.label`, `auth.password.label`, `auth.role.guardian`, `auth.role.tutor`, `auth.submit.login`, `auth.submit.register`, `auth.logout`, `auth.noAccount`, `auth.haveAccount`, `error.invalid_credentials`, `error.phone.unique`, `error.phone.invalid`, `error.email.unique`, `error.password.weak`, `error.throttled`, `error.network`, `dashboard.welcome`

### Test (কমপক্ষে ৬টা)

1. Login form: খালি submit এ error, ভুল phone format এ error
2. Login সফল → token save, `/dashboard` এ যায়
3. 401 `invalid_credentials` → তিন ভাষার যেকোনোটায় সঠিক বার্তা
4. Register এ backend এর `fields.phone[unique]` → phone field এর নিচে বার্তা
5. `ProtectedRoute`: login ছাড়া `/dashboard` → `/login`
6. Session expired event → store logout, `/login`

---

## 📅 দিন-ভিত্তিক পরিকল্পনা

| দিন | Dev A (Backend) | Dev B (Frontend) | দুজন |
| --- | --- | --- | --- |
| **শনিবার** | A1 lookup model + admin | B1 UI সমস্যা ঠিক | সকালে planning (৫০–৬০ মিনিট): উপরের contract চূড়ান্ত, Issue তৈরি, কে Dev A/B |
| **রবিবার** | A2 seed + test; A3 phone/email normalize | B2 Input/PasswordInput/Alert + `/dev/ui` | Lookup PR review ও merge |
| **সোমবার** | A4–A5 auth backend, register, login, me | B3–B4 `api/auth.js`, `authStore` (fake adapter এ test) | — |
| **মঙ্গলবার** | A6–A9 refresh, logout, exception handler, throttle, permission | B5–B6 Login, Register page — আসল backend এ | Dev A এর register/login PR merge |
| **বুধবার** | A10–A11 OpenAPI, test পূর্ণ করা; **backend merge এর শেষ দিন** | B7–B8 ProtectedRoute, Dashboard, Header | — |
| **বৃহস্পতিবার** | Bug fix | B9 test, তিন ভাষা, 360px, dark mode | জোড়া + demo checklist + ছোট retro |

**প্রতিদিন**: WhatsApp এ তিন লাইন — গতকাল, আজ, কোথায় আটকে।

---

## ✔️ Demo Checklist (বৃহস্পতিবার বিকেল)

- [ ] নতুন folder এ `git clone` → `docker compose up` → সব container চালু, health `200`
- [ ] `docker compose exec backend python manage.py seed_data` → admin এ ১৪ area, ১২ subject, ৫ class, ৩ university
- [ ] `/register` এ guardian, phone `+880 1712-345678` দিয়ে → `/dashboard`, admin এ phone `01712345678`
- [ ] Logout → `/dashboard` খুললে `/login` এ ফেরত
- [ ] `01712345678` দিয়ে login → dashboard; email দিয়ে login (বড় হাতের অক্ষরে) → dashboard
- [ ] ভুল password → তিন ভাষাতেই ঠিক বার্তা
- [ ] একই account এ ৬ বার ভুল login → "অনেকবার চেষ্টা" বার্তা
- [ ] EN / বাং / Mixed বদলে login ও register page এ সব লেখা বদলায়, layout ভাঙে না
- [ ] 360px ফোনে ও desktop এ; light ও dark দুই theme
- [ ] Access token মেয়াদ শেষ হলে (test এর জন্য `ACCESS_TOKEN_LIFETIME=1`) নিজে refresh, user টের পায় না
- [ ] দুটো PR এই CI সবুজ, অন্যজনের approval সহ merge

---

## 📋 Definition of Done (প্রতিটা PR)

- [ ] Backend test pass (permission test সহ); frontend test pass; CI সবুজ
- [ ] অন্যজনের review ও approval, `main` এ squash merge
- [ ] তিন ভাষায় সব লেখা
- [ ] 360px ও desktop; light ও dark (DESIGN.md)
- [ ] Migration থাকলে commit করা; seed দরকার হলে `seed_data` এ যোগ

---

## 💼 Business Track (code এর পাশাপাশি)

- [ ] Campus ambassador ঠিক — SUST, MC College, Leading, Metropolitan
- [ ] Tutor waitlist form (Google Form), Founding Tutor offer এর লেখা
- [ ] Trade license যাচাই
- [ ] **bKash / SSLCommerz merchant apply** — সবচেয়ে সময় লাগে; এখন না করলে Sprint 6 এ শুধু manual payment
- [ ] Seed data এর এলাকা ও বাংলা বানান যাচাই (উপরের তালিকা)
- [ ] কে business track দেখবেন ঠিক করা — developer হলে তার coding সময় কম ধরা

**লক্ষ্য**: Launch Stage 0 শুরু।

---

## ⚠️ ঝুঁকি

| ঝুঁকি | কী করবেন |
| --- | --- |
| Phone এর নানা format (`+880`, space, `-`) | Backend এ এক জায়গায় normalize (A3), frontend শুধু সহজ check |
| SQLite এ পাস, Postgres এ fail (email বড়-ছোট হাতের অক্ষর) | Email lowercase নিয়ম; CI তে Postgres আছে — CI সবুজ না হলে merge নয় |
| Dev B backend এর জন্য আটকে | Contract শনিবারেই চূড়ান্ত; fake adapter এ কাজ শুরু |
| Scope বাড়া (password reset, OTP, Google login) | Backlog এ; এই sprint এ নয় |

---

## 🧹 শুরুর আগে Git

```bash
git switch main
git pull
git branch -D feat/sprint1-auth        # পুরোনো main থেকে বানানো, আর লাগবে না
git switch -c feat/lookups-models      # Dev A এর প্রথম কাজ
```
