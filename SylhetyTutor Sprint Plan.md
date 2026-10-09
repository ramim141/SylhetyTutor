# SylhetyTutor Sprint Plan

Oct 10, 2026 · @RAMIM

MVP ৮টা এক-সপ্তাহের sprint এ, সাথে ২ সপ্তাহ buffer — মোট ৮–১০ সপ্তাহে soft launch। প্রতিটা sprint শেষে staging এ একটা চালু feature থাকবে, আর development এর পাশাপাশি tutor জোগাড় ও হাতে matching চলবে।

## Sprint কিভাবে চলবে

প্রতিটা sprint এক সপ্তাহ, শনিবার থেকে বৃহস্পতিবার (শুক্রবার ছুটি)। কাজ হয় feature ধরে: আগে দুজনে API contract, তারপর backend ও frontend একসাথে, সপ্তাহ শেষে জোড়া (Architecture Doc Section 15)।

| কখন | কী | কতক্ষণ |
| --- | --- | --- |
| শনিবার সকাল | Sprint planning: গত sprint এর demo, এই sprint এর Issue বাছাই, প্রতিটা feature এর API contract | ৫০–৬০ মিনিট |
| প্রতিদিন | WhatsApp এ তিন লাইন: গতকাল, আজ, কোথায় আটকে আছি | ৫ মিনিট |
| বুধবার | Backend endpoint merge হওয়ার শেষ দিন (পরের দিন জোড়া) | — |
| বৃহস্পতিবার | জোড়া + bug fix, বিকেলে staging এ দুজন মিলে demo checklist, ছোট retro (কী ভালো, কী বদলাবো) | ২০–৩০ মিনিট |

**Definition of Done** (প্রতিটা feature এর জন্য, সব sprint এ):

- [ ] Backend test pass, permission test সহ; frontend typecheck ও test pass; CI সবুজ
- [ ] অন্যজন PR review করেছে, `main` এ merge, staging এ চলছে
- [ ] তিন ভাষায় (EN / বাং / Mixed) সব লেখা
- [ ] 360px ফোনে ও desktop এ ঠিক; light ও dark দুই theme (DESIGN.md)
- [ ] Migration থাকলে staging এ চালানো হয়েছে; seed data দরকার হলে `seed_demo` এ যোগ

**কাজ শেষ না হলে**: অর্ধেক feature merge নয়। Issue টা পরের sprint এ যাবে, আর পরের sprint এর কম জরুরি কাজ বাদ পড়বে (শেষ section এর "কী বাদ দেওয়া যাবে")। পরপর দুই sprint একই ভাবে পিছিয়ে গেলে পুরো plan আবার দেখা।

**Sprint size**: একজনের সপ্তাহে আনুমানিক ২৫–৩০ ঘণ্টা আসল কোডিং ধরে plan; বাকি সময় review, meeting ও অপ্রত্যাশিত কাজের জন্য। দুজনের কেউ part-time হলে প্রতিটা sprint দুই সপ্তাহের ধরুন; ক্রম একই থাকবে।

## At a Glance

&#91;embedded content: MVP timeline · ৫ ধাপ, ১০ sprint, ৪টা gate\]

Product আর business দুই track একসাথে চলে; প্রতিটা ◆ পার হলে তবেই পরের ধাপ। Soft launch এর gate অর্থাৎ ৫০+ verified tutor সবচেয়ে জরুরি — code তৈরি হলেও tutor না থাকলে launch পিছাবে।

## Sprint 1 — Foundation (সপ্তাহ ১)

**লক্ষ্য**: এক command এ পুরো project চালু, guardian register ও login করতে পারে, তিন ভাষার toggle, CI সবুজ।

দিন-ভিত্তিক বিস্তারিত কাজ আছে Architecture Doc এর "Week 1 Plan" tab এ: Untitled

