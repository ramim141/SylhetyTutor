import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
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
import { useTranslation } from "../i18n";
import { useAuthStore } from "../store/authStore";
import { getLookups } from "../api/lookups";
import { getTutors } from "../api/tutors";

const CURRENT_YEAR = new Date().getFullYear();
const CONTAINER = "max-w-[1200px] mx-auto px-4 md:px-6";

const HOW_IT_WORKS = [
  { n: 1, icon: Search, tone: "bg-orange-light text-orange-text" },
  { n: 2, icon: BadgeCheck, tone: "bg-info-bg text-info" },
  { n: 3, icon: CalendarCheck, tone: "bg-success-bg text-success" },
];

function TutorCardSkeleton() {
  return (
    <div className="rounded-lg border border-border bg-bg-card p-5 flex flex-col gap-4" aria-hidden>
      <div className="flex gap-3.5">
        <div className="w-13 h-13 rounded-full bg-bg-subtle animate-pulse" />
        <div className="flex-1 flex flex-col gap-2 pt-1">
          <div className="h-4 w-2/3 rounded-sm bg-bg-subtle animate-pulse" />
          <div className="h-3.5 w-1/2 rounded-sm bg-bg-subtle animate-pulse" />
          <div className="h-3 w-3/4 rounded-sm bg-bg-subtle animate-pulse" />
        </div>
      </div>
      <div className="h-px bg-border-light" />
      <div className="h-11 rounded-md bg-bg-subtle animate-pulse" />
    </div>
  );
}

function AreaChip({ selected, onClick, children, className = "" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`shrink-0 min-h-10 px-4 rounded-full border text-sm font-medium cursor-pointer active:scale-95 transition ${
        selected
          ? "bg-navy text-on-navy border-navy font-semibold"
          : "bg-bg-card text-fg border-border hover:bg-orange-light hover:text-orange-text"
      } ${className}`}
    >
      {children}
    </button>
  );
}

