# ✅ SylhetyTutor — Sprint 4 (সপ্তাহ ৪): Verification ও Requirement

**সময়**: এক সপ্তাহ, শনিবার → বৃহস্পতিবার (শুক্রবার ছুটি)
**টিম**: @ramim141, @Mahdi-HasanIO (Dev A = Backend, Dev B = Frontend — শনিবারের planning এ ঠিক করুন)
**সূত্র**: Sprint Plan (Sprint 4), Architecture Doc §3.11–3.13, §4.3–4.4, §4.8, §5, §7.2–7.3, §8.8; আগের contract `Sprint_1.md`–`Sprint_3.md`
**অবস্থা**: ⬜ শুরু হয়নি — এটা পরিকল্পনা ও contract। বাস্তবায়ন শেষে `PROJECT_STATUS.md` হালনাগাদ করতে হবে।

---

## 🎯 লক্ষ্য

> Admin tutor verify করলে তবেই সে search এ আসে; guardian requirement post করে; আর মিলে যাওয়া **approved** tutor সেটা দেখতে পায় — **guardian এর কোনো যোগাযোগের তথ্য ছাড়া**।

**Demo (বৃহস্পতিবার)**

1. Tutor profile জমা দেয় → admin এর queue তে আসে → admin NID/Student ID দেখে **approve** → tutor `/tutors` search এ দেখা যায়, tutor এ in-app বার্তা পায়।
2. আরেকজনকে **reject** (কারণ সহ) → tutor কারণ দেখে, ঠিক করে আবার জমা দেয় → আবার queue তে আসে।
3. Guardian ৪ ধাপে requirement দেয় → publish → মিলে যাওয়া approved tutor এর "আপনার জন্য tuition" এ আসে।
4. ব্রাউজারের network tab এ ওই response এ **phone, email, নাম, ঠিকানা কিছুই নেই**।

---

## 🔙 শুরুর আগে যা দরকার (Prerequisite)

| শর্ত | কেন |
| --- | --- |
| Sprint 1–3 এর PR `main` এ merge (এখন সব এক branch এ জমে আছে) | Sprint 4 `TutorProfile`, document upload, `submit` এর উপর দাঁড়ানো; আলাদা PR এ ভাগ করে CI (Postgres 16) সবুজ করে নিতে হবে |
| **NID/Student ID আপলোডের দুজনের security review** (Sprint Plan এ বাধ্যতামূলক) | Admin এই sprint থেকে আসল document দেখবে; review ছাড়া আসল NID নেওয়া শুরু নয় |
| Postgres এ matching query যাচাই | `distinct()` ও `annotate` SQLite ও Postgres এ আলাদা আচরণ করতে পারে; CI সবুজ না হলে merge নয় |

---

## 🧱 এখন যা আছে (Sprint 3 এর পর) — নতুন করে বানাবেন না

- `TutorProfile`: `draft → pending → approved / rejected`; `submitted_at`, `rejection_reason`, `verified_at`, `verified_by`, `slug` (approve এ তৈরি), `missing_fields()`; approved profile অসম্পূর্ণ হতে পারে না (`clean()`)।
- `POST /tutors/me/submit/`: `draft` বা `rejected` থেকে `pending`; `pending` এ 409।
- Document: `PrivateMediaRoot`, `GET /tutors/documents/{profile_id}/{kind}/` — মালিক ও admin ছাড়া সবার 404; `IsAuthenticated` + JWT।
- Permission: `IsGuardian`, `IsTutor`, `IsAdmin` (role=admin **অথবা** `is_staff`), `IsOwnerOrAdmin`। **`IsApprovedTutor` নেই — এই sprint এ যোগ হবে।**
- Admin এখন শুধু Django admin এ approve/reject করতে পারে; কেউ কোনো বার্তা পায় না।
- `User.area` (register এর সময় নেওয়া home area) আছে; `GuardianProfile`, `Requirement` নেই।

---

## 🧩 নতুন app ও migration

| App | কী | Migration |
| --- | --- | --- |
| `apps/guardians` (নতুন) | `GuardianProfile`, `Requirement` | `0001_initial`, `0002_backfill_guardian_profiles` (`RunPython`: আগের সব guardian user এর profile বানায়) |
| `apps/notifications` (নতুন) | `Notification` | `0001_initial` |
| `apps/tutors` | `TutorVerificationEvent` (audit log), `verification.py` (approve/reject service) | `000N_verification_event` |

`config/settings/base.py` এর `LOCAL_APPS` এ `apps.guardians`, `apps.notifications` যোগ। নতুন setting: `FRONTEND_URL` (email এর লিঙ্কের জন্য, `.env.example` এও), `MAX_OPEN_REQUIREMENTS = 3`, `MAX_DRAFT_REQUIREMENTS = 5`, `REQUIREMENT_LIFETIME_DAYS = 30`।

---

## 🧠 সিদ্ধান্ত ও যুক্তি (শনিবার planning এ চূড়ান্ত করুন)

### ১. Verification — এক জায়গায় logic, দুই জায়গা থেকে ব্যবহার

Approve/reject এর **সব নিয়ম একটাই service** এ (`apps/tutors/verification.py`): `approve(profile, admin)` ও `reject(profile, admin, reason)`। React admin API **এবং** Django admin এর "Approve/Reject selected" action দুটোই এটাকেই ডাকে। কেন: নিয়ম দুই জায়গায় লিখলে একটা আরেকটার সাথে আলাদা হয়ে যায় (যেমন Django admin দিয়ে approve করলে event বা notification বাদ পড়ে)।