| Feature | Dev A (Backend) | Dev B (Frontend) |
| --- | --- | --- |
| Setup | Docker, Django structure, settings, health endpoint | Vite + React + Tailwind v4, folder, lint/test |
| Data ভিত্তি | Custom User model, lookup model (Area, Subject, ClassLevel, University) + Sylhet seed | Design tokens (`theme.css`), font, base component, `/dev/ui` |
| তিন ভাষা | — | `en`/`bn`/`mixed` i18n, `LanguageToggle` |
| Auth | JWT register/login/refresh/logout/me + ১০টা test | API client, refresh logic, Login/Register page |
| Contract ও CI | OpenAPI schema, backend CI | Schema থেকে type, frontend CI |

**Demo**: নতুন clone → `docker compose up` → register → dashboard → logout → phone দিয়ে login, তিন ভাষায়।

## Sprint 2 — Tutor Search (সপ্তাহ ২)

**লক্ষ্য**: Guardian এলাকা, বিষয়, class দিয়ে verified tutor খুঁজে পায় — platform এর সবচেয়ে বেশি ব্যবহৃত page।

| Feature | Dev A (Backend) | Dev B (Frontend) |
| --- | --- | --- |
| Tutor data | `TutorProfile` (3.2), subject/class/area/availability এর সম্পর্ক (3.7–3.10), admin এ দেখা | — |
| Lookup API | `GET /api/v1/lookups/` (এক call এ সব list, Redis cache) | Filter dropdown এর data, `useLookups()` hook |
| Search API | `GET /tutors/` — `TutorFilterSet` (area, subject, class, gender, salary, university), sort (featured, rating, newest), page 20; শুধু verified; Section 12.1 এর index | Search page (`Search.dc.html`): desktop এ filter sidebar, mobile এ bottom sheet, sort, pagination |
| Card | Card এর জন্য হালকা serializer (phone/ঠিকানা কখনো নয়) | `TutorCard` (DESIGN.md 6.4), skeleton, empty state |
| URL | — | Filter ↔ URL query sync (`/tutors?area=amberkhana&subject=physics`), share করা যায় |
| Demo data | `seed_demo` এ ৩০ জন demo tutor — শুধু local/staging, production এ কখনো নয় | — |

**Demo**: "Amberkhana + Physics + Class 9–10" filter → ঠিক result; link copy করে অন্য tab এ খুললে একই result; ফোনে filter sheet; result না পেলে empty state।

**খেয়াল**: Sprint planning এই filter parameter ও card এর field ঠিক করা (contract); Dev B mock দিয়ে সোমবার থেকে page বানাবে।

## Sprint 3 — Tutor Profile ও Registration (সপ্তাহ ৩)

**লক্ষ্য**: Tutor নিজে ৬ ধাপে profile বানিয়ে NID ও Student ID জমা দিতে পারে; guardian একজন tutor এর পূর্ণ profile দেখতে পারে।

| Feature | Dev A (Backend) | Dev B (Frontend) |
| --- | --- | --- |
| Registration | `PATCH /tutors/me/` — প্রতি ধাপে save (draft), শেষ ধাপে submit → `verification_status = pending` | ৬-step form (`TutorRegistration.dc.html`), progress bar, প্রতি ধাপে save, শেষে review screen |
| Document upload | NID ও Student ID এর জন্য private storage (public URL নয়, শুধু admin দেখতে পারে), file type ও size check (সর্বোচ্চ ৫ MB) | Upload component: preview, progress, ভুল file এ error |
| Photo | Avatar resize (প্রতিটা মাপের একটা কপি), ছবি না থাকলে null | ছবি না থাকলে আদ্যক্ষর avatar |
| Profile page | `GET /tutors/{slug}/` — শুধু public field; slug নাম + subject থেকে (Section 13.2) | Profile page (`TutorProfile.dc.html`): header, subject, area, availability grid, about; review এর জায়গা খালি |
| Tutor dashboard | `GET /tutors/me/` status সহ | Dashboard shell: "আপনার profile যাচাই হচ্ছে" status card |

**Demo**: নতুন tutor register → ৬ ধাপ → মাঝপথে বন্ধ করে আবার খুললে যেখানে ছিল সেখান থেকে শুরু → submit → "pending"; document এর URL অন্য user খুলতে পারে না।

**খেয়াল**: NID ও Student ID সবচেয়ে সংবেদনশীল data। Storage public হলে বড় ক্ষতি, তাই এই অংশের PR এ দুজনেই security দেখবে।

