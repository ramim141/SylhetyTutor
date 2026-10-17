import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  BadgeCheck,
  CalendarCheck,
  GraduationCap,
  MapPin,
  RefreshCw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { Header } from "../components/layout/Header";
import { BottomNav } from "../components/layout/BottomNav";
import { Alert } from "../components/ui/Alert";
import { Button } from "../components/ui/Button";
import { BottomSheet } from "../components/ui/BottomSheet";
import { TutorCard } from "../components/tutor/TutorCard";
import { TutorCardSkeleton } from "../components/tutor/TutorCardSkeleton";
import { useTranslation } from "../i18n";
import { useAuthStore } from "../store/authStore";
import { getLookups } from "../api/lookups";
import { getTutors } from "../api/tutors";
import { searchPath } from "../utils/searchParams";

const CURRENT_YEAR = new Date().getFullYear();
const CONTAINER = "max-w-[1200px] mx-auto px-4 md:px-6";
const PREVIEW_SIZE = 6; // the home page shows the top tutors; /tutors is the full search

const HOW_IT_WORKS = [
  { n: 1, icon: Search, tone: "bg-orange-light text-orange-text" },
  { n: 2, icon: BadgeCheck, tone: "bg-info-bg text-info" },
  { n: 3, icon: CalendarCheck, tone: "bg-success-bg text-success" },
];

// Choosing an area opens the search page for it (the home page does not filter on its own)
function AreaChip({ to, children }) {
  return (
    <Link
      to={to}
      className="shrink-0 inline-flex items-center min-h-10 px-4 rounded-full border border-border bg-bg-card text-fg text-sm font-medium active:scale-95 transition hover:bg-orange-light hover:text-orange-text"
    >
      {children}
    </Link>
  );
}

