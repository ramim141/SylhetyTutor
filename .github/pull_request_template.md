## কী বদলালো

<!-- এক-দুই লাইনে। UI হলে light ও dark দুটোর screenshot দিন। -->

Closes #

## কিভাবে test করবেন

1.

## Checklist

- [ ] Backend test / frontend test যোগ বা আপডেট করা হয়েছে, লোকালি pass করে
- [ ] Migration আছে? থাকলে commit করা হয়েছে (`makemigrations --check` সবুজ)
- [ ] API change আছে? থাকলে `api-change` label আর একই PR এ frontend fix
- [ ] তিন ভাষার text (EN / বাং / Mixed) যোগ হয়েছে, কোনো লেখা component এ hard-code নয়
- [ ] 360px mobile ও desktop এ দেখা হয়েছে
- [ ] Light ও dark theme দুটোতেই ঠিক; কোনো hard-coded রং (`text-white`, hex) নেই (DESIGN.md)
- [ ] Keyboard দিয়ে চালানো যায়; icon-only বাটনে `aria-label`
- [ ] Phone / ঠিকানা / NID এর মতো সংবেদনশীল data response বা log এ নেই