## Sprint 4 — Verification ও Requirement (সপ্তাহ ৪)

**লক্ষ্য**: Admin tutor verify করলে তবেই search এ আসে; guardian requirement post করে, আর মিলে যাওয়া tutor সেটা দেখতে পায় (guardian এর যোগাযোগ ছাড়া)।

| Feature | Dev A (Backend) | Dev B (Frontend) |
| --- | --- | --- |
| Verification | Admin API: pending list, document দেখা, approve / reject (কারণ সহ); status বদলালে email + in-app notification | Admin panel (`Admin.dc.html`): verification queue, document viewer, approve/reject modal |
| Guardian | `GuardianProfile` (3.11), register এর সময় auto তৈরি | Guardian dashboard shell (`GuardianDashboard.dc.html`) |
| Requirement | `Requirement` (3.12) CRUD; status draft/open/closed; subject/class/area/salary/schedule | Post requirement form (`PostRequirement.dc.html`): ছোট ধাপে, mobile এ সহজ; "আমার requirement" list |
| Tutor এর দিক | `GET /requirements/matching/` — tutor এর subject ও area অনুযায়ী; guardian এর phone/ঠিকানা response এ নেই | Tutor dashboard এ "আপনার জন্য tuition" list |

**Demo**: Admin tutor approve → search এ দেখা যায়; reject → tutor কারণ দেখে; guardian requirement post → মিলে যাওয়া tutor এর list এ আসে, browser এর network tab এও phone নেই।

**খেয়াল**: Admin panel শুরুতে সাদামাটা রাখা; নিজেরাই ব্যবহার করবেন। সময় না থাকলে verification queue প্রথমে Django admin এ custom action দিয়ে, React admin পরে।

## Sprint 5 — Apply থেকে Demo (সপ্তাহ ৫)

**লক্ষ্য**: Tutor apply → guardian shortlist → demo class ঠিক → তখনই প্রথম যোগাযোগ খোলে, আর সব platform এ record হয় (commission model এর ভিত্তি)।

| Feature | Dev A (Backend) | Dev B (Frontend) |
| --- | --- | --- |
| Apply | `TutorApplication` (3.14): এক requirement এ একবার, ছোট message সহ | Requirement এ "Apply" + message modal, "আমার application" list |
| Shortlist | Guardian/admin shortlist ও reject API | Guardian dashboard এ applicant list (TutorCard), shortlist বাটন |
| Demo booking | `Match` এ `demo_at` (8.8); booking হলে `ContactUnlock` log | Demo এর দিন-সময় বাছাই form; booking এর পর দুপক্ষকে যোগাযোগ দেখানো |
| Unlock fee switch | `UNLOCK_FEE_ENABLED` setting — এই sprint এ বন্ধ, Sprint 6 এ চালু | Fee থাকলে কী দেখাবে তার জায়গা রাখা |
| Notification | Celery + Redis চালু; SMS gateway (BD provider) + email; `Notification` model | Header এ notification bell ও list |

**Demo**: Tutor apply → guardian shortlist → demo book → দুজনে SMS পায় → এখন tutor guardian এর নম্বর দেখে, আগে নয়; admin এ কে, কার, কখন খুলেছে দেখা যায়।

**খেয়াল**: SMS provider এর account (sender ID অনুমোদন) আগে থেকেই ঠিক করা লাগবে — Business track এ Sprint 3 এর কাজ।

## Sprint 6 — Payment ও Commission (সপ্তাহ ৬)

**লক্ষ্য**: Unlock fee ও commission এর পুরো চক্র কাজ করে (Architecture Doc 8.8) — এই sprint এর পর platform আয় করতে পারে।