```
approve(profile, admin):
  transaction.atomic + select_for_update(profile)
  ১. profile.user == admin হলে → 403 self_approval        (নিজের profile নিজে approve নয়)
  ২. status != pending      → 409 not_pending            (অন্য admin আগেই করেছেন / double click)
  ৩. missing_fields() (REQUIRED) ফাঁকা নয় → 409 incomplete_profile {fields}
  ৪. status=approved, verified_at=now, verified_by=admin, rejection_reason=""
     slug তৈরি হয় save() এ (আগে থেকেই আছে, কখনো বদলায় না)
  ৫. TutorVerificationEvent(action=approved) লেখা
  ৬. on_commit: Notification(kind=tutor_approved) + email (থাকলে)

reject(profile, admin, reason):
  একই ১–২ শর্ত; reason ১০–৫০০ অক্ষর (strip করে) নাহলে 400 reason
  status=rejected, rejection_reason=reason, verified_at=None
  event(action=rejected, reason) + Notification(kind=tutor_rejected, data={reason}) + email
```

- **Reject এর পর tutor**: profile আবার editable (Sprint 3 এ আগে থেকেই `rejected` এ editable); ঠিক করে `submit` করলে `pending` হয় ও `rejection_reason` মুছে যায় (আগের কোড তাই করে)। কারণটা `TutorVerificationEvent` এ থেকে যায়।
- **কেন `verified_at=None` রিজেক্টে**: পুরোনো approve এর তারিখ থাকলে ভুল বোঝায়।
- **Approved হওয়ার পর admin "revoke" (approved → rejected)** এই sprint এ নেই (Sprint 7 এর report/suspend এর সাথে); এখন Django admin এ হাতে করা যাবে।
- **দুজন admin একসাথে**: প্রথমজন সফল, দ্বিতীয়জন 409 `not_pending` পায়; UI "অন্য একজন admin এটা আগেই করেছেন" দেখিয়ে queue নতুন করে আনে।

### ২. Audit — কে কখন কী করল

`TutorVerificationEvent`: `profile` (FK, CASCADE), `actor` (FK User, SET_NULL), `action` (`submitted` / `approved` / `rejected` / `document_viewed`), `reason` (text), `meta` (JSON, যেমন `{"kind":"nid"}`), `created_at`। কখনো edit/delete করা যায় না (admin এ read-only)। কেন: NID এর মতো সংবেদনশীল তথ্যে "কে দেখেছে" প্রশ্ন আসবেই। `document_viewed` লেখা হয় admin যখন `DocumentDownloadView` দিয়ে অন্যের document পড়ে (মালিক নিজে পড়লে লেখা হয় না)। `submitted` event `tutors/me/submit/` এ যোগ হয়।

### ৩. Notification — বার্তার ভাষা ও চ্যানেল

- **Server বাক্য লেখে না, শুধু `kind` ও `data` রাখে**; ভাষা অনুযায়ী লেখা frontend এর i18n (`notification.tutor_approved.title` …)। কারণ: তিন ভাষার নিয়ম, আর user ভাষা বদলালে পুরোনো বার্তাও নতুন ভাষায় দেখায়।
- **In-app সবসময়**; **email শুধু তখনই** যখন user এর email আছে (অনেকে শুধু phone দিয়ে register করে — তাদের জন্য SMS স্থগিত, তাই এখন in-app ছাড়া উপায় নেই; এটা জানা সীমাবদ্ধতা)।
- Email `transaction.on_commit` এ, `try/except` এ লগ করে — email ব্যর্থ হলে approve/reject **আটকাবে না**। Celery আসবে Sprint 5 এ; তখন এটা background এ যাবে। Email এর লেখা `apps/notifications/emails.py` এ en/bn/mixed তিন সংস্করণ (user এর `preferred_language` অনুযায়ী), সাথে `FRONTEND_URL/dashboard` এর লিঙ্ক। Dev এ console backend, test এ locmem।
- এই sprint এ bell icon নেই (Sprint 5); dashboard এ "বার্তা" তালিকা ও না-পড়া সংখ্যা।

### ৪. Requirement এর অবস্থা ও জীবনচক্র

Sprint Plan অনুযায়ী `draft / open / closed` (Architecture Doc এ `matched` ও `progress_step` আছে — সেগুলো Sprint 5 এ `Match`/apply এর সাথে আসবে, এখন নয়; Sprint 5 এ migration এ `matched` যোগ হবে)।

```
draft ──publish──▶ open ──close──▶ closed
  │                 │ (৩০ দিন পর "মেয়াদ শেষ" = derived, status বদলায় না)
  └─ DELETE (শুধু draft)             └─ publish আবার → published_at নতুন (পুনরায় চালু)
```

