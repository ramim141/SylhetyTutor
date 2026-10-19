# Sprint 7 — Reviews, Home, SEO ও Safety (বাস্তবায়িত contract)

বাইরের মানুষ এসে বিশ্বাস করতে পারে এমন public site — Home polish, review ব্যবস্থা, আইনি ও তথ্যভিত্তিক পাতা,
Google-এ খুঁজে পাওয়ার ভিত্তি (SEO, sitemap, robots, area landing), এবং নিরাপত্তা ও অভিযোগের ব্যবস্থা
(Architecture Doc §3.15, §11.5, §13, Sprint Plan সপ্তাহ ৭)।

## ভাগ

| Part | কী |
| --- | --- |
| A | `Review` model (`apps/reviews`), শুধু confirmed match-এ review দেওয়ার অনুমতি, average rating ও count signal/helper দিয়ে আপডেট, tutor detail ও public list-এ review প্রদর্শন |
| B | Safety (`apps/safety`): `Report` ও `ReplacementRequest` (11.5), user/guardian report API, match replacement API, admin complaint queue, এক ক্লিকে suspend ও resolve |
| C | SEO & Tracking: backend `sitemap.xml`, `robots.txt`, cached `GET /tutors/featured/`, `User.acquisition_*` (UTM fields ও registration capture) |
| D | React Public & Info pages: `/about`, `/terms`, `/privacy`, `/faq`, `/safety` (তিন ভাষায়: EN / বাং / Mixed), Footer হালনাগাদ, Cookie consent banner, UTM capture |
| E | React Reviews & Area Landing: TutorProfile-এ reviews তালিকা ও Guardian Review modal, `/tutors/area/:slug` landing page, JSON-LD structured data (Person, EducationalOrganization, FAQ), Meta tags |
| F | React Safety & Admin Reports: TutorProfile ও Dashboard-এ "Report" বাটন + dialog, match replacement request, `/admin/reports` অভিযোগ queue ও suspend বাটন |

## চক্র ও নিয়মকানুন

1. **Review**: শুধুমাত্র যে guardian-এর সাথে tutor-এর confirmed `Match` আছে, তিনিই সেই tutor-কে একবার review (1–5 star, comment সর্বোচ্চ ৫০০ অক্ষর) দিতে পারেন। Review তৈরি বা আপডেট হলে `TutorProfile.rating_avg` এবং `review_count` স্বয়ংক্রিয়ভাবে আপডেট হয়। Review না থাকলে প্রোফাইলে "New" দেখায়।
2. **Safety & Report**: যে কোনো লগইন করা ব্যবহারকারী অসদাচরণ, ভুয়া তথ্য বা সমস্যার কারণে tutor/ব্যবহারকারীর বিরুদ্ধে report করতে পারেন। Admin `/admin/reports` থেকে অভিযোগ দেখে কারণসহ এক ক্লিকে tutor-কে `suspended_at` দিয়ে suspend করতে পারেন অথবা অভিযোগ সমাধান/খারিজ করতে পারেন।
3. **Replacement Guarantee (11.5)**: Confirmed match-এর পর guardian সন্তুষ্ট না হলে free replacement request করতে পারেন; এটি admin-এর queue-তে যাবে এবং প্ল্যাটফর্ম দ্রুত বিকল্প ব্যবস্থা নেবে।
4. **SEO & Discoverability**: `/sitemap.xml`-এ dynamic tutor profile, area landing page ও static page-এর লিঙ্ক থাকে। `/robots.txt` সার্চ ইঞ্জিন crawler-কে সঠিক পথ দেখায়। `/tutors/area/:slug` Sylhet-এর নির্দিষ্ট এলাকার জন্য SEO landing page হিসেবে কাজ করে। Tutor profile-এ `Person` Schema JSON-LD এবং হোমপেজে `EducationalOrganization` Schema থাকে।
5. **Tracking**: Visitor যখন UTM parameter নিয়ে আসে (`utm_source`, `utm_medium`, `utm_campaign`), frontend তা সংরক্ষণ করে এবং রেজিস্ট্রেশনের সময় পাঠায় যা `User.acquisition_*`-এ সংরক্ষিত হয়।

## API (`/api/v1/`)

| Endpoint | কে | কাজ |
| --- | --- | --- |
| `GET tutors/featured/` | Public | Homepage-এর জন্য শীর্ষ/featured অনুমোদিত tutor তালিকা (১৫ মিনিট cache) |
| `GET tutors/{slug}/reviews/` | Public | Tutor-এর অনুমোদিত review তালিকা (pagination সহ) |
| `POST tutors/{slug}/reviews/` `{rating, comment}` | Guardian (confirmed match) | Review জমা; `403 only_guardian`, `404 tutor_not_found`, `409 no_confirmed_match / already_reviewed`, `400 invalid_rating` |
| `GET guardians/me/reviews/{tutor_slug}/` | Guardian | নিজের দেওয়া review ও review দেওয়ার যোগ্যতা (`can_review`, `review`) |
| `POST reports/` `{target_user_id, category, reason}` | Authenticated user | Report জমা (১০/ঘণ্টা throttle); `400 invalid_category`, `404 target_not_found` |
| `POST matches/{id}/replace/` `{reason}` | Guardian (মালিক) | Replacement request (11.5); `409 not_confirmed`, `409 already_requested` |
| `GET admin/reports/?status=` | Admin | অভিযোগ queue (pending/resolved/dismissed counts সহ) |
| `POST admin/reports/{id}/resolve/` `{action, notes}` | Admin | অভিযোগ নিষ্পত্তি (dismiss / warn / suspend) |
| `POST admin/reports/{id}/suspend-tutor/` `{reason}` | Admin | এক ক্লিকে অভিযুক্ত tutor-কে suspend করা (`suspended_at` সেট ও notification) |
| `GET admin/replacements/?status=` | Admin | Replacement request তালিকা |
| `POST admin/replacements/{id}/resolve/` `{notes}` | Admin | Replacement request সমাধান করা |
| `GET sitemap.xml` | Public | XML sitemap |
| `GET robots.txt` | Public | Search engine robots নির্দেশনা |

## Settings

- `REVIEWS_PAGE_SIZE = 10`
- `FEATURED_TUTORS_CACHE_SECONDS = 900` (১৫ মিনিট)
- Throttles: `report_submit` (১০/ঘণ্টা), `review_submit` (১০/ঘণ্টা)
