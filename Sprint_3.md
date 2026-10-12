# 🪪 SylhetyTutor — Sprint 3 (সপ্তাহ ৩): Tutor Profile ও Registration

**সূত্র**: Sprint Plan (Sprint 3), Architecture Doc §3.2, §3.10, §5, §7.2 · **লক্ষ্য**: Tutor নিজে ৬ ধাপে profile বানিয়ে NID ও Student ID জমা দিতে পারে; guardian একজন tutor এর পূর্ণ profile দেখতে পারে।

## ✅ অবস্থা

| কাজ | অবস্থা |
| --- | --- |
| Profile model: `draft` অবস্থা, student ID নম্বর, availability, review এর তথ্য | ✅ |
| `GET/PATCH /tutors/me/` (ধাপে ধাপে draft save) ও `POST /tutors/me/submit/` | ✅ |
| NID ও Student ID upload (private storage, ৫ MB, আসল ছবি কি না যাচাই, EXIF মোছা) | ✅ |
| Profile photo (avatar): 512px বর্গ, imgBB তে | ✅ |
| `GET /tutors/{slug}/` public profile, slug; কার্ড ক্লিক করলে profile; profile page (`/tutors/:slug`) | ✅ |
| Frontend: ৬-ধাপের form, upload component, profile page, dashboard status card | ⏳ |

## 📝 Contract — নিজের profile (শুধু `role=tutor`; অন্যরা 403, ছাড়া 401)

**অবস্থা**: `draft` (লিখছেন; admin ও search এ দেখা যায় না) → `pending` (জমা দেওয়া, admin দেখবে) → `approved` (public) বা `rejected` (কারণ সহ, ঠিক করে আবার জমা দেওয়া যায়)।

| Method | Endpoint | কাজ |
| --- | --- | --- |
| GET | `/tutors/me/` | নিজের profile; প্রথমবার ফাঁকা `draft` তৈরি হয় |
| PATCH | `/tutors/me/` | যেকোনো অংশ save (শুধু যা পাঠালেন তা বদলায়) |
| POST | `/tutors/me/submit/` | সম্পূর্ণ profile `pending` এ পাঠানো |

**GET response**: `id, status, rejection_reason, submitted_at, verified_at, gender, university (slug), department, year, student_id_number, bio, fee_min, fee_max, subjects[slug], class_levels[slug], areas[slug], availability[{day, slot}], missing[…], can_edit`। `missing` = জমা দিতে আর কী বাকি (form কোন ধাপে যাবে তা এ থেকে বোঝা যায়); `can_edit` = `pending` ছাড়া `true`।

**PATCH body** (সবই ঐচ্ছিক): `gender` (`male`/`female`), `university`, `subjects`, `class_levels`, `areas` (slug; list টা **বদলে** যায়, মেশে না), `department`, `year`, `student_id_number`, `bio` (≤৪০০), `fee_min`, `fee_max` (১–১,০০০,০০০; min ≤ max), `availability` (`day`: `sat…fri`, `slot`: `morning`/`afternoon`/`evening`; একই slot দুবার দিলে একবার)। `status`, `is_featured`, rating ইত্যাদি এখান থেকে বদলানো যায় না (চুপচাপ উপেক্ষা)।

| কখন | ফল |
| --- | --- |
| ভুল মান | 400, `fields.<নাম>[{code, message}]`; কিছু save হয় না |
| `pending` অবস্থায় PATCH | 409 `profile_locked` |
| `approved` হলে পরিচয়ের field (`gender, university, department, year, student_id_number`) বদলাতে চাইলে | 400, `locked` |
| `approved` হলে bio, fee, subjects, classes, areas, availability | বদলানো যায় |

**Submit**: অসম্পূর্ণ হলে 400, প্রতিটা বাকি field এ `required`। `pending`/`approved` অবস্থায় 409 `already_submitted`। সফল হলে `status=pending`, `submitted_at` বসে, পুরোনো `rejection_reason` মোছে।

## ⚠️ সিদ্ধান্ত ও খেয়াল

- **নতুন অবস্থা `draft`**: আগে নতুন profile `pending` ছিল, ফলে অর্ধেক ভরা profile ও admin এর queue তে ঢুকে যেত। এখন জমা না দেওয়া পর্যন্ত admin দেখে না।
- **`gender`, `fee_min`, `fee_max` ফাঁকা থেকে শুরু** (আগে `male`, ৳3000–7000 ধরা ছিল) — না ভরলে "ভরা" দেখাত না। `approved` হতে হলে model এই field গুলো ভরা চায় (Django admin এও আটকায়)।
- Frontend এ nested list (`availability`) পাঠাতে JSON লাগে; test settings এ ডিফল্ট JSON।