- **Draft**: যেকোনো অংশ ফাঁকা থাকতে পারে (ধাপে ধাপে save, মাঝপথ থেকে resume — Sprint 3 এর tutor form এর মতো)। **Publish** এ সব বাধ্যতামূলক ঘর যাচাই: `class_level`, `area`, ≥১ `subjects`, `budget_min`, `budget_max` (`min ≤ max`)। `title` ফাঁকা থাকলে নিজে তৈরি: "শ্রেণি · বিষয় · এলাকা"।
- **সীমা (spam ঠেকাতে)**: প্রতি guardian এ সর্বোচ্চ ৩টা `open` (publish এ 409 `open_limit`), ৫টা `draft` (create এ 409 `draft_limit`); create এ throttle ১০/ঘণ্টা।
- **মেয়াদ**: `published_at` + ৩০ দিন পর matching এ আর আসে না। কোনো background job লাগে না — query তে `published_at >= now - 30d`। Guardian এর তালিকায় "মেয়াদ শেষ" দেখায় ও "আবার চালু করুন" (publish আবার) দেয়।
- **Close**: `POST …/close/` `{reason}` — `found_tutor` / `no_longer_needed` / `other`। কারণটা রেখে দেওয়া হয় (Business track এর "আসল বেতনের data" ও কেন requirement বন্ধ হলো, তার তথ্য এখান থেকেই আসবে)।
- **Edit**: `draft` ও `open` এ চলে; `closed` এ 409। `open` অবস্থায় বদলালে tutor রা নতুন মান দেখে।
- **Delete**: শুধু `draft` (সত্যিকারের মোছা); `open` মুছতে চাইলে 409 `use_close`।

### ৫. Matching এর নিয়ম (সবচেয়ে সংবেদনশীল অংশ)

Approved tutor এর জন্য requirement তখনই আসে যখন **সব** শর্ত মেলে:

| শর্ত | নিয়ম |
| --- | --- |
| অবস্থা | `status = open` ও মেয়াদ শেষ হয়নি |
| এলাকা | requirement এর `area` ∈ tutor এর `areas` |
| বিষয় | requirement এর `subjects` ও tutor এর `subjects` এ **অন্তত একটা মিল** |
| শ্রেণি | requirement এর `class_level` ∈ tutor এর `class_levels` |
| লিঙ্গ পছন্দ | `preferred_gender` = `any`, অথবা tutor এর `gender` এর সমান |

যা **ফিল্টার নয়, শুধু চিহ্ন**: `budget_fits` (tutor এর `fee_min–fee_max` ও requirement এর বাজেট **ওভারল্যাপ করে কিনা**) — না মিললেও দেখায়, কারণ দর-কষাকষি স্বাভাবিক; tutor নিজে সিদ্ধান্ত নেবে। সাজানো: নতুন আগে (`published_at` কমতি ক্রমে)।

- Sprint Plan এ শুধু "বিষয় ও এলাকা" বলা; আমরা শ্রেণি ও লিঙ্গ যোগ করেছি, কারণ tutor profile এ এগুলো আগেই নেওয়া হয় আর guardian এর স্পষ্ট পছন্দ অগ্রাহ্য করা ঠিক নয়। পরে (Sprint 13, smart matching) নিয়ম শিথিল/স্কোর করা যাবে।
- Query: `Exists`/subquery দিয়ে, `distinct()` এর উপর ভরসা নয় (Postgres এ `DISTINCT` + `ORDER BY` ঝামেলা)। `select_related(class_level, area)` + `prefetch_related(subjects)` — N+1 নেই (test এ query সংখ্যা ধরা)।
- শুধু **approved** tutor; `draft/pending/rejected` পেলে 403 `tutor_not_approved` (frontend এ "যাচাই শেষ হলে দেখতে পাবেন")।

### ৬. গোপনীয়তা (commission model, Architecture Doc §8.8)

**Tutor এর দিকের response এ guardian এর কিছুই নেই**: নাম, phone, email, ঠিকানা, user id, guardian id — কিছু না। আছে শুধু requirement এর নিজের তথ্য (শ্রেণি, বিষয়, এলাকা-নাম, বাজেট, সময়, লিঙ্গ পছন্দ, তারিখ)। Allow-list serializer (সাধারণ `ModelSerializer` এর `fields="__all__"` কখনো নয়), আর test এ পুরো JSON এর ভেতরে কোনো phone/email-এর মতো লেখা নেই বলে যাচাই।

**ফাঁস ঠেকাতে মুক্ত লেখায় যোগাযোগ নিষেধ**: `title` ও `schedule_note` এ guardian "ফোন করুন 017…" লিখে commission এড়িয়ে যেতে পারে। তাই লেখায় এগুলো পেলে 400, `code = contact_not_allowed`:
- বাংলাদেশি মোবাইল নম্বর (`01[3-9]` + ৮ সংখ্যা), **বাংলা সংখ্যা (০–৯) ইংরেজিতে বদলে**, মাঝে স্পেস/`-`/`.` সরিয়ে, `+880`/`880` সহ;
- email (`@` সহ), লিঙ্ক (`http`, `www.`, `wa.me`, `t.me`)।

**সীমাবদ্ধতা**: "শূন্য এক সাত…" এর মতো শব্দে লেখা নম্বর এটা ধরে না; এটা Sprint 7 এর report/suspend দিয়ে সামলানো হবে। `schedule_note` ও `title` এর দৈর্ঘ্য: ২০০ ও ৩০০ অক্ষর।

### ৭. Admin দের কাছে guardian এর তথ্য

