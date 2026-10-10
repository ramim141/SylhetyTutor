# SylhetyTutor — Frontend

The modern, mobile-first frontend client for the **SylhetyTutor** platform.

Built with **React 19**, **JavaScript (JSX)**, **Vite 6**, and **Tailwind CSS v4**.

---

## 🚀 Key Features

* **Mobile App-First UI**: Native feel with fixed bottom navigation bar (`BottomNav.jsx`), slide-up bottom sheets (`BottomSheet.jsx`), and touch-friendly horizontal snap-scrolling for Sylhet area chips.
* **Tailwind CSS v4 `@theme` Architecture**: No separate `tailwind.config.js`; all brand color tokens and radii are configured via CSS variables in `src/styles/theme.css`.
* **Zero-Flash Dark / Light Theme**: High-contrast, WCAG AA compliant theme switching with zero layout shifts or theme flashes on page load.
* **Trilingual i18n Engine**: Seamless support for **English**, **বাংলা**, and default **Mixed (Banglish)** mode via reactive Zustand state.
* **Clean Pure JSX**: Lightweight, readable JavaScript without build-time TypeScript compilation friction.

---

## 📁 Folder Structure

```
frontend/
├── public/                  # Static assets & favicons
├── src/
│   ├── assets/              # App images & icons
│   ├── components/
│   │   ├── layout/          # Header, BottomNav, Footer
│   │   ├── tutor/           # TutorCard, TutorFilters
│   │   └── ui/              # Button, Badge, BottomSheet
│   ├── i18n/                # Language dictionaries (en, bn, mixed, index)
│   ├── store/               # Zustand stores (themeStore, languageStore)
│   ├── styles/              # theme.css (@theme tokens), base.css
│   ├── App.jsx              # Main home layout
│   └── main.jsx             # React DOM entry point
├── index.html               # Fonts & zero-flash theme bootstrap
├── package.json
└── vite.config.js
```

---

## 🛠️ Scripts

```bash
# 1. Install dependencies
npm install

# 2. Start development server (with HMR)
npm run dev

# 3. Build for production (outputs to /dist)
npm run build

# 4. Preview production build locally
npm run preview
```

---

## 🎨 Design System

All styling strictly adheres to [`../DESIGN.md`](../DESIGN.md). Always use semantic tokens (`bg-navy`, `bg-orange`, `text-on-orange`, `text-orange-text`) rather than arbitrary hex values.