export default function Home() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t, lang } = useTranslation();
  const { status } = useAuthStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedArea, setSelectedArea] = useState("");
  const [activeTab, setActiveTab] = useState("home");
  const [postSheetOpen, setPostSheetOpen] = useState(false);
  const [areaSheetOpen, setAreaSheetOpen] = useState(false);

  const [lookups, setLookups] = useState({ areas: [], subjects: [], universities: [] });
  const [loadingLookups, setLoadingLookups] = useState(true);
  const [tutors, setTutors] = useState([]);
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
    const timer = setTimeout(async () => {
      try {
        const params = {};
        if (searchQuery.trim()) params.q = searchQuery.trim();
        if (selectedArea) params.area = selectedArea;
        const data = await getTutors(params);
        if (active) {
          setTutors(data?.results ?? []);
          setTutorsState("ready");
        }
      } catch {
        if (active) setTutorsState("error");
      }
    }, 300); // debounce typing
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [searchQuery, selectedArea, reloadKey]);

  const scrollToTutors = (behavior = "smooth") =>
    document.getElementById("tutors")?.scrollIntoView({ behavior, block: "start" });

  const handleTabChange = (tabId, { instant = false } = {}) => {
    setActiveTab(tabId);
    if (tabId === "post") setPostSheetOpen(true);
    else if (tabId === "tutors") {
      scrollToTutors(instant ? "auto" : "smooth");
      document.getElementById("searchInput")?.focus({ preventScroll: true });
    } else if (tabId === "areas") setAreaSheetOpen(true);
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
    setTimeout(() => handleTabChange(tab, { instant: true }), 50);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

  const areas = lookups.areas || [];
  const areaName = (area) => (lang === "en" ? area.name_en : area.name_bn);
  const selectedAreaObj = areas.find((a) => a.slug === selectedArea);

  const stats = [
    tutors.length > 0 && !selectedArea && !searchQuery
      ? { value: tutors.length, label: t("stats.verifiedTutors"), tone: "text-navy" }
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
        <section className="relative overflow-clip bg-orange-pale border-b border-border pt-6 pb-8 md:py-20">
          <div
            className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-orange/10 pointer-events-none"
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

            <div className="max-w-2xl mx-auto mt-6 md:mt-10 bg-bg-card border border-border rounded-xl p-3 shadow-md">
              <form
                role="search"
                onSubmit={(e) => {
                  e.preventDefault();
                  e.currentTarget.querySelector("input")?.blur(); // close the phone keyboard
                  scrollToTutors();
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
                  className="md:hidden relative w-12 h-12 shrink-0 flex items-center justify-center rounded-md border border-border bg-bg-subtle text-fg-secondary active:scale-95 transition"
                  aria-label={t("home.filter")}
                >
                  <SlidersHorizontal className="w-5 h-5" aria-hidden />
                  {selectedArea && (
                    <span className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full bg-orange ring-2 ring-bg-subtle" />
                  )}
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
                  <AreaChip selected={!selectedArea} onClick={() => setSelectedArea("")}>
                    {t("home.allAreas")}
                  </AreaChip>
                  {areas.map((area) => (
                    <AreaChip
                      key={area.id}
                      selected={selectedArea === area.slug}
                      onClick={() => setSelectedArea(selectedArea === area.slug ? "" : area.slug)}
                    >
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
              {selectedAreaObj && (
                <div className="mt-2">
                  <button
                    type="button"
                    onClick={() => setSelectedArea("")}
                    className="inline-flex items-center gap-1.5 min-h-9 pl-3 pr-2 rounded-full bg-orange-light text-orange-text text-sm font-semibold"
                    aria-label={`${t("home.filterActive", { area: areaName(selectedAreaObj) })} — ${t("common.clear")}`}
                  >
                    {t("home.filterActive", { area: areaName(selectedAreaObj) })}
                    <X className="w-4 h-4" aria-hidden />
                  </button>
                </div>
              )}
            </div>

            {tutorsState === "loading" && (
              <div
                className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6"
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
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
                {tutors.map((tutor) => (
                  <TutorCard key={tutor.id} {...tutor} />
                ))}
              </div>
            )}

            {tutorsState === "ready" && tutors.length === 0 && (
              <div className="max-w-lg mx-auto text-center py-10 px-6 bg-bg-card rounded-lg border border-border flex flex-col items-center gap-3">
                <div className="w-14 h-14 rounded-full bg-orange-light text-orange-text flex items-center justify-center">
                  <GraduationCap className="w-7 h-7" aria-hidden />
                </div>
                <h3 className="font-display font-bold text-lg">{t("home.empty.title")}</h3>
                <p className="text-sm text-fg-secondary max-w-prose">
                  {selectedArea || searchQuery ? t("home.empty.filtered") : t("home.empty.body")}
                </p>
                <div className="w-full sm:w-auto flex flex-col sm:flex-row gap-2.5 mt-2">
                  {selectedArea || searchQuery ? (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSelectedArea("");
                        setSearchQuery("");
                      }}
                    >
                      {t("home.empty.showAll")}
                    </Button>
                  ) : (
                    <Link
                      to="/register"
                      className="inline-flex items-center justify-center min-h-11 px-6 rounded-md bg-orange text-on-orange font-display font-semibold text-sm hover:bg-orange-hover transition-colors"
                    >
                      {t("home.empty.becomeTutor")}
                    </Link>
                  )}
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

      {/* Post requirement: honest placeholder until Sprint 4 builds posting */}
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
          <Alert variant="info">
            {status === "authenticated" ? t("post.signedInNote") : t("post.comingSoon")}
          </Alert>
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
              setActiveTab("home");
              scrollToTutors();
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
          <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label={t("home.filterTitle")}>
            {[{ id: "all", slug: "" }, ...areas].map((area) => {
              const selected = selectedArea === area.slug;
              return (
                <button
                  key={area.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setSelectedArea(area.slug)}
                  className={`min-h-12 px-3 rounded-md border text-sm font-medium text-left transition cursor-pointer ${
                    selected
                      ? "border-orange bg-orange-light text-orange-text font-semibold"
                      : "border-border bg-bg-subtle text-fg"
                  }`}
                >
                  {area.slug ? areaName(area) : t("home.allAreas")}
                </button>
              );
            })}
          </div>
          <Button
            size="lg"
            className="w-full"
            onClick={() => {
              setAreaSheetOpen(false);
              setActiveTab("home");
              scrollToTutors();
            }}
          >
            {t("home.filterApply")}
          </Button>
        </div>
      </BottomSheet>
    </div>
  );
}