Admin `GET /requirements/` এ সব requirement দেখে, **guardian এর নাম ও phone সহ** (Architecture Doc §7.3: admin "guardian details" দেখে)। এই sprint এ এটা শুধু Django admin এ (list + filter + close action); React admin এ requirement তালিকা নেই (পরের sprint)।

---

## 📝 API Contract (সব `/api/v1/` এর নিচে)

সাধারণ নিয়ম: error সবসময় `{detail, code, fields?, retry_after?}`; 401 token ছাড়া, 403 ভুল role এ। প্রতিটা view এ `@extend_schema` (tag: `admin`, `guardians`, `requirements`, `notifications`)।

### Admin — verification (`IsAdmin`)

| Method | Endpoint | কাজ |
| --- | --- | --- |
| GET | `/admin/approvals/?status=pending\|approved\|rejected&page=` | তালিকা (ডিফল্ট `pending`); **পুরোনো আগে** (`submitted_at` বাড়তি ক্রমে) — যে আগে জমা দিয়েছে সে আগে |
| GET | `/admin/approvals/{profile_id}/` | বিস্তারিত |
| POST | `/admin/approvals/{profile_id}/approve/` | approve |
| POST | `/admin/approvals/{profile_id}/reject/` | reject, body `{ "reason": "…" }` |

`GET /admin/approvals/` response:

```json
{
  "count": 7, "next": null, "previous": null,
  "counts": { "pending": 7, "approved": 26, "rejected": 2 },
  "results": [{
    "id": "uuid", "full_name": "Rahim Uddin", "university": "SUST", "department": "CSE",
    "status": "pending", "submitted_at": "2026-10-17T10:00:00+06:00", "fee_min": 4000, "fee_max": 6000,
    "areas": ["amberkhana"], "has_all_documents": true
  }]
}
```

`GET /admin/approvals/{id}/` (admin এ phone/email দেখানো ঠিক — verification এর কাজ):

```json
{
  "id": "uuid", "status": "pending", "submitted_at": "…", "rejection_reason": "",
  "user": { "full_name": "…", "phone": "01712345678", "email": null },
  "profile": { "gender": "male", "university": {…}, "department": "CSE", "year": "3rd Year",
               "student_id_number": "…", "bio": "…", "fee_min": 4000, "fee_max": 6000,
               "subjects": [], "class_levels": [], "areas": [], "availability": [] },
  "documents": [
    { "kind": "nid", "url": "/api/v1/tutors/documents/<id>/nid/" },
    { "kind": "student_id", "url": "/api/v1/tutors/documents/<id>/student_id/" }
  ],
  "missing_fields": [], "can_approve": true,
  "history": [{ "action": "submitted", "actor": "Rahim Uddin", "reason": "", "at": "…" }]
}
```

Error: `not_pending` (409), `incomplete_profile` (409, `fields:[…]`), `self_approval` (403), `reason` (400: `required` / `too_short` / `too_long`)।

### Guardian ও Requirement

| Method | Endpoint | Auth | কাজ |
| --- | --- | --- | --- |
| GET | `/guardians/me/` | guardian | নিজের profile + সংখ্যা: `{ open, draft, closed }` |
| POST | `/requirements/` | guardian | **draft** তৈরি (যেকোনো অংশ সহ) |
| GET | `/requirements/?status=` | guardian: নিজের · admin: সব | তালিকা (পাতা ২০টা) |
| GET | `/requirements/{id}/` | মালিক / admin | বিস্তারিত |
| PATCH | `/requirements/{id}/` | মালিক | draft/open এ বদল |
| POST | `/requirements/{id}/publish/` | মালিক | draft → open; মেয়াদ-শেষ open এ আবার চালু |
| POST | `/requirements/{id}/close/` | মালিক | open → closed, body `{ "reason": "found_tutor" }` |
| DELETE | `/requirements/{id}/` | মালিক | শুধু draft |
| GET | `/requirements/matching/` | **approved tutor** | মিলে যাওয়া তালিকা (পাতা ২০টা) |
| GET | `/requirements/matching/{id}/` | approved tutor | একটা; না মিললে/বন্ধ হলে 404 (Sprint 5 এ apply এর জন্য) |

Requirement (guardian/admin এর দিক):

```json
{
  "id": "uuid", "title": "Class 9–10 · Physics, Math · Amberkhana", "status": "open",
  "class_level": "ssc", "area": "amberkhana", "subjects": ["physics", "math"],
  "budget_min": 3000, "budget_max": 5000, "preferred_gender": "any",
  "schedule_note": "সন্ধ্যায়, সপ্তাহে ৩ দিন",
  "published_at": "…", "expires_at": "…", "is_expired": false,
  "missing_fields": [], "can_publish": true, "close_reason": ""
}
```

(`class_level`, `area`, `subjects` এ **slug** — lookups এর মতো।) Draft এ `missing_fields` কোনগুলো বাকি, `can_publish` তার উপর নির্ভর।

Matching response (tutor এর দিক) — **allow-list**:

```json
{
  "count": 3, "next": null, "previous": null,
  "results": [{
    "id": "uuid", "title": "…",
    "class_level": { "slug": "ssc", "name_en": "SSC", "name_bn": "এসএসসি" },
    "area": { "slug": "amberkhana", "name_en": "Amberkhana", "name_bn": "আম্বরখানা" },
    "subjects": [{ "slug": "physics", "name_en": "Physics", "name_bn": "পদার্থবিজ্ঞান" }],
    "matched_subjects": ["physics"],
    "budget_min": 3000, "budget_max": 5000, "budget_fits": true,
    "preferred_gender": "any", "schedule_note": "…", "published_at": "…"
  }]
}
```

