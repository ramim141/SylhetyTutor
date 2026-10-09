# SylhetyTutor — Design System

> Colors, theme, typography, components আর UI pattern এর এক জায়গার reference।
> নতুন page বা component বানানোর আগে এটা দেখে নিন। এখানে যা নেই, সেটা নিজে বানানোর আগে দুজনে আলোচনা করে এখানে যোগ করুন।

**Brand**: SylhetyTutor by Webnify IT Solution
**Stack**: React + Vite + TypeScript + Tailwind CSS v4
**Source of truth**: এই file + `frontend/src/styles/theme.css`। Component এর ভেতরে কখনো hex code লেখা যাবে না।

---

## Contents

1. [Brand Basics](#1-brand-basics)
2. [Color Palette](#2-color-palette)
3. [Theme (Light / Dark)](#3-theme-light--dark)
4. [Typography](#4-typography)
5. [Spacing, Radius, Shadow, Layout](#5-spacing-radius-shadow-layout)
6. [Components](#6-components)
7. [UI Patterns](#7-ui-patterns)
8. [Code Setup (copy-ready)](#8-code-setup-copy-ready)
9. [Do / Don't](#9-do--dont)
10. [Accessibility Fixes vs. Original Design System](#10-accessibility-fixes-vs-original-design-system)

---

## 1. Brand Basics

| Item | Rule |
| --- | --- |
| Logo wordmark | **"Sylhety"** Navy (`#1a2e5e`) + **"Tutor"** Orange (`#f47920`), সবসময় একসাথে, মাঝে space নেই। "T" এর উপরে graduation cap icon। |
| Logo on dark bg | "Sylhety" light navy (`#c8d4ee`), "Tutor" orange (`#f5923f`) |
| Logo min size | Header এ height 32px, mobile এ 28px; চারপাশে অন্তত logo এর "T" এর সমান ফাঁকা জায়গা |
| Personality | বিশ্বস্ত, স্থানীয়, পরিষ্কার। Navy = trust (verified, safe), Orange = action (খুঁজুন, apply করুন) |
| Background decor | হালকা orange circle (10% opacity), কখনো solid নয়, content এর পেছনে চাপা |

**এক লাইনের নিয়ম**: Navy দিয়ে বিশ্বাস, Orange দিয়ে কাজ। একটা screen এ orange এর প্রধান action একটাই।

---

## 2. Color Palette

### 2.1 Brand

| Token | Light | Dark | কোথায় |
| --- | --- | --- | --- |
| `navy` | `#1a2e5e` | `#c8d4ee` | Heading, logo, secondary button, নিরাপত্তা/verified বিষয় |
| `navy-deep` | `#0f1d3d` | `#e2e8f4` | Footer bg, hero overlay, গাঢ় heading |
| `navy-light` | `#2a4480` | `#8da0cc` | Hover state, link hover |
| `orange` | `#f47920` | `#f5923f` | Primary button **background**, icon, border, decor — **লেখার রং হিসেবে নয়** |
| `orange-hover` | `#e06810` | `#f9a85e` | Primary button hover |
| `orange-text` | `#b44d0c` | `#f5923f` | হালকা পটভূমিতে কমলা **লেখা** (link, subject name, price) |
| `on-orange` | `#0f1d3d` | `#0e1117` | Orange background এর উপর লেখা |
| `on-navy` | `#ffffff` | `#0e1117` | Navy background এর উপর লেখা (secondary button, Founding badge) |
| `orange-light` | `#fef3ea` | `#2a1f14` | Premium badge bg, selected chip bg |
| `orange-pale` | `#fff8f2` | `#1e1814` | Section background (hero, CTA band) |

### 2.2 Surfaces & Text

| Token | Light | Dark | কোথায় |
| --- | --- | --- | --- |
| `bg` | `#ffffff` | `#0e1117` | Page background |
| `bg-subtle` | `#faf9f7` | `#151921` | Alternate section, filter sidebar, table header |
| `bg-card` | `#ffffff` | `#1a1f2b` | Card, modal, dropdown, input |
| `fg` | `#1a2e5e` | `#e2e8f4` | মূল লেখা |
| `fg-secondary` | `#5a6a8a` | `#9aa5bd` | Description, meta text |
| `fg-muted` | `#647089` | `#7d8aa8` | Placeholder, caption, timestamp |
| `border` | `#e8e6e1` | `#2a3042` | Card border, input border, divider |
| `border-light` | `#f0eee9` | `#1e2435` | Card এর ভেতরের divider |

### 2.3 Semantic

| Token | Light (text / bg) | Dark (text / bg) | কোথায় |
| --- | --- | --- | --- |
| `success` | `#15803d` / `#f0fdf4` | `#4ade80` / `#0f2418` | Verified সম্পন্ন, payment সফল, Featured |
| `warning` | `#b45309` / `#fffbeb` | `#fbbf24` / `#241e0a` | Pending verification, subscription শেষ হচ্ছে |
| `error` | `#dc2626` / `#fef2f2` | `#f87171` / `#240f0f` | Form error, rejected, failed payment |
| `info` | `#2563eb` / `#eff6ff` | `#60a5fa` / `#0f1a2e` | Verified badge, tip, notice |
| `on-error` | `#ffffff` | `#0e1117` | Danger button এর লেখা |

### 2.4 Special

| Token | Light | Dark | কোথায় |
| --- | --- | --- | --- |
| `featured-border` | `#16a34a` | `#4ade80` | Featured tutor card এর 2px border |
| `featured-bg` | `#f0fdf4` | `#0f2418` | Featured tutor card bg |
| `star` | `#f59e0b` | `#fbbf24` | Rating star icon (পাশে সংখ্যা সবসময় লেখা থাকবে) |
| `badge-pro` | `#7c3aed` | `#a78bfa` | "Pro" badge text |
| `badge-premium` | `#b44d0c` | `#f5923f` | "Premium" badge text (`orange-light` bg এর উপর) |

### 2.5 Contrast Rules (পড়ার মান — WCAG AA)

সব লেখা কমপক্ষে **4.5:1** contrast এ। মাপা মান:

| জোড়া | Ratio | অবস্থা |
| --- | --- | --- |
| `navy` on `bg` | 13.2 | ✅ |
| `fg-secondary` on `bg` | 5.4 | ✅ |
| `fg-muted` (`#647089`) on `bg-subtle` | 4.7 | ✅ |
| `on-orange` (`#0f1d3d`) on `orange` | 6.0 | ✅ Primary button |
| `on-orange` on `orange-hover` | 4.9 | ✅ |
| `orange-text` (`#b44d0c`) on `bg` / `orange-pale` | 5.2 / 5.0 | ✅ |
| `success` (`#15803d`) on `success-bg` | 4.8 | ✅ |
| Dark: `on-orange` (`#0e1117`) on `#f5923f` | 8.2 | ✅ |
| `on-navy` on `navy` (light / dark) | 13.2 / 12.7 | ✅ |
| `on-error` on `error` (light / dark) | 4.8 / 6.8 | ✅ |
| ~~White on dark-mode `navy` `#c8d4ee`~~ | 1.5 | ❌ তাই `on-navy` |
| ~~White on `orange` `#f47920`~~ | 2.8 | ❌ ব্যবহার নিষেধ |
| ~~`orange` `#f47920` লেখা on white~~ | 2.8 | ❌ ব্যবহার নিষেধ |

তিনটা নিয়ম মনে রাখলেই হবে:

1. **রঙিন background এর উপর লেখা সবসময় তার `on-*` token** (`on-orange`, `on-navy`, `on-error`) — কখনো সরাসরি `text-white` নয়, কারণ dark mode এ background হালকা হয়ে যায়।
2. **কমলা লেখা লাগলে `orange-text`**, কখনো `orange` নয়।
3. **রং দিয়ে একা কোনো অর্থ বোঝানো যাবে না**: error এ icon + লেখা, rating এ star + সংখ্যা।

> Posters এর মতো সাদা লেখার orange button যদি একান্তই চান: background `#b44d0c` (white এর সাথে 5.2:1)। তবে পুরো site এ একটাই নিয়ম রাখুন, মিশিয়ে নয়।

---

## 3. Theme (Light / Dark)

**নীতি**: Component কখনো জানবে না কোন theme চলছে। সব রং semantic token থেকে আসে, theme বদলালে token এর মান বদলায়। তাই Tailwind এর `dark:` utility **ব্যবহার করা হবে না**।

| বিষয় | সিদ্ধান্ত |
| --- | --- |
| Default | `system` (ফোন/কম্পিউটারের setting অনুযায়ী) |
| Toggle এর মান | `light` / `dark` / `system` |
| Storage | `localStorage` key `sylhetytutor_theme` (ভাষার key `sylhetytutor_lang` এর মতো) |
| প্রয়োগ | `<html data-theme="light|dark">` — `system` হলে JS `matchMedia` দেখে light বা dark বসায় |
| Flash এড়ানো | `index.html` এর `<head>` এ ছোট inline script, React load হওয়ার আগেই `data-theme` বসায় (Section 8.4) |
| MVP | Token দুই theme এরই তৈরি; toggle UI MVP তে না দিলেও system dark mode কাজ করবে |

Dark mode এ যাচাই: প্রতিটা নতুন page এর PR এ light ও dark দুটোর screenshot।

---

## 4. Typography

### 4.1 Fonts

| Role | Font | Weight | কোথায় |
| --- | --- | --- | --- |
| Display | **Plus Jakarta Sans** | 600, 700, 800 | Heading, button, badge, label, logo |
| Body | **Hind Siliguri** | 400, 500, 600 | Paragraph, input, বাংলা সব লেখা |
| Mono | JetBrains Mono | 400 | Code, ID, transaction number |

**Mixed ভাষার নিয়ম**: Plus Jakarta Sans এ বাংলা অক্ষর নেই। তাই display font stack এ Hind Siliguri দ্বিতীয় স্থানে রাখা বাধ্যতামূলক, যাতে বাংলা heading Hind Siliguri তে পড়ে, system font এ নয়:

```css
--font-display: "Plus Jakarta Sans", "Hind Siliguri", system-ui, sans-serif;
--font-body:    "Hind Siliguri", "Plus Jakarta Sans", system-ui, sans-serif;
```

### 4.2 Type Scale

Tailwind এর default scale এর সাথে হুবহু মেলে, আলাদা config লাগবে না।

| Class | Size | কোথায় | Weight | Line-height |
| --- | --- | --- | --- | --- |
| `text-4xl` | 2.25rem / 36px | Hero heading (mobile এ `text-3xl`) | 800 | 1.2 |
| `text-3xl` | 1.875rem / 30px | Page title | 800 | 1.25 |
| `text-2xl` | 1.5rem / 24px | Section heading | 700 | 1.3 |
| `text-xl` | 1.25rem / 20px | Card group title, modal title | 700 | 1.4 |
| `text-lg` | 1.125rem / 18px | Lead paragraph | 500 | 1.7 |
| `text-base` | 1rem / 16px | Body, input | 400 | 1.7 (বাংলা 1.8) |
| `text-sm` | 0.875rem / 14px | Meta, caption, button | 400–600 | 1.6 |
| `text-xs` | 0.75rem / 12px | Badge, label (UPPERCASE হলে `tracking-wider`) | 500–600 | 1.5 |

**নিয়ম**

- Heading: `font-display`, `tracking-tight` (−0.02em), `text-wrap: balance`
- বাংলা body: line-height 1.8–2.0 (যুক্তাক্ষর ও মাত্রার জন্য জায়গা লাগে); `[lang="bn"]` selector দিয়ে বাড়ানো
- বাংলা লেখায় UPPERCASE বা letter-spacing নয়
- লাইনের দৈর্ঘ্য paragraph এ সর্বোচ্চ ~65 অক্ষর (`max-w-prose`)
- সংখ্যা column এ (দাম, rating, table): `tabular-nums`
- Input এর font-size কখনো 16px এর কম নয় (iPhone এ zoom ঠেকাতে)

---

## 5. Spacing, Radius, Shadow, Layout

### 5.1 Spacing (4px base)

Tailwind default spacing ব্যবহার: `1` = 4px, `2` = 8px, `3` = 12px, `4` = 16px, `5` = 20px, `6` = 24px, `8` = 32px, `10` = 40px, `12` = 48px, `16` = 64px।

| কোথায় | মান |
| --- | --- |
| Card এর ভেতরের padding | `p-5` (20px) |
| Form field এর মাঝে | `gap-4` (16px) |
| Card grid এর মাঝে | `gap-6` (24px) |
| Section এর উপর-নিচ | `py-12` mobile, `py-16` desktop |
| Page side gutter | `px-4` (16px) mobile, `px-6` tablet+ |

Sibling element এর মাঝে margin এর বদলে flex/grid `gap`।

### 5.2 Radius

| Token | মান | কোথায় |
| --- | --- | --- |
| `rounded-sm` | 6px | Class badge, ছোট tag |
| `rounded-md` | 10px | Button, input, select |
| `rounded-lg` | 14px | Card, modal |
| `rounded-xl` | 20px | Hero image, বড় promo block |
| `rounded-full` | 9999px | Avatar, pill badge, language toggle |

### 5.3 Shadow

| Token | Light | কোথায় |
| --- | --- | --- |
| `shadow-sm` | `0 1px 3px rgb(26 46 94 / 0.06)` | Input focus এর বাইরে, ছোট element |
| `shadow-card` | `0 2px 8px rgb(26 46 94 / 0.06)` | Card এর স্বাভাবিক অবস্থা |
| `shadow-md` | `0 4px 12px rgb(26 46 94 / 0.08)` | Card hover, dropdown |
| `shadow-lg` | `0 8px 30px rgb(26 46 94 / 0.12)` | Modal, mobile bottom sheet |

Dark mode এ shadow কালো (`rgb(0 0 0 / 0.3–0.5)`), কারণ গাঢ় পটভূমিতে navy shadow দেখা যায় না।

### 5.4 Layout & Breakpoints

| Breakpoint | Width | Layout |
| --- | --- | --- |
| (base) | < 640px | এক column, bottom sheet filter, sticky bottom CTA |
| `sm` | ≥ 640px | Card grid 2 column |
| `md` | ≥ 768px | Header এ পুরো nav |
| `lg` | ≥ 1024px | Search page এ বাম পাশে filter sidebar (280px) + 2 column card |
| `xl` | ≥ 1280px | Card grid 3 column |

- Container: `max-w-[1200px] mx-auto px-4 md:px-6`
- **Mobile first**: Sylhet এর বেশিরভাগ guardian ফোনে আসবেন। আগে 360px width এ design, তারপর বড়।
- Touch target কমপক্ষে 44×44px।
- Page body কখনো পাশে scroll করবে না; বড় table নিজের `overflow-x-auto` container এ।

---

## 6. Components

সব component `frontend/src/components/ui/` এ। Development এ `/dev/ui` route এ সবগুলো একসাথে দেখা যায়।

### 6.1 Button

| Variant | Background | Text | Border | Hover | কোথায় |
| --- | --- | --- | --- | --- | --- |
| `primary` | `orange` | `on-orange` | — | `orange-hover` | Screen এর প্রধান action (Search, Apply, Post Requirement) |
| `secondary` | `navy` | `on-navy` | — | `navy-light` | দ্বিতীয় গুরুত্বপূর্ণ action (Sign In) |
| `outline` | transparent | `orange-text` | 2px `orange` | bg `orange-pale` | View Profile, Edit |
| `ghost` | transparent | `fg-secondary` | 1px `border` | bg `bg-subtle` | Cancel, back |
| `danger` | `error` | `on-error` | — | opacity 90% | Delete, reject (confirm step সহ) |

| Size | Padding | Font | Min height |
| --- | --- | --- | --- |
| `sm` | `px-4 py-1.5` | `text-xs` | 36px (শুধু desktop table/toolbar এ) |
| `md` (default) | `px-6 py-2.5` | `text-sm` | 44px |
| `lg` | `px-8 py-3.5` | `text-base` | 52px |

Common: `font-display font-semibold rounded-md`, icon থাকলে `gap-2`, `transition-colors duration-200`।
States: `disabled` (opacity 50%, cursor not-allowed), `loading` (spinner + লেখা থাকবে, width বদলাবে না), focus ring `ring-2 ring-orange ring-offset-2`।

### 6.2 Input / Select / Textarea

- Label উপরে (`text-sm font-display font-semibold text-fg`), input এর নিচে helper বা error
- `bg-card border border-border rounded-md px-3.5 py-2.5 text-base font-body`
- Focus: `border-orange` + `ring-3 ring-orange/15`
- Error: `border-error`, নিচে error icon + লেখা (`text-sm text-error`), `aria-invalid="true"`, `aria-describedby`
- Placeholder `fg-muted`; placeholder কখনো label এর বদলি নয়
- Phone input এ `inputmode="tel"`, placeholder `01XXXXXXXXX`
- Select: native `<select>` (mobile এ ভালো), custom chevron icon

### 6.3 Badge

`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-display font-semibold`

| Badge | Background | Text | Extra |
| --- | --- | --- | --- |
| ★ Featured | `success-bg` | `success` | 1px `success` border; card এর উপরে বামে |
| ✓ Verified | `info-bg` | `info` | NID + Student ID যাচাইয়ের পর |
| Pro | `badge-pro` 8% | `badge-pro` | |
| Premium | `orange-light` | `badge-premium` | |
| Free | `bg-subtle` | `fg-muted` | 1px `border` |
| Founding Tutor | `navy` | `on-navy` | প্রথম ১০০ জন tutor |
| Class tag | transparent | `fg-secondary` | `rounded-sm`, 1px `border` (যেমন "Class 9–10") |

### 6.4 Tutor Card

```
┌──────────────────────────────────────┐
│ ★ Featured                    (opt.) │
│ ┌────┐  Rahim Uddin ✓                │
│ │ RU │  Physics, Math    ← orange-text│
│ └────┘  SUST · Amberkhana  ← fg-muted │
│ ─────────────────────────────────────│  border-light
│ ★★★★★ 4.8 (24)        [Class 9–10]   │
│ [        View Profile (outline)    ] │
└──────────────────────────────────────┘
```

- `bg-card border border-border rounded-lg p-5 shadow-card hover:shadow-md`
- Featured: `border-2 border-featured-border bg-featured-bg`
- Avatar 52px গোল; ছবি না থাকলে নামের আদ্যক্ষর (`font-display font-bold text-navy bg-bg-subtle`)
- নাম `font-display font-bold text-base`; verified হলে নামের পাশে info রঙের ✓
- পুরো card clickable (link), ভেতরের button শুধু চোখে পড়ার জন্য
- Tutor এর phone/ঠিকানা card এ কখনো নয় (commission model, Architecture Doc 8.8)

### 6.5 অন্যান্য

| Component | নিয়ম |
| --- | --- |
| Alert | বাম পাশে icon, semantic `*-bg` background + `*` text, `rounded-md p-4`; বন্ধ করা যায় এমন হলে × button |
| Language Toggle | তিন ভাগের pill: `EN · বাং · Mixed`; active টা `bg-orange text-on-orange`, বাকিগুলো `text-fg-secondary`; `role="radiogroup"` |
| Skeleton | `bg-bg-subtle animate-pulse rounded-*`, আসল content এর মাপে |
| Empty state | ছোট illustration/icon + এক লাইন কারণ + একটা action ("Filter কমিয়ে দেখুন") |
| Modal / Bottom sheet | Desktop এ মাঝখানে `rounded-lg shadow-lg`, mobile এ নিচ থেকে sheet; Esc ও বাইরে click এ বন্ধ |
| Toast | নিচে মাঝখানে, ৪ সেকেন্ড, success/error রং |
| Icons | `lucide-react`, 16px (inline) / 20px (button) / 24px (nav), `stroke-width 2` |

---

## 7. UI Patterns

| Pattern | কিভাবে |
| --- | --- |
| **Primary action একটাই** | প্রতিটা screen এ orange primary button একটা; বাকিগুলো outline/ghost |
| **Trust signals** | Verified badge, "NID দিয়ে যাচাই করা", review সংখ্যা — tutor card ও profile এ সবসময় দৃশ্যমান |
| **সৎ promotion** | Featured/Premium tutor উপরে আসলে label দিয়ে দেখানো; লুকিয়ে নয় |
| **Search page** | Desktop: বামে filter sidebar, ডানে result + sort। Mobile: উপরে "Filter (3)" button → bottom sheet, নিচে sticky "Apply"। Filter বদলালে URL query বদলায় (share করা যায়) |
| **Form** | এক column, label উপরে, error নিচে, submit button নিচে পুরো width (mobile)। লম্বা form (tutor registration) ধাপে ভাগ + progress bar |
| **Loading** | List/card এ skeleton; button এ inline spinner; পুরো page spinner এড়ানো |
| **Error** | সমস্যা + কী করবেন ("Internet সংযোগ দেখে আবার চেষ্টা করুন" + Retry button) |
| **Navigation** | Header sticky (`top: env(safe-area-inset-top)`); mobile এ hamburger; dashboard এ mobile নিচে tab bar |
| **Paywall / upsell** | Blur + কারণ + plan এর সুবিধা + একটা CTA; কখনো ভয় দেখিয়ে নয় |
| **তিন ভাষা** | কোনো লেখা component এ hard-code নয়; সব `t("key")`। বাংলা লেখা ইংরেজির চেয়ে ~20–30% লম্বা হয়, layout সেই অনুযায়ী জায়গা রাখে |
| **Background decor** | Hero ও CTA section এ ১–২টা orange circle (`bg-orange/10`), content এর পেছনে |

---

## 8. Code Setup (copy-ready)

### 8.1 Files

```
frontend/src/styles/
├── theme.css        # Tailwind import + সব token (light) + dark override
└── base.css         # body, heading, [lang="bn"] এর base style
```

### 8.2 `theme.css` (Tailwind v4)

Tailwind v4 এ config `tailwind.config.js` এ নয়, CSS এর `@theme` এ। `@theme` এর variable থেকেই `bg-navy`, `text-fg-muted`, `rounded-lg` ইত্যাদি utility তৈরি হয়, আর dark mode এ শুধু variable বদলালেই সব utility বদলে যায়।

```css
@import "tailwindcss";

/* ───────── Light (default) ───────── */
@theme {
  /* Brand */
  --color-navy: #1a2e5e;
  --color-navy-deep: #0f1d3d;
  --color-navy-light: #2a4480;
  --color-orange: #f47920;
  --color-orange-hover: #e06810;
  --color-orange-text: #b44d0c;
  --color-on-orange: #0f1d3d;
  --color-on-navy: #ffffff;
  --color-orange-light: #fef3ea;
  --color-orange-pale: #fff8f2;

  /* Surfaces & text */
  --color-bg: #ffffff;
  --color-bg-subtle: #faf9f7;
  --color-bg-card: #ffffff;
  --color-fg: #1a2e5e;
  --color-fg-secondary: #5a6a8a;
  --color-fg-muted: #647089;
  --color-border: #e8e6e1;
  --color-border-light: #f0eee9;

  /* Semantic */
  --color-success: #15803d;
  --color-success-bg: #f0fdf4;
  --color-warning: #b45309;
  --color-warning-bg: #fffbeb;
  --color-error: #dc2626;
  --color-error-bg: #fef2f2;
  --color-info: #2563eb;
  --color-info-bg: #eff6ff;
  --color-on-error: #ffffff;

  /* Special */
  --color-featured-border: #16a34a;
  --color-featured-bg: #f0fdf4;
  --color-star: #f59e0b;
  --color-badge-pro: #7c3aed;
  --color-badge-premium: #b44d0c;

  /* Fonts */
  --font-display: "Plus Jakarta Sans", "Hind Siliguri", system-ui, sans-serif;
  --font-body: "Hind Siliguri", "Plus Jakarta Sans", system-ui, sans-serif;
  --font-mono: "JetBrains Mono", ui-monospace, monospace;

  /* Radius */
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 14px;
  --radius-xl: 20px;

  /* Shadow */
  --shadow-sm: 0 1px 3px rgb(26 46 94 / 0.06);
  --shadow-card: 0 2px 8px rgb(26 46 94 / 0.06);
  --shadow-md: 0 4px 12px rgb(26 46 94 / 0.08);
  --shadow-lg: 0 8px 30px rgb(26 46 94 / 0.12);
}

/* ───────── Dark ───────── */
:root[data-theme="dark"] {
  color-scheme: dark;

  --color-navy: #c8d4ee;
  --color-navy-deep: #e2e8f4;
  --color-navy-light: #8da0cc;
  --color-orange: #f5923f;
  --color-orange-hover: #f9a85e;
  --color-orange-text: #f5923f;
  --color-on-orange: #0e1117;
  --color-on-navy: #0e1117;
  --color-orange-light: #2a1f14;
  --color-orange-pale: #1e1814;

  --color-bg: #0e1117;
  --color-bg-subtle: #151921;
  --color-bg-card: #1a1f2b;
  --color-fg: #e2e8f4;
  --color-fg-secondary: #9aa5bd;
  --color-fg-muted: #7d8aa8;
  --color-border: #2a3042;
  --color-border-light: #1e2435;

  --color-success: #4ade80;
  --color-success-bg: #0f2418;
  --color-warning: #fbbf24;
  --color-warning-bg: #241e0a;
  --color-error: #f87171;
  --color-error-bg: #240f0f;
  --color-info: #60a5fa;
  --color-info-bg: #0f1a2e;
  --color-on-error: #0e1117;

  --color-featured-border: #4ade80;
  --color-featured-bg: #0f2418;
  --color-star: #fbbf24;
  --color-badge-pro: #a78bfa;
  --color-badge-premium: #f5923f;

  --shadow-sm: 0 1px 3px rgb(0 0 0 / 0.3);
  --shadow-card: 0 2px 8px rgb(0 0 0 / 0.3);
  --shadow-md: 0 4px 12px rgb(0 0 0 / 0.4);
  --shadow-lg: 0 8px 30px rgb(0 0 0 / 0.5);
}
```

### 8.3 `base.css`

```css
@layer base {
  html { background: var(--color-bg); color: var(--color-fg); }
  body { font-family: var(--font-body); line-height: 1.7; -webkit-font-smoothing: antialiased; }
  h1, h2, h3, h4 { font-family: var(--font-display); color: var(--color-fg); letter-spacing: -0.02em; text-wrap: balance; }
  [lang="bn"] body, [lang="bn"] p { line-height: 1.85; }
  :focus-visible { outline: 2px solid var(--color-orange); outline-offset: 2px; }
}
```

### 8.4 `index.html` — fonts + theme (flash ছাড়া)

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link rel="stylesheet"
  href="https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;500;600&family=Plus+Jakarta+Sans:wght@600;700;800&display=swap" />
<script>
  (function () {
    try {
      var t = localStorage.getItem("sylhetytutor_theme") || "system";
      if (t === "system") t = matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
      document.documentElement.dataset.theme = t;
    } catch (e) { document.documentElement.dataset.theme = "light"; }
  })();
</script>
```

`themeStore` (Zustand) একই key তে লেখে, আর `system` এ থাকলে `matchMedia` এর `change` event শুনে `data-theme` বদলায়।

### 8.5 Component Pattern

Variant এর জন্য একটা map, class জোড়া দিতে `clsx` + `tailwind-merge`:

```tsx
// src/components/ui/Button.tsx
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

const variants = {
  primary: "bg-orange text-on-orange hover:bg-orange-hover",
  secondary: "bg-navy text-on-navy hover:bg-navy-light",
  outline: "border-2 border-orange text-orange-text hover:bg-orange-pale",
  ghost: "border border-border text-fg-secondary hover:bg-bg-subtle",
  danger: "bg-error text-on-error hover:opacity-90",
} as const;

const sizes = {
  sm: "min-h-9 px-4 text-xs",
  md: "min-h-11 px-6 text-sm",
  lg: "min-h-13 px-8 text-base",
} as const;

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
  loading?: boolean;
};

export function Button({ variant = "primary", size = "md", loading, className, children, disabled, ...rest }: Props) {
  return (
    <button
      className={twMerge(clsx(
        "inline-flex items-center justify-center gap-2 rounded-md font-display font-semibold transition-colors duration-200",
        "focus-visible:ring-2 focus-visible:ring-orange focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        variants[variant], sizes[size], className,
      ))}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading && <span className="size-4 animate-spin rounded-full border-2 border-current border-r-transparent" aria-hidden />}
      {children}
    </button>
  );
}
```

---

## 9. Do / Don't

| ✅ Do | ❌ Don't |
| --- | --- |
| `bg-orange text-on-orange`, `bg-navy text-on-navy` | `bg-orange text-white`, `bg-navy text-white` |
| `text-orange-text` (link, subject) | `text-orange` লেখায় |
| `text-fg-muted`, `bg-bg-card` (token) | `text-gray-500`, `bg-white`, `#8a95ad` |
| Token বদলে dark mode | `dark:bg-gray-900` |
| `t("search.placeholder")` | `"Search tutors..."` component এ লেখা |
| Flex/grid `gap` | পাশাপাশি element এ `mr-4`, `mb-6` |
| এক screen এ একটা orange primary button | তিনটা orange button পাশাপাশি |
| Error এ icon + লেখা | শুধু লাল border |
| Rating এ star + "4.8 (24)" | শুধু star |
| Mobile 360px আগে test | শুধু desktop এ দেখে merge |
| নতুন রং লাগলে এই file এ token যোগ + PR | Component এ এক জায়গায় নতুন hex |

**PR checklist (UI)**: light + dark screenshot · mobile 360px · তিন ভাষায় লেখা ফিট হয় · keyboard দিয়ে চালানো যায় · কোনো hard-coded রং/লেখা নেই।

---

## 10. Accessibility Fixes vs. Original Design System

আগের Design System artifact থেকে যা বদলানো হয়েছে, আর কেন। Brand এর মূল রং (`#1a2e5e`, `#f47920`) বদলায়নি।

| বিষয় | আগে | এখন | কারণ |
| --- | --- | --- | --- |
| Primary button text | White on `#f47920` | `#0f1d3d` on `#f47920` | White 2.8:1 (পড়া কঠিন); navy 6.0:1 |
| Orange লেখা | `#f47920` | নতুন token `orange-text` `#b44d0c` | 2.8:1 → 5.2:1 |
| `fg-muted` | `#8a95ad` | `#647089` (dark: `#7d8aa8`) | 3.0:1 → 4.7:1 |
| `success` text | `#16a34a` | `#15803d` (border এ পুরোনোটা থাকছে) | Badge এ 3.2:1 → 4.8:1 |
| `warning` text | `#f59e0b` | `#b45309` (star icon এ পুরোনোটা) | সাদায় 2.2:1 → 5.0:1 |
| Display font stack | Plus Jakarta Sans, system-ui | + Hind Siliguri দ্বিতীয় | বাংলা heading system font এ পড়ছিল |
| Dark mode primary button | White on `#f5923f` | `#0e1117` on `#f5923f` | 2.3:1 → 8.2:1 |
| Dark mode navy/danger button | White text | নতুন `on-navy`, `on-error` token | Dark এ navy `#c8d4ee` এর উপর white 1.5:1 |
| Featured badge বর্ণনা | "Green bg + white text" | `success-bg` + `success` text + border | Artifact এর আসল CSS এর সাথে মেলানো |
| ভাষা | "Bilingual, `localStorage('lang')`" | Trilingual EN / BN / Mixed, key `sylhetytutor_lang`, default `mixed` | Architecture Doc 7.5 |
| Tailwind config | `tailwind.config.js` এ hex | Tailwind v4 `@theme` CSS variable | Dark mode ও এক জায়গা থেকে নিয়ন্ত্রণ |

Contrast মান WCAG 2.1 এর relative luminance সূত্রে হিসাব করা। কোনো রং বদলালে [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/) এ আবার যাচাই করুন।