## 🔒 NID ও Student ID (সবচেয়ে সংবেদনশীল অংশ)

| Method | Endpoint | কাজ |
| --- | --- | --- |
| PUT | `/tutors/me/documents/{kind}/` | আপলোড/বদল। `kind` = `nid` বা `student_id`। multipart, একটাই `file` |
| DELETE | `/tutors/me/documents/{kind}/` | নিজের document মোছা |
| GET | `/tutors/documents/{profile_id}/{kind}/` | ছবি দেখা — **শুধু মালিক ও admin** |

- **Upload এর নিয়ম**: JPEG/PNG/WebP, সর্বোচ্চ ৫ MB। file এর নাম বা `Content-Type` বিশ্বাস না করে ছবিটা আসলেই decode করে যাচাই হয়। ভুল হলে 400, `fields.file[].code` = `required` · `file_too_large` · `not_an_image` · `unsupported_format` (যেমন GIF) · `image_too_large` (৪০ মেগাপিক্সেলের বেশি)।
- **রাখা হয় যেভাবে**: ছবিটা নতুন করে JPEG হিসেবে encode হয় (EXIF, যেমন GPS অবস্থান, মুছে যায়; ফোনে কাত করা ছবি সোজা হয়; লম্বা দিক সর্বোচ্চ ২০০০px)। নাম এলোমেলো (`documents/<profile>/<random>.jpg`), কোনো URL নেই।
- **কোথায়**: `PRIVATE_MEDIA_ROOT` (default `backend/private_media/`, git ও docker ignore এ)। `MEDIA_ROOT` এর বাইরে, তাই `/media/…` দিয়ে পাওয়া যায় না; `storage.url()` ইচ্ছা করেই error দেয়।
- **কে দেখতে পারে**: মালিক ও admin। অন্য সবার (অন্য tutor, guardian, অজানা id) একই `404` — ফাইল আছে কি না বোঝা যায় না। Response এ `Cache-Control: private, no-store`, `X-Content-Type-Options: nosniff`। `GET /tutors/me/` এ শুধু `documents: {nid, student_id}` (আছে/নেই) আসে, কোনো path বা URL নয়।
- **কখন বদলানো যায়**: `draft`/`rejected` এ। `pending` এ 409 `profile_locked`; `approved` এ 400 `locked`।
- **Throttle**: প্রতি account এ মিনিটে ৫টা (ব্যর্থ ও আটকানো অনুরোধও গোনা হয়)।
- **Submit**: `nid_photo` ও `student_id_photo` ছাড়া জমা হয় না (`missing` এ আসে)। Django admin ও এই দুটো ছাড়া `approved` করতে দেয় না।
- **Profile মুছলে ফাইলও মোছে** (signal)। `seed_demo --reset` ও তাই।
- **Django admin**: ফাইলের widget দেখানো হয় না (URL নেই বলে); profile পাতায় "NID: view · Student ID: view" লিঙ্ক, যা staff session দিয়ে খোলে।
- **`seed_demo`**: প্রতিটা demo tutor এর দুটো ছবি আছে, কিন্তু সেগুলো ধূসর কার্ডে স্পষ্ট লেখা "DEMO … Not a real document"।

## ⚠️ Production এর আগে

- `PRIVATE_MEDIA_ROOT` অবশ্যই **persistent volume** এ (container মুছলে ফাইল হারাবে), অথবা Sprint 8 এ private bucket (S3/Spaces, signed URL নয় — আমাদের endpoint দিয়েই stream)। Backup এও এই ফোল্ডার ধরতে হবে।
- Nginx এ কখনো এই ফোল্ডার `location` হিসেবে খুলবেন না।
- এই অংশের PR এ দুজনের security review লাগবে (Sprint Plan)।

## 🖼️ Profile photo (avatar) — imgBB তে

| Method | Endpoint | কাজ |
| --- | --- | --- |
| PUT | `/auth/me/avatar/` | ছবি দেওয়া/বদলানো (যেকোনো signed-in user)। multipart, একটাই `file` |
| DELETE | `/auth/me/avatar/` | ছবি সরানো |