Error code: `open_limit`, `draft_limit` (409); `contact_not_allowed` (400, `fields.title|schedule_note`); `budget_range` (400, `min ≤ max`); `incomplete` (400 publish এ, `fields:[…]` বাকি ঘর); `closed` (409 edit এ); `use_close` (409); `tutor_not_approved` (403)।

### Notification (`IsAuthenticated`, শুধু নিজেরটা)

| Method | Endpoint | কাজ |
| --- | --- | --- |
| GET | `/notifications/?unread=1&page=` | তালিকা, নতুন আগে |
| GET | `/notifications/unread-count/` | `{ "count": 2 }` (সস্তা query, পরে bell এর জন্য) |
| POST | `/notifications/{id}/read/` | পড়া হয়েছে (অন্যের id তে 404) |
| POST | `/notifications/read-all/` | সব পড়া |

```json
{ "id": "uuid", "kind": "tutor_rejected", "data": { "reason": "NID অস্পষ্ট" }, "read": false, "created_at": "…" }
```

---

## 🗃️ Model

```
GuardianProfile   id(UUID) · user(OneToOne, CASCADE) · phone_verified(bool, false) · created_at/updated_at

Requirement       id(UUID) · guardian(FK GuardianProfile, CASCADE) · title(≤200, blank)
                  class_level(FK, null) · area(FK, null) · subjects(M2M Subject)
                  budget_min/max(PositiveInteger, null) · preferred_gender(any|male|female, default any)
                  schedule_note(≤300, blank) · status(draft|open|closed, default draft)
                  published_at(null) · closed_at(null) · close_reason(found_tutor|no_longer_needed|other, blank)
                  CheckConstraint: budget_min ≤ budget_max (দুটোই থাকলে)
                  Index: (status, area, published_at)

Notification      id(UUID) · user(FK, CASCADE) · kind(tutor_approved|tutor_rejected) · data(JSON, default {})
                  read_at(null) · created_at · Index: (user, read_at, -created_at)

TutorVerificationEvent  id · profile(FK, CASCADE) · actor(FK, SET_NULL) · action · reason · meta(JSON) · created_at
```

`GuardianProfile` তৈরি: `User` এর `post_save` signal (role=guardian, created) — API দিয়ে, `createsuperuser` দিয়ে বা Django admin দিয়ে যেভাবেই user হোক। আগের user দের জন্য `0002` backfill।

---

## 🛠️ Dev A — Backend

| # | কাজ | ফাইল / বিস্তারিত |
| --- | --- | --- |
| A1 | `apps/guardians`, `GuardianProfile`, signal, backfill migration | `models.py`, `signals.py`, `migrations/` |
| A2 | `Requirement` model, constraint, index, lookups এর `is_active` মানা | `models.py` |
| A3 | Requirement serializers: `RequirementSerializer` (মালিক), `MatchingRequirementSerializer` (**allow-list**); লেখায় যোগাযোগ-নিষেধ validator (`validators.py`, বাংলা সংখ্যা সহ) | `serializers.py`, `validators.py` |
| A4 | Requirement view: CRUD + `publish` + `close` + সীমা (`select_for_update` guardian row এ, race ঠেকাতে) + throttle | `views.py`, `urls.py` |
| A5 | `IsApprovedTutor` permission (`role=tutor` **ও** `verification_status=approved`, নাহলে code `tutor_not_approved`) | `accounts/permissions.py` |
| A6 | `GET /requirements/matching/` (+ `{id}/`): নিয়ম §৫, `budget_fits`, N+1 নেই | `views.py`, `matching.py` |
| A7 | `verification.py` service + `TutorVerificationEvent` + `submitted` event `submit` এ | `tutors/verification.py`, `models.py` |
| A8 | Admin approvals API (list/detail/approve/reject) + `document_viewed` event | `tutors/admin_views.py` |
| A9 | Django admin: approve/reject action (service ডেকে), event read-only, Requirement list/filter/close action | `admin.py` |
| A10 | `apps/notifications`: model, API, `notify()` helper, email (`emails.py`, তিন ভাষা), `FRONTEND_URL` | `notifications/` |
| A11 | OpenAPI (`@extend_schema`, error example), `.env.example` এ `FRONTEND_URL`, `seed_demo` এ ১০টা demo requirement ও ২টা pending tutor (শুধু local/staging) | |
| A12 | Test (নিচে) | |

## 🎨 Dev B — Frontend