export default function Home() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t, lang } = useTranslation();
  const { status, user } = useAuthStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("home");
  const [postSheetOpen, setPostSheetOpen] = useState(false);
  const [areaSheetOpen, setAreaSheetOpen] = useState(false);

  const [lookups, setLookups] = useState({ areas: [], subjects: [], universities: [] });
  const [loadingLookups, setLoadingLookups] = useState(true);
  const [tutors, setTutors] = useState([]);
  const [tutorCount, setTutorCount] = useState(0);
  const [tutorsState, setTutorsState] = useState("loading"); // loading | ready | error
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    getLookups()
      .then((data) => active && data && setLookups(data))
      .catch(() => {}) // chips simply stay hidden; tutors list shows its own error
      .finally(() => active && setLoadingLookups(false));
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    setTutorsState("loading");
    getTutors({ page_size: PREVIEW_SIZE })
      .then((data) => {
        if (!active) return;
        setTutors(data?.results ?? []);
        setTutorCount(data?.count ?? 0);
        setTutorsState("ready");
      })
      .catch(() => active && setTutorsState("error"));
    return () => {
      active = false;
    };
  }, [reloadKey]);

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    if (tabId === "post") {
      if (status === "authenticated" && user?.role === "guardian") navigate("/requirements/new");
      else setPostSheetOpen(true);
    }
    else if (tabId === "tutors") navigate(searchPath());
    else if (tabId === "areas") setAreaSheetOpen(true);
    else if (tabId === "account") navigate(status === "authenticated" ? "/dashboard" : "/login");
    else window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Tabs tapped on other pages (Dashboard's BottomNav) arrive as router state
  useEffect(() => {
    const tab = location.state?.tab;
    if (!tab) return;
    navigate(location.pathname, { replace: true, state: null });
    // Jump (not smooth-scroll) after first paint: content loading in would cancel a smooth
    // scroll. No cleanup on purpose — clearing state above re-runs this effect, and a cleanup
    // would cancel the timer before it fires.
    setTimeout(() => handleTabChange(tab), 50);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

  const areas = lookups.areas || [];
  const areaName = (area) => (lang === "en" ? area.name_en : area.name_bn);

  const stats = [
    tutorCount > 0
      ? { value: tutorCount, label: t("stats.verifiedTutors"), tone: "text-navy" }
      : { value: "100%", label: t("stats.nidVerified"), tone: "text-navy" },
    { value: areas.length || "—", label: t("stats.sylhetAreas"), tone: "text-orange-text" },
    { value: lookups.subjects?.length || "—", label: t("stats.subjects"), tone: "text-success" },
    { value: lookups.universities?.length || "—", label: t("stats.campuses"), tone: "text-navy" },
  ];

  return (
    <div className="min-h-dvh bg-bg text-fg flex flex-col font-body pb-24 md:pb-0">
      <Header />

      <main className="flex-1">
        {/* Hero + search */}
        {/* overflow-clip, not -hidden: a hidden box is still scrollable by the browser, which
            shifted the hero sideways when filters changed (the decor circle overflows) */}
        <section className="relative overflow-clip bg-linear-to-b from-orange-pale to-bg border-b border-border pt-6 pb-8 md:py-20">
          <div
            className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-orange/15 blur-2xl pointer-events-none"
            aria-hidden
          />
          <div
            className="absolute -bottom-24 -left-20 w-72 h-72 rounded-full bg-info/10 blur-3xl pointer-events-none"
            aria-hidden
          />
          <div className={`${CONTAINER} relative`}>
            <div className="flex justify-center mb-4">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-bg-card border border-border text-xs font-display font-semibold text-navy">
                <ShieldCheck className="w-3.5 h-3.5 text-info" aria-hidden />
                {t("hero.badge")}
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl font-display font-extrabold tracking-tight text-center max-w-3xl mx-auto leading-tight">
              {t("hero.title")}
            </h1>
            <p className="text-base md:text-lg text-fg-secondary text-center max-w-prose mx-auto mt-3 md:mt-5">
              {t("hero.subtitle")}
            </p>

            <div className="max-w-2xl mx-auto mt-6 md:mt-10 bg-bg-card border border-border rounded-xl p-3 shadow-lg">
              <form
                role="search"
                onSubmit={(e) => {
                  e.preventDefault();
                  e.currentTarget.querySelector("input")?.blur(); // close the phone keyboard
                  navigate(searchPath({ q: searchQuery.trim() }));
                }}
                className="flex items-center gap-2"
              >
                <label className="flex-1 min-w-0 flex items-center gap-2 min-h-12 px-3 bg-bg-subtle rounded-md border border-border focus-within:border-orange focus-within:ring-3 focus-within:ring-orange/15 transition">
                  <Search className="w-5 h-5 text-fg-muted shrink-0" aria-hidden />
                  <span className="sr-only">{t("hero.searchButton")}</span>
                  <input
                    id="searchInput"
                    type="search"
                    enterKeyHint="search"
                    autoComplete="off"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t("hero.searchPlaceholder")}
                    className="w-full min-w-0 bg-transparent text-base text-fg placeholder:text-fg-muted focus:outline-hidden [&::-webkit-search-cancel-button]:hidden"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="w-8 h-8 -mr-1 flex items-center justify-center rounded-full text-fg-muted hover:text-fg"
                      aria-label={t("common.clear")}
                    >
                      <X className="w-4 h-4" aria-hidden />
                    </button>
                  )}
                </label>

                <button
                  type="button"
                  onClick={() => setAreaSheetOpen(true)}
                  className="md:hidden w-12 h-12 shrink-0 flex items-center justify-center rounded-md border border-border bg-bg-subtle text-fg-secondary active:scale-95 transition"
                  aria-label={t("home.filter")}
                >
                  <SlidersHorizontal className="w-5 h-5" aria-hidden />
                </button>

                <Button type="submit" className="hidden md:inline-flex shrink-0 min-h-12">
                  {t("hero.searchButton")}
                </Button>
              </form>

              {/* Area chips: swipe on phones; the filter sheet shows all areas at once */}
              {!loadingLookups && areas.length > 0 && (
                <div className="mt-3 pt-3 border-t border-border-light flex items-center gap-2 overflow-x-auto scroll-px-3 scrollbar-none -mx-3 px-3">
                  <span className="shrink-0 flex items-center gap-1 text-sm font-semibold text-fg-secondary">
                    <MapPin className="w-4 h-4 text-orange" aria-hidden />
                    {t("home.sylhet")}
                  </span>
                  <AreaChip to={searchPath()}>{t("home.allAreas")}</AreaChip>
                  {areas.map((area) => (
                    <AreaChip key={area.id} to={searchPath({ area: area.slug })}>
                      {areaName(area)}
                    </AreaChip>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="py-6 md:py-10 border-b border-border">
          <dl className={`${CONTAINER} grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-6 text-center`}>
            {stats.map((s) => (
              <div key={s.label} className="p-3 rounded-lg bg-bg-subtle md:bg-transparent">
                <dd className={`font-display font-extrabold text-2xl sm:text-3xl tabular-nums ${s.tone}`}>
                  {s.value}
                </dd>
                <dt className="text-xs text-fg-secondary mt-0.5">{s.label}</dt>
              </div>
            ))}
          </dl>
        </section>

        {/* Tutors */}
        <section id="tutors" className="py-10 md:py-16 scroll-mt-16">
          <div className={CONTAINER}>
            <div className="flex flex-col gap-1 mb-5 md:mb-8">
              <h2 className="text-2xl sm:text-3xl font-display font-bold">{t("section.featuredTitle")}</h2>
              <p className="text-sm sm:text-base text-fg-secondary">{t("section.featuredSubtitle")}</p>
            </div>

            {tutorsState === "loading" && (
              <div
                className="stagger grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6"
                role="status"
                aria-label={t("home.tutorsLoading")}
              >
                <TutorCardSkeleton />
                <TutorCardSkeleton />
                <TutorCardSkeleton />
              </div>
            )}

            {tutorsState === "error" && (
              <div className="max-w-md mx-auto flex flex-col items-center gap-4 py-8 text-center">
                <Alert variant="error">{t("home.tutorsError")}</Alert>
                <Button variant="outline" onClick={() => setReloadKey((k) => k + 1)}>
                  <RefreshCw className="w-4 h-4" aria-hidden />
                  {t("common.retry")}
                </Button>
              </div>
            )}

            {tutorsState === "ready" && tutors.length > 0 && (
              <div className="stagger grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
                {tutors.map((tutor) => (
                  <TutorCard key={tutor.id} {...tutor} />
                ))}
              </div>
            )}

            {tutorsState === "ready" && tutors.length > 0 && (
              <div className="mt-8 flex justify-center">
                <Link
                  to={searchPath()}
                  className="inline-flex items-center justify-center gap-2 min-h-12 px-8 rounded-md border-2 border-orange text-orange-text font-display font-semibold hover:bg-orange-pale transition-colors"
                >
                  {t("home.viewAll")}
                  <ArrowRight className="w-4 h-4" aria-hidden />
                </Link>
              </div>
            )}

            {tutorsState === "ready" && tutors.length === 0 && (
              <div className="max-w-lg mx-auto text-center py-10 px-6 bg-bg-card rounded-lg border border-border flex flex-col items-center gap-3">
                <div className="w-14 h-14 rounded-full bg-orange-light text-orange-text flex items-center justify-center">
                  <GraduationCap className="w-7 h-7" aria-hidden />
                </div>
                <h3 className="font-display font-bold text-lg">{t("home.empty.title")}</h3>
                <p className="text-sm text-fg-secondary max-w-prose">
                  {t("home.empty.body")}
                </p>
                <div className="w-full sm:w-auto flex flex-col sm:flex-row gap-2.5 mt-2">
                  <Link
                    to="/register"
                    className="inline-flex items-center justify-center min-h-11 px-6 rounded-md bg-orange text-on-orange font-display font-semibold text-sm hover:bg-orange-hover transition-colors"
                  >
                    {t("home.empty.becomeTutor")}
                  </Link>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* How it works */}
        <section className="py-12 md:py-16 bg-bg-subtle border-y border-border">
          <div className={CONTAINER}>
            <div className="text-center max-w-xl mx-auto mb-8 md:mb-12">
              <h2 className="text-2xl sm:text-3xl font-display font-bold">{t("section.howItWorksTitle")}</h2>
              <p className="text-sm text-fg-secondary mt-1.5">{t("howItWorks.subtitle")}</p>
            </div>
            <ol className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-8">
              {HOW_IT_WORKS.map(({ n, icon: Icon, tone }) => (
                <li
                  key={n}
                  className="bg-bg-card p-5 rounded-lg border border-border flex md:flex-col items-start md:items-center gap-4 md:text-center"
                >
                  <div className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 ${tone}`}>
                    <Icon className="w-5 h-5" aria-hidden />
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-base md:text-lg mb-1">
                      {t(`howItWorks.step${n}.title`)}
                    </h3>
                    <p className="text-sm text-fg-secondary">{t(`howItWorks.step${n}.body`)}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Tutor recruitment */}
        <section className="py-12 md:py-16 bg-navy text-on-navy">
          <div className={`${CONTAINER} text-center flex flex-col items-center gap-3`}>
            <GraduationCap className="w-8 h-8 text-orange" aria-hidden />
            <h2 className="text-2xl sm:text-3xl font-display font-extrabold text-on-navy">{t("banner.title")}</h2>
            <p className="text-sm sm:text-base opacity-85 max-w-md">{t("banner.body")}</p>
            <Link
              to="/register"
              className="mt-2 w-full sm:w-auto inline-flex items-center justify-center min-h-13 px-8 rounded-md bg-orange text-on-orange font-display font-semibold hover:bg-orange-hover transition-colors"
            >
              {t("banner.cta")}
            </Link>
          </div>
        </section>
      </main>

      <footer className="bg-navy-deep text-on-navy py-8 md:py-12 text-sm">
        <div className={`${CONTAINER} flex flex-col md:flex-row justify-between items-center gap-4 text-center md:text-left`}>
          <div>
            <p className="font-display font-bold text-lg">
              Sylhety<span className="text-orange">Tutor</span>
            </p>
            <p className="text-xs opacity-75">Webnify IT Solution, Sylhet</p>
          </div>
          <nav className="flex gap-1">
            {["about", "privacy", "terms"].map((key) => (
              <a
                key={key}
                href={`#${key}`}
                className="min-h-11 px-3 inline-flex items-center opacity-85 hover:opacity-100 hover:underline"
              >
                {t(`footer.${key}`)}
              </a>
            ))}
          </nav>
          <p className="text-xs opacity-60">© {CURRENT_YEAR} SylhetyTutor</p>
        </div>
      </footer>

      <BottomNav activeTab={activeTab} onTabChange={handleTabChange} />

      {/* Post requirement: guardians go straight to the form; everyone else is told what to do */}
      <BottomSheet
        isOpen={postSheetOpen}
        onClose={() => {
          setPostSheetOpen(false);
          setActiveTab("home");
        }}
        title={t("post.title")}
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-fg-secondary">{t("post.body")}</p>
          {status === "authenticated" && user?.role === "guardian" ? (
            <Link
              to="/requirements/new"
              className="inline-flex items-center justify-center min-h-13 px-8 rounded-md bg-orange text-on-orange font-display font-semibold hover:bg-orange-hover transition-colors"
            >
              {t("post.startCta")}
            </Link>
          ) : (
            <Alert variant="info">
              {status === "authenticated" ? t("post.signedInNote") : t("post.comingSoon")}
            </Alert>
          )}
          {status !== "authenticated" && (
            <Link
              to="/register"
              className="inline-flex items-center justify-center min-h-13 px-8 rounded-md bg-orange text-on-orange font-display font-semibold hover:bg-orange-hover transition-colors"
            >
              {t("post.registerCta")}
            </Link>
          )}
          <Button
            variant="ghost"
            size="lg"
            onClick={() => {
              setPostSheetOpen(false);
              navigate(searchPath());
            }}
          >
            {t("post.browseCta")}
          </Button>
        </div>
      </BottomSheet>

      {/* Area filter: every area visible at once (chips row scrolls on phones) */}
      <BottomSheet
        isOpen={areaSheetOpen}
        onClose={() => {
          setAreaSheetOpen(false);
          setActiveTab("home");
        }}
        title={t("home.filterTitle")}
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-fg-secondary">{t("home.filterHint")}</p>
          <div className="grid grid-cols-2 gap-2">
            {[{ id: "all", slug: "" }, ...areas].map((area) => (
              <Link
                key={area.id}
                to={searchPath(area.slug ? { area: area.slug } : {})}
                className="min-h-12 px-3 inline-flex items-center rounded-md border border-border bg-bg-subtle text-fg text-sm font-medium hover:border-orange hover:bg-orange-light hover:text-orange-text transition"
              >
                {area.slug ? areaName(area) : t("home.allAreas")}
              </Link>
            ))}
          </div>
        </div>
      </BottomSheet>
    </div>
  );
}
