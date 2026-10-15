# Sprint 6 — Payment ও Commission (বাস্তবায়িত contract)

Unlock fee, guardian confirmation ও commission-এর পুরো চক্র (Architecture Doc §8.8)। কোড `backend/apps/payments/`
(Payment, Commission) ও `backend/apps/matching/confirmation.py`। Sprint 5-এর `Match`/`ContactUnlock`-এর ওপর দাঁড়িয়ে।

## ভাগ (যেভাবে বানানো হয়েছে)

| Part | কী |
| --- | --- |
| A | `Payment` + gateway class (`ManualBkash`), TrxID জমা, admin verify/reject, verify হলে `ContactUnlock`, ৬টা notification kind |
| B | guardian confirmation: signed link, `send_confirmations` command, login ছাড়া one-tap API, admin call list |
| C | `Commission`, founding-tutor মাফ, bKash pay, mark-paid/waive, `process_commissions` (১৪ দিনে reminder, ২১ দিনে suspend) |
| D | React tutor: `PayDialog`, unlock fee pay, `/tutor/payments`, notification |
| E | React: `/confirm/:token`, `/admin/payments` (Payments / Commissions / Call list) |

## চক্র

1. `UNLOCK_FEE_ENABLED=true` হলে booking-এর পর `contact: null`, `unlock_fee: 150`। Tutor bKash Send Money করে TrxID জমা দেয় → `Payment(pending)`।
2. Admin bKash app-এ মিলিয়ে verify করে → `ContactUnlock(fee_paid, payment)` তৈরি, দুজনের যোগাযোগ খোলে। Reject-এ কারণ বাধ্যতামূলক (৫–৩০০); tutor নতুন TrxID দিয়ে আবার চেষ্টা করতে পারে (পুরোনোটা চিরতরে পুড়ে যায়)।
3. Demo-র `CONFIRMATION_AFTER_DAYS` (৭) দিন পর `send_confirmations` guardian-কে link পাঠায় (in-app + email)। Link-এ signed token, ৩০ দিন মেয়াদ, login লাগে না; পাতায় শুধু tutor-এর নাম ও demo-র সময়।
4. "হ্যাঁ" → `Match.confirmed` + `Commission` (free tutor) বা waived (founding)। "না" → `declined`, commission নেই। একবারই উত্তর।
5. ৩ দিনে উত্তর না এলে match admin-এর call list-এ (guardian-এর ফোন + WhatsApp link, শুধু admin দেখে); admin ফোনে শুনে উত্তর লেখে।
6. Commission due ৭ দিনে; tutor bKash-এ দেয় → admin verify → `paid`। ১৪ দিনে reminder, ২১ দিনে `suspended_at` (নতুন apply 403 `account_suspended`); পরিশোধ বা waive হলে নিজে থেকে উঠে যায়।

## API (`/api/v1/`)

| Endpoint | কে | কাজ |
| --- | --- | --- |
| `GET payments/info/` | tutor | bKash নম্বর, unlock fee, commission পরিমাণ |
| `POST tutors/me/applications/{id}/pay-unlock/` `{transaction_id, sender_number}` | tutor (মালিক) | `409 fee_not_required / already_unlocked / payment_pending / trx_already_used`, `400 invalid_transaction_id / invalid_sender_number`, `404 no_booked_demo`। ১০/ঘণ্টা |
| `GET tutors/me/payments/` | tutor | নিজের payment (sender নম্বর ছাড়া) |
| `GET tutors/me/commissions/` | tutor | `{suspended, results}`; প্রতিটিতে `overdue`, `payment` অবস্থা |
| `POST tutors/me/commissions/{id}/pay/` | tutor (মালিক) | একই body ও error; `409 not_payable` |
| `GET/POST confirmations/{token}/` `{answer: yes/no}` | **কেউ** (token-ই প্রমাণ) | `404 invalid_link` (ভুল/পুরোনো), `409 already_answered`; ৩০/ঘণ্টা per link |
| `GET admin/payments/?status=` · `POST …/{id}/verify|reject/` | admin | counts সহ; `409 not_pending` |
| `GET admin/commissions/?status=` · `POST …/{id}/mark-paid|waive/` | admin | due আগে; waive-এ কারণ |
| `GET admin/call-list/` · `POST …/{match_id}/answer/` `{answer, channel: call/whatsapp}` | admin | |

`GET applications` (tutor)-এ নতুন `payment: {status, reject_reason, transaction_id} | null`।

## Setting ও command

`BKASH_NUMBER` (env; ডিফল্ট dummy), `UNLOCK_FEE_ENABLED` (env), `UNLOCK_FEE_AMOUNT=150`, `COMMISSION_AMOUNT=500`
(**খোলা প্রশ্ন:** শতাংশ না নির্দিষ্ট টাকা — Architecture Doc §8.8; এখন নির্দিষ্ট টাকা, এক জায়গায় বদলানো যায়),
`COMMISSION_DUE_DAYS=7`, `COMMISSION_REMINDER_DAYS=14`, `COMMISSION_SUSPEND_DAYS=21`, `CONFIRMATION_AFTER_DAYS=7`,
`CONFIRMATION_CALL_AFTER_DAYS=3`, `CONFIRMATION_LINK_MAX_AGE_DAYS=30`। Founding tutor: Django admin-এ `founding_until`।

```bash
python manage.py send_confirmations [--days-ahead N] [--dry-run]   # দিনে একবার
python manage.py process_commissions [--days-ahead N]               # দিনে একবার
```

`--days-ahead` দিয়ে "সময় এগিয়ে" পুরো চক্র হাতে চালানো যায়। Production-এ cron বা scheduler থেকে চালাতে হবে।

## যা Sprint Plan-এ ছিল কিন্তু এখানে নেই

- **Celery beat ও SMS**: SMS স্থগিত (সিদ্ধান্ত); ওপরের দুটো command cron-এ চলে, Celery লাগেনি। (Celery/Redis এখনো চালু হয়নি।)
- bKash merchant API: `ManualBkash` এর জায়গায় একই তিন method (`submit/verify/reject`) সহ নতুন class বসালেই হবে (`services.gateway`)।
- Subscription (Pro/Premium) ও commission-মুক্ত plan: এই sprint-এর বাইরে; এখন শুধু founding tutor মাফ।
- Admin-এর "disputed" commission-এর কোনো action নেই (status আছে, কেউ সেট করে না)।