| # | কাজ | ফাইল / বিস্তারিত |
| --- | --- | --- |
| B1 | `api/requirements.js`, `api/admin.js`, `api/notifications.js` + error code mapping (`api/errors.js` এ নতুন code) | |
| B2 | `RoleRoute` (`roles=["admin"]` ইত্যাদি; ভুল role এ "অনুমতি নেই" পাতা, login এ পাঠানো নয়) | `components/auth/` |
| B3 | **Admin queue** `/admin/verification`: pending/approved/rejected ট্যাব, সংখ্যা, পুরোনো আগে, কার্ড (নাম, university, কত আগে জমা), skeleton/empty/error, ফোনে কার্ড তালিকা | `pages/admin/` |
| B4 | **Admin detail** `/admin/verification/:id`: তথ্য, **document viewer**, checklist, Approve/Reject, history | `pages/admin/` |
| B5 | Dashboard এ guardian অংশ: requirement সংখ্যা, "Requirement দিন" বোতাম, সর্বশেষ ৩টা; tutor অংশে "আপনার জন্য tuition" লিঙ্ক; admin অংশে "যাচাইয়ের অপেক্ষায় N জন" | `Dashboard.jsx` |
| B6 | **Requirement form** `/requirements/new`, `/requirements/:id/edit`: ৪ ধাপ, প্রতি ধাপে draft save, resume | `pages/requirements/` |
| B7 | **আমার requirement** `/requirements`: কার্ড, অবস্থা badge, সম্পাদনা/বন্ধ/মোছা, "মেয়াদ শেষ — আবার চালু" | |
| B8 | **Tutor এর "আপনার জন্য tuition"** `/tutor/requirements`: তালিকা, pending/rejected এ লক বার্তা | |
| B9 | Dashboard এ "বার্তা" তালিকা + না-পড়া সংখ্যা; Home এর "Post" শিট ও BottomNav এর `post` ট্যাব ঠিক করা (guardian → ফর্ম; অন্যরা → বার্তা; guest → login তারপর ফর্ম) | |
| B10 | তিন ভাষার সব নতুন লেখা (`i18n/{en,bn,mixed}.js`) | |
| B11 | Test (নিচে) | |

### Admin: document viewer এর যুক্তি

- ছবি `<img src="/api/…">` দিয়ে দেখানো যাবে না (token header পাঠানো যায় না)। তাই `api.get(url, { responseType: "blob" })` → `URL.createObjectURL` → `<img>`; unmount এ `revokeObjectURL`; লোড/ব্যর্থ অবস্থা আলাদা; ব্যর্থ হলে "আবার চেষ্টা" বোতাম।
- ট্যাপ করলে পুরো পর্দার (zoom) দৃশ্য; উপরে সতর্কবার্তা "সংবেদনশীল তথ্য — শেয়ার/স্ক্রিনশট করবেন না" (তিন ভাষায়)।
- Response এ `Cache-Control: no-store` আছে কিনা **যাচাই করুন** (`document_response`); না থাকলে যোগ করুন।
- **Checklist** (শুধু admin কে মনে করানো, backend এ সংরক্ষণ নয়): "NID এর নাম = প্রোফাইলের নাম", "Student ID এর university = প্রোফাইলের university", "ছবি স্পষ্ট"। তিনটা টিক না দিলে **Approve বোতাম নিষ্ক্রিয়** (ভুল click কমাতে)।

### Approve / Reject এর UX

- **Approve**: নিশ্চিতকরণ modal — "Approve করলে এই profile সবার জন্য search এ দেখা যাবে"। সফল হলে সবুজ বার্তা ও **পরের pending এ নিজে চলে যাওয়া** (queue খালি হলে "সব শেষ")।
- **Reject**: modal এ কারণের **দ্রুত বাছাই** ("NID অস্পষ্ট", "Student ID অস্পষ্ট", "তথ্য মিলছে না", "অন্য কারণ") যা textarea তে লেখা বসায়; `reason` ১০–৫০০ অক্ষর (অক্ষর-গণনা সহ); লেখাটা tutor কে ছাড়া হবে — তাই বিনয়ী বাক্য। কারণের চিপের লেখা frontend এ তিন ভাষায়, backend এ শুধু চূড়ান্ত text।
- **409 `not_pending`**: "অন্য একজন admin আগেই করেছেন" দেখিয়ে queue নতুন করে আনে।
- সব বোতামে loading ও double-click নিষেধ।

### Requirement form (ছোট ধাপ, মোবাইল আগে)

| ধাপ | কী নেওয়া হয় | বিস্তারিত |
| --- | --- | --- |
| ১ | শ্রেণি ও বিষয় | শ্রেণি একটা (বড় বোতাম); বিষয় একাধিক (chip, `lookups` থেকে) |
| ২ | এলাকা ও সময় | এলাকা (নিজের `user.area` আগে থেকে বাছা), সময়ের নোট (≤৩০০, "ফোন নম্বর লিখবেন না" সাহায্য-লেখা), tutor এর লিঙ্গ পছন্দ (যেকোনো/ছেলে/মেয়ে) |
| ৩ | বাজেট | সর্বনিম্ন–সর্বোচ্চ (সংখ্যা, ৫০০ ধাপ); **"গড় বেতন" জাতীয় বানানো পরামর্শ নেই** (আসল data না আসা পর্যন্ত) |
| ৪ | পর্যালোচনা | সব তথ্য, "Publish করুন" (প্রধান বোতাম একটাই), বাকি ঘর থাকলে সেই ধাপের লিঙ্ক |

প্রতি ধাপে "পরের" চাপলে `POST` (প্রথমবার) বা `PATCH`; ফিরে এলে resume। ব্যর্থ হলে ওই ধাপেই error, আগের লেখা হারায় না। Publish এ 409 `open_limit` হলে "আগের একটা requirement বন্ধ করুন" লিঙ্ক সহ বার্তা।

---

## 🔒 নিরাপত্তা ও অনুমতি ছক

