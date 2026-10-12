# 🪪 SylhetyTutor — Sprint 3 (সপ্তাহ ৩): Tutor Profile ও Registration

**সূত্র**: Sprint Plan (Sprint 3), Architecture Doc §3.2, §3.10, §5, §7.2 · **লক্ষ্য**: Tutor নিজে ৬ ধাপে profile বানিয়ে NID ও Student ID জমা দিতে পারে; guardian একজন tutor এর পূর্ণ profile দেখতে পারে।

## ✅ অবস্থা

| কাজ | অবস্থা |
| --- | --- |
| Profile model: `draft` অবস্থা, student ID নম্বর, availability, review এর তথ্য | ✅ |
| `GET/PATCH /tutors/me/` (ধাপে ধাপে draft save) ও `POST /tutors/me/submit/` | ✅ |
| NID ও Student ID upload (private storage, ৫ MB, file type check) | ⏳ পরের অংশ |
| Avatar resize | ⏳ |
| `GET /tutors/{slug}/` public profile, slug | ⏳ |
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
- Document upload আসলে `submit` এ NID ও Student ID বাধ্যতামূলক হবে — এখনকার submit তা চায় না।