| Feature | Dev A (Backend) | Dev B (Frontend) |
| --- | --- | --- |
| Payment | `Payment` model (8.5); bKash manual: tutor TrxID জমা দেয়, admin যাচাই করে; একই TrxID দুইবার চলবে না | Payment page: bKash নম্বর, টাকার পরিমাণ, তিন ভাষায় নির্দেশনা, TrxID form |
| Unlock fee | `UNLOCK_FEE_ENABLED` চালু; payment verify হলে যোগাযোগ খোলে | Demo booking এর মাঝে fee step, "যাচাই হচ্ছে" status |
| Guardian confirmation | Celery beat: demo এর ৭ দিন পর guardian কে SMS, এক ক্লিকের signed link (login ছাড়া); ৩ দিনে উত্তর না এলে admin call list এ | Confirmation page: "Tutor কি পড়ানো শুরু করেছেন?" হ্যাঁ / না, ফোনে এক ট্যাপ |
| Commission | `Commission` model; confirm হলে invoice, ৭ দিনে due, ১৪ দিনে reminder, ২১ দিনে suspend; Founding Tutor মাফ এর flag | Tutor এর "Payment ও Commission" page |
| Admin | Payment verify queue, commission tracker, call list API | Admin page: তিনটা list, এক ক্লিকে verify / mark paid |

**Demo**: পুরো চক্র — fee দিয়ে unlock → admin verify → যোগাযোগ খোলে → (management command দিয়ে ৭ দিন এগিয়ে) guardian SMS → "হ্যাঁ" → commission invoice → tutor pay → admin paid mark।

**খেয়াল**: Commission এর হার এখনো ঠিক হয়নি (Architecture Doc 8.8 এর open question) — সংখ্যা setting এ রাখা, code এ নয়। bKash merchant API পেলে manual verify পরে automatic হবে; সেজন্য payment একটা service class এর পেছনে রাখা।

## Sprint 7 — Reviews, Home, SEO ও Safety (সপ্তাহ ৭)

**লক্ষ্য**: বাইরের মানুষ এসে বিশ্বাস করতে পারে এমন public site — Home, review, আইনি page, Google এ খুঁজে পাওয়ার ভিত্তি, আর অভিযোগ করার ব্যবস্থা।

| Feature | Dev A (Backend) | Dev B (Frontend) |
| --- | --- | --- |
| Review | `Review` (3.15) — শুধু confirmed match এ; tutor এর rating ও count signal দিয়ে update | Review form (guardian), profile এ review list |
| Home | Featured/top tutor API (cache) | Home page (`Home.dc.html`): hero search, কিভাবে কাজ করে, top tutor, বিশ্বাসের অংশ (NID verified) |
| আইনি ও info page | — | About, Terms, Privacy, FAQ — তিন ভাষায় (লেখা Business track থেকে) |
| Safety | Report API, admin এ অভিযোগ queue, এক ক্লিকে suspend; replacement request (11.5) | Profile ও dashboard এ "Report" বাটন + modal; guardian এর safety guideline page |
| SEO | `sitemap.xml`, `robots.txt`, area/subject landing এর data (13.2) | Page অনুযায়ী meta tag, JSON-LD (13.1), `/tutors/area/:slug` page; public page এর prerender |
| Tracking | `acquisition_*` field এ UTM save (13.6) | GTM + GA4 + cookie consent banner (তিন ভাষায়) |

**Demo**: Home থেকে search → profile এ review; Terms/Privacy তিন ভাষায়; report করলে admin এ আসে ও suspend করা যায়; Google এর Rich Results Test এ tutor page pass।

## Sprint 8 — Production ও Soft Launch (সপ্তাহ ৮)

**লক্ষ্য**: আসল domain এ নিরাপদ production; founding tutor ও প্রথম guardian রা আসল ব্যবহার শুরু করে (Launch Stage 2)।

| Feature | Dev A (Backend) | Dev B (Frontend) |
| --- | --- | --- |
| Server | Production server (Section 9), Docker, Nginx, domain, SSL, secret শুধু env এ | Production build, CDN/cache header, Brotli |
| নিরাপত্তা | DEBUG off, HTTPS only, admin URL বদল, rate limit (12.5 এর মূল অংশ), refresh token httpOnly cookie তে | Cookie-based refresh এ বদল, CSP header যাচাই |
| Backup ও monitoring | দৈনিক database backup + একবার restore test, Sentry, UptimeRobot, health check | Sentry (frontend), 404/500 page |
| Performance | `locust` দিয়ে ছোট load test (12.7), slow query ঠিক | প্রথম load < 200KB, Lighthouse mobile ≥ 90, সস্তা Android ফোনে test |
| Data | Production এ শুধু lookup seed (demo tutor নয়) | তিন ভাষার সব লেখা একবার পড়ে দেখা |
| Launch | Founding tutor দের verify, হাতে match করা guardian দের site এ আনা | প্রথম ১০ জন user কে পাশে বসিয়ে ব্যবহার দেখা, অসুবিধা লিখে রাখা |

