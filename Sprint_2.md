# 🔎 SylhetyTutor — Sprint 2 (সপ্তাহ ২): Tutor Search

**সূত্র**: Sprint Plan (Sprint 2), Architecture Doc §4.2, §7.1, §12.1 · **লক্ষ্য**: Guardian এলাকা, বিষয়, class দিয়ে verified tutor খুঁজে পায়, link শেয়ার করা যায়।

**Demo**: "Amberkhana + Physics + HSC" filter → ঠিক result; link copy করে অন্য tab এ খুললে একই result; ফোনে filter sheet; result না পেলে empty state।

---

## ✅ অবস্থা

| কাজ | অবস্থা |
| --- | --- |
| `GET /tutors/` — filter, sort, page ২০ | ✅ |
| `GET /lookups/` cache (১ ঘণ্টা, save/delete এ মোছা) | ✅ |
| `seed_demo` (৩০ জন, শুধু local/staging) | ✅ |
| `/tutors` page: URL sync, sort, pagination, skeleton, empty, error | ✅ |
| Filter sidebar (desktop `lg+`) ও bottom sheet (ফোন), active-filter chip | ✅ |
| Home এর search ও "সব tutor" লিঙ্ক `/tutors` এর সাথে জোড়া | ⏳ বাকি |
| Tutor profile page (card এর "View Profile") | Sprint 3 |

---

## 📝 API Contract — `GET /api/v1/tutors/`

Public। শুধু `approved` ও active tutor; card এ phone, email, ঠিকানা কখনো নেই (Architecture Doc §8.8)।

| Parameter | মান | কাজ |
| --- | --- | --- |
| `area`, `subject`, `class_level`, `university` | slug (যেমন `amberkhana`) | অজানা slug → ফাঁকা result (error নয়) |
| `gender` | `male` / `female` | অন্য মান → 400 |
| `fee_min`, `fee_max` | পূর্ণ সংখ্যা (৳/মাস) | tutor এর fee range, বাজেটের সাথে **মিললে** আসে (`fee_min` → tutor.fee_max ≥ মান; `fee_max` → tutor.fee_min ≤ মান) |
| `q` | text | নাম, department, bio, subject, area (বাংলা সহ) |
| `sort` | `featured` (default) / `rating` / `newest` | অন্য মান → 400 |
| `page`, `page_size` | পূর্ণ সংখ্যা | default ২০, সর্বোচ্চ ৫০; শেষের পরের page → 404 |

**Response**: `{ count, next, previous, results: [card…] }`। Card: `id, name, initials, avatarUrl, university, area, subjects, classes, rating, reviewCount, feeMin, feeMax, isFeatured, isVerified`। Review না থাকলে `reviewCount: 0`, UI "New" দেখায় (০.০ নয়)।

**ক্রম**: `featured` = featured আগে, তারপর rating, review সংখ্যা, নতুন। `rating` এ review নেই এমন tutor সবার শেষে।

## 🔗 Frontend URL

`/tutors?q=…&area=…&subject=…&class_level=…&university=…&gender=…&fee_min=…&fee_max=…&sort=…&page=…`

- একই নাম URL ও API তে। শুধু চেনা ও বৈধ মান API তে যায় (`src/utils/searchParams.js`)।
- Default (`sort=featured`, `page=1`) URL এ লেখা হয় না।
- Filter বা sort বদলালে page ১ এ ফেরে। Search box এর লেখা থামার ৩০০ms পরে URL এ যায় (history ভরে না)।
- Desktop sidebar এ select তৎক্ষণাৎ লাগে, বাজেট box ছাড়ার সময়। ফোনের sheet এ সব "Tutors দেখুন" চাপলে একসাথে, একটা history entry।

## ⚠️ খেয়াল

- `distinct()` + `order_by` Postgres এ SQLite থেকে আলাদা আচরণ করতে পারে — CI (Postgres 16) সবুজ না হলে merge নয়।
- `Model.objects.filter(...).update(...)` signal ছোঁয় না, তাই lookup এ bulk update করলে `/lookups/` cache সর্বোচ্চ ১ ঘণ্টা পুরোনো থাকবে; admin form ও `seed_data` ঠিক আছে।
- Demo tutor এ কোনো rating নেই; rating sort চোখে দেখতে হলে আসল review (Sprint 7) লাগবে।
