# Sprint 5 — Apply থেকে Demo (বাস্তবায়িত contract)

Tutor requirement-এ apply করে → guardian shortlist করে → demo-র সময় ঠিক হয় → **তখনই** দুপক্ষের যোগাযোগ খোলে।
আগে কারো phone/email কোনো response-এ নেই (Architecture Doc §8.8)। কোড `backend/apps/matching/`।

## ভাগ (যেভাবে বানানো হয়েছে)

| Part | কী | Commit |
| --- | --- | --- |
| A | `TutorApplication`, apply + my-applications, notification kind ও email, `application_status`/`application_count` | `feat(matching): tutors apply…` |
| B | guardian-এর applicant list, shortlist, reject, Django admin action | `…guardian applicants, shortlist and reject` |
| C | `Match`, `ContactUnlock`, book-demo, contact খোলা, `UNLOCK_FEE_ENABLED`, audit admin | `…demo booking and contact unlock` |
| D | React: Apply dialog, `/tutor/applications`, notification, dashboard লিঙ্ক | `feat(frontend): tutor apply…` |
| E | React: `/requirements/:id/applicants`, shortlist/reject, demo dialog, contact card | `feat(frontend): guardian applicants…` |

## API (`/api/v1/`)

| Endpoint | কে | কাজ |
| --- | --- | --- |
| `POST tutors/me/apply/{requirement_id}/` `{message?}` | approved tutor | 201 application। `404 requirement_not_found` (matching নয়/বন্ধ/draft), `409 already_applied`, message ≤৩০০ অক্ষর ও ফোন/link/chat আটকানো (`fields.message[].code = contact_not_allowed`)। ৩০/ঘণ্টা per account |
| `GET tutors/me/applications/` | tutor | নিজের application: `status`, `message`, `requirement` (guardian-তথ্য ছাড়া), `demo_at`, `unlock_fee`, `contact` |
| `GET requirements/{id}/applications/` | guardian (মালিক) | applicant list (public tutor card + message); `applied` → `viewed` হয় |
| `POST applications/{id}/shortlist/` · `…/reject/` | guardian (মালিক) | `409 already_shortlisted/already_rejected/requirement_not_open/demo_booked`। rejected → আবার shortlist চলে |
| `POST applications/{id}/book-demo/` `{demo_at}` | guardian (মালিক) | শুধু shortlisted (`409 not_shortlisted`); সময় এখন +১ ঘণ্টা … +৩০ দিন (`400 invalid_demo_time`); আবার call = সময় বদল |

অন্য guardian-এর requirement/application সবসময় 404; role ভুল হলে 403; guest 401।
`GET requirements/matching/` এখন প্রতি item-এ `application_status` (null বা status) দেয়; `GET requirements/` ও detail-এ `application_count`।

## Contact কখন খোলে

`contact` (`{name, phone, email}`) শুধু তখন আসে যখন `ContactUnlock` row আছে — অর্থাৎ demo book হয়েছে **এবং** fee বন্ধ।
`UNLOCK_FEE_ENABLED` (env, ডিফল্ট `false`, `UNLOCK_FEE_AMOUNT = 150`)। চালু থাকলে book হয় কিন্তু `contact: null`,
`unlock_fee: 150` আসে; Sprint 6-এ payment verify হলে সেখানে `ContactUnlock` তৈরি হবে। `ContactUnlock` = কে (tutor),
কার (requirement → guardian), কখন, কত টাকা; Django admin-এ read-only।

## Notification

নতুন kind: `application_received` (guardian), `application_shortlisted`, `application_rejected` (tutor), `demo_booked` (দুজনেই)।
Email থাকলে তিন ভাষায়; কোনো email/notification-এ phone বা নাম নেই।

## যা Sprint Plan-এ ছিল কিন্তু এখানে নেই

- **Celery + Redis ও SMS**: SMS স্থগিত (সিদ্ধান্ত), আর এই sprint-এ এমন কোনো কাজ নেই যা background worker ছাড়া চলে না — in-app + email `transaction.on_commit`-এ। Sprint 6-এর ৭-দিনের guardian confirmation-এ লাগবে, তখন যোগ হবে।
- **Admin-এর জন্য আলাদা shortlist API**: Django admin action আছে (`TutorApplicationAdmin`); React admin পাতা নেই।
- Tutor-এর apply withdraw, মাসে ৩ application সীমা (subscription, Sprint 6+)।
