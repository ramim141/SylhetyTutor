import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  RefreshCw,
  Search as SearchIcon,
  SlidersHorizontal,
} from "lucide-react";
import { useTranslation } from "../i18n";
import { getTutors } from "../api/tutors";
import {
  FILTER_KEYS,
  PAGE_SIZE,
  SORTS,
  applyChange,
  clearFilters,
  countActiveFilters,
  parseFilters,
  toSearchParams,
} from "../utils/searchParams";
import { useLookups } from "../hooks/useLookups";
import { Header } from "../components/layout/Header";
import { BottomNav } from "../components/layout/BottomNav";
import { ActiveFilterChips } from "../components/tutor/ActiveFilterChips";
import { TutorCard } from "../components/tutor/TutorCard";
import { TutorCardSkeleton } from "../components/tutor/TutorCardSkeleton";
import { TutorFilters } from "../components/tutor/TutorFilters";
import { Alert } from "../components/ui/Alert";
import { BottomSheet } from "../components/ui/BottomSheet";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";

const SEARCH_DEBOUNCE_MS = 300;
const GRID = "stagger grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6";

export default function Search() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = useMemo(() => parseFilters(searchParams), [searchParams]);
  const query = toSearchParams(filters).toString();

  const lookups = useLookups();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [draft, setDraft] = useState({});
  const [text, setText] = useState(filters.q ?? "");
  const [state, setState] = useState("loading"); // loading | ready | error
  const [data, setData] = useState({ count: 0, results: [] });
  const [reloadKey, setReloadKey] = useState(0);

  const change = useCallback(
    (patch, { replace = false } = {}) =>
      setSearchParams((current) => toSearchParams(applyChange(parseFilters(current), patch)), {
        replace,
      }),
    [setSearchParams],
  );

  // Search box: wait for a pause in typing, and don't fill the Back history with every word
  useEffect(() => {
    if (text.trim() === (filters.q ?? "")) return undefined;
    const timer = setTimeout(
      () => change({ q: text.trim() }, { replace: true }),
      SEARCH_DEBOUNCE_MS,
    );
    return () => clearTimeout(timer);
  }, [text, filters.q, change]);

  // Back/forward or a shared link changed the query: show it in the box
  useEffect(() => {
    setText(filters.q ?? "");
  }, [filters.q]);

  useEffect(() => {
    const controller = new AbortController();
    setState("loading");
    getTutors(filters, { signal: controller.signal })
      .then((page) => {
        setData({ count: page?.count ?? 0, results: page?.results ?? [] });
        setState("ready");
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        if (err?.response?.status === 404 && filters.page > 1) {
          change({ page: 1 }, { replace: true }); // stale link to a page that no longer exists
          return;
        }
        setState("error");
      });
    return () => controller.abort();
    // `query` is the serialized `filters`, so the request follows the URL exactly
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, reloadKey, change]);

  const page = filters.page ?? 1;
  const totalPages = Math.max(1, Math.ceil(data.count / PAGE_SIZE));
  const activeFilters = countActiveFilters(filters);
  const hasCriteria = activeFilters > 0 || Boolean(filters.q);

  const openSheet = () => {
    setDraft(
      Object.fromEntries(
        FILTER_KEYS.filter((key) => filters[key] !== undefined).map((key) => [key, filters[key]]),
      ),
    );
    setSheetOpen(true);
  };

  // Everything chosen in the sheet lands in the URL at once, as one history entry
  const applyDraft = () => {
    change(Object.fromEntries(FILTER_KEYS.map((key) => [key, draft[key] ?? ""])));
    setSheetOpen(false);
  };

  const goToPage = (next) => {
    change({ page: next });
    document.getElementById("results")?.scrollIntoView?.({ block: "start" });
  };

  return (
    <div className="min-h-dvh bg-bg text-fg pb-28 md:pb-10">
      <Header />

      <main className="max-w-[1200px] mx-auto px-4 md:px-6 py-6 md:py-10 flex flex-col gap-6">
        <div>
          <h1 className="font-display font-extrabold text-3xl tracking-tight">
            {t("search.title")}
          </h1>
          <p className="text-fg-secondary mt-1 max-w-prose">{t("search.subtitle")}</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
          <Input
            className="sm:flex-1"
            type="search"
            label={t("search.label")}
            placeholder={t("search.placeholder")}
            leftIcon={SearchIcon}
            value={text}
            onChange={(e) => setText(e.target.value)}
            autoComplete="off"
          />
          <div className="sm:w-56">
            <label
              htmlFor="sort"
              className="block text-xs font-display font-bold text-fg mb-1 select-none"
            >
              {t("search.sortLabel")}
            </label>
            <select
              id="sort"
              value={filters.sort ?? SORTS[0]}
              onChange={(e) => change({ sort: e.target.value })}
              className="w-full min-h-11 px-3.5 rounded-xl text-base font-body bg-bg-card text-fg border border-border hover:border-fg-muted/40 focus:border-orange focus:ring-3 focus:ring-orange/15 focus:outline-hidden cursor-pointer"
            >
              {SORTS.map((sort) => (
                <option key={sort} value={sort}>
                  {t(`search.sort.${sort}`)}
                </option>
              ))}
            </select>
          </div>
          <Button variant="outline" onClick={openSheet} className="lg:hidden">
            <SlidersHorizontal className="w-5 h-5" aria-hidden />
            {activeFilters > 0 ? `${t("search.filters")} (${activeFilters})` : t("search.filters")}
          </Button>
        </div>

        <ActiveFilterChips
          filters={filters}
          lookups={lookups}
          onRemove={(keys) => change(Object.fromEntries(keys.map((key) => [key, ""])))}
        />

        <div className="lg:grid lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-8 lg:items-start">
          <aside
            aria-label={t("search.filters")}
            className="hidden lg:block sticky top-24 bg-bg-subtle border border-border rounded-lg p-5"
          >
            <h2 className="font-display font-bold text-base mb-4">{t("search.filters")}</h2>
            <TutorFilters values={filters} lookups={lookups} onChange={change} />
            {activeFilters > 0 && (
              <button
                type="button"
                onClick={() => setSearchParams(toSearchParams(clearFilters(filters)))}
                className="mt-4 min-h-11 font-display font-semibold text-orange-text hover:underline cursor-pointer"
              >
                {t("search.clearFilters")}
              </button>
            )}
          </aside>

          <section
            id="results"
            aria-labelledby="results-heading"
            className="scroll-mt-24 flex flex-col gap-5"
          >
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 min-h-6">
              <h2 id="results-heading" aria-live="polite" className="text-sm text-fg-secondary">
                {state === "ready" &&
                  (data.count === 1
                    ? t("search.resultOne")
                    : t("search.resultMany", { count: data.count }))}
              </h2>
            </div>

            {state === "loading" && (
              <div className={GRID} role="status" aria-label={t("home.tutorsLoading")}>
                <TutorCardSkeleton />
                <TutorCardSkeleton />
                <TutorCardSkeleton />
              </div>
            )}

            {state === "error" && (
              <div className="max-w-md mx-auto flex flex-col items-center gap-4 py-8 text-center">
                <Alert variant="error">{t("home.tutorsError")}</Alert>
                <Button variant="outline" onClick={() => setReloadKey((key) => key + 1)}>
                  <RefreshCw className="w-4 h-4" aria-hidden />
                  {t("common.retry")}
                </Button>
              </div>
            )}

            {state === "ready" && data.results.length > 0 && (
              <div className={GRID}>
                {data.results.map((tutor) => (
                  <TutorCard key={tutor.id} {...tutor} />
                ))}
              </div>
            )}

            {state === "ready" && data.results.length === 0 && (
              <div className="max-w-lg mx-auto text-center py-10 px-6 bg-bg-card rounded-lg border border-border flex flex-col items-center gap-3">
                <div className="w-14 h-14 rounded-full bg-orange-light text-orange-text flex items-center justify-center">
                  <GraduationCap className="w-7 h-7" aria-hidden />
                </div>
                <h3 className="font-display font-bold text-lg">{t("search.empty.title")}</h3>
                <p className="text-sm text-fg-secondary max-w-prose">
                  {hasCriteria ? t("search.empty.filtered") : t("search.empty.body")}
                </p>
                {hasCriteria ? (
                  <Button
                    variant="outline"
                    className="mt-2"
                    onClick={() => {
                      setText("");
                      setSearchParams(new URLSearchParams());
                    }}
                  >
                    {t("search.clearFilters")}
                  </Button>
                ) : (
                  <Link to="/register" className="mt-2 inline-flex">
                    <Button variant="outline">{t("home.empty.becomeTutor")}</Button>
                  </Link>
                )}
              </div>
            )}

            {state === "ready" && totalPages > 1 && (
              <nav
                aria-label={t("search.pagination")}
                className="flex items-center justify-between gap-3 pt-2"
              >
                <Button variant="ghost" disabled={page <= 1} onClick={() => goToPage(page - 1)}>
                  <ChevronLeft className="w-4 h-4" aria-hidden />
                  {t("search.prev")}
                </Button>
                <p className="text-sm text-fg-secondary tabular-nums">
                  {t("search.pageOf", { page, total: totalPages })}
                </p>
                <Button
                  variant="ghost"
                  disabled={page >= totalPages}
                  onClick={() => goToPage(page + 1)}
                >
                  {t("search.next")}
                  <ChevronRight className="w-4 h-4" aria-hidden />
                </Button>
              </nav>
            )}
          </section>
        </div>
      </main>

      <BottomSheet
        isOpen={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={t("search.filters")}
        hideAt="lg"
        footer={
          <div className="flex gap-3">
            <Button variant="ghost" onClick={() => setDraft({})}>
              {t("search.clearFilters")}
            </Button>
            <Button className="flex-1" onClick={applyDraft}>
              {t("search.apply")}
            </Button>
          </div>
        }
      >
        <TutorFilters
          values={draft}
          lookups={lookups}
          onChange={(patch) => setDraft((current) => ({ ...current, ...patch }))}
          liveFee
        />
      </BottomSheet>

      <BottomNav />
    </div>
  );
}