**Demo**: Architecture Doc এর Pre-Launch Checklist (16.2) এর সব ঘর টিক; production এ একজন আসল tutor ও একজন আসল guardian এর পুরো flow।

**খেয়াল**: Launch এর প্রথম সপ্তাহ বৃহস্পতিবার রাতে বা শুক্রবারে deploy নয় (Section 15.4)। কোনো ads এখনো নয় — ১০০ tutor ও নিয়মিত match এর পর (Launch Stage 3)।

## Sprint 9–10 — Buffer ও Feedback (সপ্তাহ ৯–১০)

**লক্ষ্য**: আগের sprint এর বাকি কাজ শেষ করা, আর soft launch এর আসল user দের অসুবিধা ঠিক করা। সব ঠিকমতো চললে এই দুই সপ্তাহ পরের sprint এর কাজে যাবে।

- প্রথম ২০–৩০টা match এর পর guardian ও tutor এর সবচেয়ে বেশি বলা ৩টা অসুবিধা আগে ঠিক
- GA4 দেখে কোথায় মানুষ ছেড়ে যাচ্ছে (search → profile → requirement)
- bKash merchant অনুমোদন পেলে manual verify থেকে automatic payment এ যাওয়া
- Admin এর হাতের কাজের মধ্যে যেটা সবচেয়ে সময় নেয়, সেটা সহজ করা

## MVP এর পরের Sprint

এখানে তারিখ নয়, **শর্ত** দিয়ে ক্রম ঠিক হবে: আসল user এর চাহিদা ও Launch Stage অনুযায়ী (Architecture Doc 16.0)।

| Sprint | বিষয় | কখন শুরু (শর্ত) | মূল কাজ |
| --- | --- | --- | --- |
| 11–12 | Pro / Premium subscription | ৫০+ confirmed match, tutor রা priority চাইছে | Plan ও checkout (8.1, 8.6), ৭ দিনের trial, Pro badge, commission মাফ automatic, featured boost (8.4), tutor এর সহজ analytics |
| 13 | Smart matching ও automation | Admin এর হাতে matching এ দিনে ২+ ঘণ্টা লাগছে | Match score (10.2), admin কে suggestion, WhatsApp notification, email (11.9) |
| 14 | Paid growth এর প্রস্তুতি | Launch Stage 3: ১০০+ verified tutor | Ads এর landing page `/lp/*` (13.4), Meta Pixel + CAPI (13.5), আরও area page |
| 15 | AI Chatbot Phase A | Core flow স্থির, support এর একই প্রশ্ন বারবার | Rule engine + FAQ + search parser, Gemini free tier fallback (14.5) |
| 16 | AI Chatbot Phase B | Phase A এ 👍 হার ভালো | Requirement draft, tutor tool, human handoff |
| পরে | চাহিদা অনুযায়ী | — | AdSense (Launch Stage 4), Homework Helper (11.3), video intro (11.1), group tuition (10.3), progress report (10.4), mobile app/PWA (11.2), multi-city (11.10) |

প্রতি মাসে একবার এই টেবিলটা আবার সাজানো: যে কাজের শর্ত আগে পূরণ হবে, সেটা আগে।

## Business Track (code এর পাশাপাশি)

Website শেষ হওয়ার অপেক্ষা নয়: tutor জোগাড় ও হাতে matching প্রথম সপ্তাহ থেকেই (Architecture Doc 16.0)। কে এই track দেখবেন তা Sprint 1 এর planning এ ঠিক করুন; দুই developer এর কেউ হলে তার coding সময় কম ধরতে হবে।