- **কেন imgBB**: server এর ডিস্ক বাঁচে। কিন্তু imgBB **public host** — লিঙ্ক জানা যে কেউ ছবি খুলতে পারে। তাই শুধু profile photo (যা site এ এমনিতেই public)। **NID/Student ID কখনো imgBB তে নয়**; সেগুলো আগের মতো private storage এ (উপরের অংশ)।
- **Env**: `IMGBB_API_KEY` (বাধ্যতামূলক), `IMGBB_API_URL`, `IMGBB_TIMEOUT` (`.env.example` দেখুন)। key নেই → 503 `uploads_unavailable`।
- **যা পাঠানো হয়**: যাচাই (JPEG/PNG/WebP, ৫ MB, আসল ছবি কি না) → মাঝখান থেকে ৫১২px বর্গে কাটা (ছোট ছবি বড় করা হয় না), EXIF মুছে JPEG। key থাকে POST body তে, URL এ নয়; ফাইলের নাম এলোমেলো।
- **Response**: `avatar` = ছবির public URL (না থাকলে `null`)। `delete_url` কখনো কাউকে পাঠানো হয় না (যার কাছে থাকবে সে ছবি মুছতে পারবে), DB তে রাখা হয়।
- **ব্যর্থতা**: imgBB ডাউন/অস্বীকার/ভুল উত্তর/`https` ছাড়া URL → 502 `upload_failed`, আগের ছবি অক্ষত; উত্তরে key বা imgBB এর কাঁচা লেখা থাকে না। Throttle: মিনিটে ৫টা।
- **সীমা (সৎভাবে)**: ছবি সরালে বা বদলালে সাইট সাথে সাথে নতুনটা দেখায়, কিন্তু **imgBB তে পুরোনো কপি থেকে যায়** (স্বয়ংক্রিয় মোছা নেই)। দরকারে `avatar_delete_url` (Django admin এ দেখা যায়) দিয়ে হাতে মুছতে হবে।
- **যাচাই বাকি**: আসল imgBB key দিয়ে একবার চালানো। এখনকার test সব imgBB mock করে।

## 🌐 Public profile — `GET /api/v1/tutors/{slug}/`

- **Slug**: নাম + সর্বোচ্চ দুটো subject, যেমন `rahim-uddin-physics-math`; একই হলে `-2`, `-3`। **প্রথমবার `approved` হওয়ার সময় একবার** বানানো হয় (Django admin এ status বদলালেও `save()` তে), তারপর **কখনো বদলায় না** — tutor subject বদলালেও শেয়ার করা লিঙ্ক চলে। বাংলা নামের (ল্যাটিন অক্ষর নেই) slug শুধু subject থেকে, তাও না থাকলে `tutor`। `me`, `documents`, `featured`, `area`, `subject`, `register` কখনো slug হয় না (এই ঠিকানাগুলোর আলাদা মানে আছে)। `draft`/`pending`/`rejected` এর slug নেই।
- **Response** (শুধু এই field গুলো, `__all__` নয়): `id, slug, name, initials, avatarUrl, gender, university{slug,name_en,name_bn,short_name}, department, year, bio, feeMin, feeMax, subjects[{slug,name_en,name_bn}], classLevels[…], areas[…], availability[{day,slot}], rating, reviewCount, isFeatured, isVerified`। দুই ভাষার নাম আসে, page নিজে ভাষা বাছে।
- **কখনো আসে না**: phone, email, ঠিকানা, `student_id_number`, NID/Student ID, status, rejection reason, `verified_by`, `delete_url` (টেস্টে ঠিক এই তালিকা ধরে যাচাই করা)।
- **404** (একই standard shape): অজানা ঠিকানা, `draft`/`pending`/`rejected`, বা suspended account।
- **Search card** এ এখন `slug` আছে; কার্ডের পুরোটাই একটা লিঙ্ক (নামের উপর stretched link, screen reader এ একটাই link)।
- **Frontend `/tutors/:slug`**: header (ছবি/আদ্যক্ষর, নাম, ✓, university · department · বর্ষ, "New" বা আসল rating, fee), পরিচিতি, বিষয়/শ্রেণি/এলাকা, সাপ্তাহিক সময়সূচি (শনি থেকে শুক্র × সকাল/দুপুর/সন্ধ্যা; ✓ ও – চিহ্ন, শুধু রঙ নয়), review (খালি, সৎ বার্তা), "ফোন নম্বর গোপন থাকে" নোট। ফাঁকা অংশ (bio, subject…) দেখানো হয় না। অজানা ঠিকানায় বন্ধুত্বপূর্ণ পাতা, নেটওয়ার্ক সমস্যায় retry। Back লিঙ্ক আগের search (filter সহ) এ ফেরে।
- **এখনো নেই**: যোগাযোগ/আবেদন বাটন (Sprint 4–5), review (Sprint 7), পাতার SEO meta/JSON-LD (Sprint 7)।