| কাজ | Guest | Guardian | Tutor (draft/pending/rejected) | Tutor (approved) | Admin |
| --- | --- | --- | --- | --- | --- |
| Requirement তৈরি/সম্পাদনা/publish/close | 401 | ✅ নিজেরটা | 403 | 403 | ✅ (দেখা ও close; তৈরি নয়) |
| অন্যের requirement | 401 | 404 | 403 | 403 | ✅ দেখা |
| `/requirements/matching/` | 401 | 403 | 403 `tutor_not_approved` | ✅ | 403 |
| `/admin/approvals/*` | 401 | 403 | 403 | 403 | ✅ |
| নিজের approve | — | — | — | — | 403 `self_approval` |
| অন্যের notification | 401 | 404 | 404 | 404 | 404 |

নিয়ম: অন্যের জিনিস চাইলে **404** (আছে কিনা বোঝা যাবে না), ভুল role এ **403**।

---

## 🧪 Test (CLAUDE.md অনুযায়ী প্রতিটা কাজের সাথে)

**Backend**

1. **Verification**: approve সফল (status, `verified_at`, `verified_by`, slug, event, notification, email); pending ছাড়া 409; অসম্পূর্ণ profile এ 409 `incomplete_profile`; নিজের profile 403; reject এ কারণ ছাড়া/১০ এর কম/৫০০ এর বেশি 400; reject এর পর tutor সম্পাদনা ও আবার `submit` চলে; **দুটো একসাথে approve** এ একটাই সফল।
2. **Permission matrix** উপরের ছকের প্রতিটা ঘর (401/403/404 আলাদা করে)।
3. **Notification**: email না থাকলে শুধু in-app; email ব্যর্থ হলেও approve সফল; অন্যের id তে 404; read-all।
4. **GuardianProfile**: register এ নিজে তৈরি; admin দিয়ে বানানো guardian এও; backfill migration পুরোনো user এ।
5. **Requirement**: draft এ ফাঁকা অংশ চলে; publish এ বাকি ঘরে 400 `incomplete`; `min > max` 400; `open_limit` (৪র্থ) ও `draft_limit`; `closed` এ edit 409; open মুছলে 409; মেয়াদ-শেষ আবার চালু; **`title`/`schedule_note` এ যোগাযোগ**: `01712345678`, `০১৭১২-৩৪৫৬৭৮`, `+880 1712 345678`, `a@b.com`, `wa.me/…` — সবগুলোতে 400; "সপ্তাহে ৩ দিন, ৫০০০ টাকা" এ ✅ (সাধারণ সংখ্যা আটকায় না)।
6. **Matching**: area/বিষয়/শ্রেণি/লিঙ্গ প্রতিটার জন্য আলাদা "মেলে না" test; `budget_fits` সত্য/মিথ্যা; draft/closed/মেয়াদ-শেষ আসে না; pending tutor 403; query সংখ্যা সীমিত (`django_assert_max_num_queries`)।
7. **গোপনীয়তা**: matching response এর পুরো JSON string এ guardian এর `full_name`, `phone`, `email`, `guardian`, `user` কিছুই নেই।
8. **Document**: admin দেখলে `document_viewed` event; মালিক দেখলে নয়; অন্যের 404।
9. Postgres এ (CI) matching ও approvals এর তালিকা।

**Frontend**

1. `RoleRoute`: ভুল role এ "অনুমতি নেই", guest এ login।
2. Admin queue: তালিকা, ট্যাব বদল, empty/error/retry।
3. Admin detail: checklist ছাড়া Approve নিষ্ক্রিয়; approve → পরেরটায় যায়; reject modal এ ছোট কারণে error; 409 এ বার্তা ও queue reload; blob URL `revoke` হয়।
4. Requirement form: ধাপে save, resume, `contact_not_allowed` error ঠিক ঘরে, `open_limit` বার্তা।
5. আমার requirement: অবস্থা badge, close/delete/আবার চালু।
6. Tutor তালিকা: approved এ কার্ড, pending এ লক বার্তা।
7. Notification: তিন ভাষায় লেখা, না-পড়া সংখ্যা, পড়লে কমে।
8. তিন ভাষায় সব key (বিদ্যমান i18n test)।

**ব্রাউজারে (আসল backend)**: admin queue → approve/reject, requirement ৪ ধাপ ও tutor তালিকা, 360px ও desktop, light ও dark। Network tab এ guardian এর তথ্য নেই — **নিজে দেখে** লিখুন, না দেখলে "যাচাই হয়নি" লিখুন।

---

## 📅 দিন-ভিত্তিক পরিকল্পনা

| দিন | Dev A (Backend) | Dev B (Frontend) | দুজন |
| --- | --- | --- | --- |
| **শনিবার** | A1 `GuardianProfile` + signal + backfill; A2 `Requirement` model | B1 API ফাইল (mock), B2 `RoleRoute` | সকালে planning (৫০–৬০ মিনিট): উপরের সিদ্ধান্ত §১–৭ ও contract চূড়ান্ত, Issue তৈরি, **Sprint 1–3 PR ও security review এর অবস্থা** |
| **রবিবার** | A3 serializer ও validator, A4 requirement CRUD/publish/close | B6 requirement form (mock) | Guardian PR review |
| **সোমবার** | A5 `IsApprovedTutor`, A6 matching; A7 verification service | B7 আমার requirement, B5 dashboard guardian অংশ | — |
| **মঙ্গলবার** | A8 admin API, A9 Django admin action, A10 notification | B3–B4 admin queue ও detail (আসল API তে) | Verification PR merge |
| **বুধবার** | A11 OpenAPI ও seed, A12 test পূর্ণ; **backend merge এর শেষ দিন** | B8 tutor তালিকা, B9 বার্তা ও Post ট্যাব, B10 তিন ভাষা | — |
| **বৃহস্পতিবার** | Bug fix, Postgres CI | B11 test, 360px, dark mode, ব্রাউজারে যাচাই | জোড়া + demo checklist + retro |