| Sprint | Business কাজ | লক্ষ্য / Launch Stage |
| --- | --- | --- |
| 1 | Campus ambassador ঠিক (SUST, MC College, Leading, Metropolitan); tutor waitlist form; Founding Tutor offer; trade license যাচাই; **bKash / SSLCommerz merchant apply** | Stage 0 শুরু |
| 2 | প্রথম ২০ জন tutor বাছাই (বিষয়, মহিলা tutor, এলাকা মিলিয়ে); Sylhet এর tuition Facebook group এর তালিকা; Terms/Privacy draft | ২০ tutor |
| 3 | Google Form + WhatsApp এ হাতে matching শুরু; SMS provider account ও sender ID; domain কেনা | Stage 1 শুরু |
| 4 | প্রথম match গুলো, guardian ও tutor এর feedback, আসল বেতনের data লিখে রাখা | ৩০–৪০ tutor |
| 5 | **Commission এর হার চূড়ান্ত** (Sprint 6 এর আগেই লাগবে); Terms/Privacy চূড়ান্ত (EN + BN); Google Business Profile, Facebook Page | প্রথম ১০+ match |
| 6 | Payment এর নির্দেশনার লেখা (তিন ভাষায়); founding tutor দের commission নিয়ম জানানো | — |
| 7 | FAQ, safety guideline, প্রথম ৩–৪টা blog post (13.2), area page এর লেখা | — |
| 8 | Founding tutor দের site এ register করানো; হাতে match করা guardian দের আমন্ত্রণ; Search Console + GA4 | Stage 2: ৫০+ tutor |
| 9–10 | আসল review সংগ্রহ (বানানো নয়), ১০০ tutor এর দিকে, ads এর budget plan (13.4) | Stage 3 এর প্রস্তুতি |

**সবচেয়ে সময়সাপেক্ষ দুটো কাজ**: merchant account (Sprint 1 এ apply, নাহলে Sprint 6 এ manual payment ই ভরসা) আর SMS sender ID (Sprint 3, নাহলে Sprint 5 এর notification আটকাবে)।

## ঝুঁকি ও কী বাদ দেওয়া যাবে

| ঝুঁকি | প্রভাব | আগে থেকে কী করবেন |
| --- | --- | --- |
| Merchant account দেরিতে | Automatic payment নেই | Manual TrxID verify দিয়েই MVP (Sprint 6 এর design এটাই) |
| SMS sender ID আটকে | Demo ও confirmation message যায় না | অস্থায়ীভাবে email + WhatsApp এ admin হাতে পাঠাবে |
| একজন developer অসুস্থ বা ব্যস্ত | একটা layer থেমে যায় | মাসে একটা feature উল্টোভাবে করা (Architecture Doc 15.1), README ও DESIGN.md হালনাগাদ |
| NID/Student ID file leak | বিশ্বাস শেষ, আইনি ঝুঁকি | Private storage, Sprint 3 এর PR এ দুজনের security review |
| Scope বাড়তে থাকা ("এটাও দিই") | Launch পিছায় | নতুন ইচ্ছা সরাসরি Backlog এ; MVP list (Architecture Doc 16.1) এর বাইরে কিছু sprint এ ঢুকবে না |
| পর্যাপ্ত tutor নেই | Guardian এসে ফিরে যায় | Business track এর tutor লক্ষ্য প্রতি শনিবার দেখা; ৫০ না হলে soft launch পিছানো |

**পিছিয়ে পড়লে বাদ দেওয়ার ক্রম** (উপরেরটা আগে বাদ):

1. React admin panel → Django admin এ custom action দিয়ে কাজ চালানো
2. Area/subject landing page (SEO) → launch এর পরের মাসে
3. Notification bell → শুধু SMS ও email
4. Dark mode এর আলাদা যাচাই → token তৈরি আছে, toggle পরে
5. Tutor dashboard এর সাজসজ্জা → শুধু status ও list

**কখনো বাদ নয়**: Verification, contact লুকিয়ে রাখা, guardian confirmation ও commission, report ও suspend, তিন ভাষা, backup। এগুলো ছাড়া platform নিরাপদ বা আয়যোগ্য নয়।