> সময় কম পড়লে (Sprint Plan এর পরামর্শ): **React admin পরে**, আগে Django admin এর approve/reject action (A9) দিয়ে চালানো — একই `verification.py` service, তাই পরে React এ কোনো নিয়ম আবার লিখতে হবে না। তখন বাদ: B3–B4।

---

## ✔️ Demo Checklist (বৃহস্পতিবার বিকেল)

- [ ] নতুন clone → `docker compose up` → `seed_data` → `seed_demo` → pending ২ জন admin এর queue তে
- [ ] Admin: queue পুরোনো আগে; NID ও Student ID দেখা যায় (ফোনেও); checklist ছাড়া Approve বন্ধ
- [ ] Approve → tutor `/tutors` এ আসে, slug কাজ করে, tutor dashboard এ "অনুমোদিত" বার্তা
- [ ] Reject (কারণ সহ) → tutor কারণ দেখে, ঠিক করে আবার জমা দেয়, queue তে ফেরে
- [ ] একই profile দুই admin এ খুলে দ্বিতীয়জনের approve → "আগেই করা হয়েছে"
- [ ] Guardian: ৪ ধাপ, মাঝপথে বন্ধ করে আবার খুললে সেখান থেকে; `০১৭…` লিখলে error
- [ ] ৪র্থ open requirement এ "সীমা" বার্তা; বন্ধ করলে আবার দেওয়া যায়
- [ ] Approved tutor এর "আপনার জন্য tuition" এ মিলে যাওয়া requirement; pending tutor এ লক বার্তা
- [ ] **Network tab এ matching response এ guardian এর কিছুই নেই**
- [ ] তিন ভাষা; 360px ও desktop; light ও dark
- [ ] সব PR এ CI সবুজ (Postgres সহ), অন্যজনের approval সহ merge

---

## 📋 Definition of Done (প্রতিটা PR)

- [ ] Backend test (permission সহ) ও frontend test পাস; CI সবুজ
- [ ] অন্যজনের review ও approval, `main` এ squash merge
- [ ] তিন ভাষায় সব লেখা; 360px ও desktop; light ও dark (DESIGN.md)
- [ ] Migration commit করা; seed দরকার হলে `seed_demo` এ
- [ ] **`PROJECT_STATUS.md` একই commit এ হালনাগাদ** (sprint ছক, endpoint, জানা সমস্যা, test সংখ্যা)
- [ ] যা যাচাই হয়নি (Postgres, আসল email পাঠানো, ব্রাউজার) তা স্পষ্ট লেখা

---

## 🚫 এই sprint এ নয়

| কী | কোথায় |
| --- | --- |
| Tutor এর **Apply**, guardian এর shortlist, `Match`, demo booking, `matched` অবস্থা, `progress_step` | Sprint 5 |
| SMS, OTP দিয়ে `phone_verified`, notification bell/push, Celery দিয়ে background email | Sprint 5 |
| Approved profile "revoke"/suspend, report বাটন, অভিযোগ queue | Sprint 7 |
| React এ admin এর requirement তালিকা ও manual match | পরে (এখন Django admin) |
| Password reset (email) | Sprint 4–5 এর মাঝে আলাদা ছোট কাজ; এই sprint এ `notify()`/email ভিত্তি তৈরি হওয়ায় সহজ হবে |
| Requirement এর মেয়াদ নিজে বন্ধ করার background job | Celery আসার পর; এখন lazy (query তে) |
| বেতনের গড়/পরামর্শ দেখানো | আসল data জমার পর (Business track) |

---

## ⚠️ ঝুঁকি

| ঝুঁকি | কী করবেন |
| --- | --- |
| আসল NID নেওয়া শুরু অথচ security review বাকি | Review ছাড়া real tutor এর NID নয়; আগে demo data দিয়ে চালান |
| Matching এ guardian এর তথ্য ভুলে ঢুকে যাওয়া | Allow-list serializer + পুরো JSON এর test (§৬); PR এ দুজনেই এই ফাইল দেখবেন |
| Postgres এ matching ধীর/ভুল | `Exists` subquery, index `(status, area, published_at)`, CI Postgres এ test |
| Admin ভুল করে approve | checklist + confirm modal + event log; revoke Django admin এ হাতে |
| Email যায় না (SMTP নেই) | approve আটকায় না; in-app সবসময়; production SMTP Sprint 8 এ |
| Phone-only tutor রা কোনো email পায় না | in-app বার্তা + dashboard; SMS চালু হলে যোগ হবে (জানা সীমা) |
| Scope বাড়া ("apply ও এখনই দিই") | Sprint 5 এ; MVP list এর বাইরে কিছু ঢুকবে না |
