import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  MapPin,
  ShieldCheck,
  ArrowRight,
  Filter,
  GraduationCap,
  Sparkles,
} from "lucide-react";
import { Header } from "../components/layout/Header";
import { BottomNav } from "../components/layout/BottomNav";
import { Button } from "../components/ui/Button";
import { TutorCard } from "../components/tutor/TutorCard";
import { BottomSheet } from "../components/ui/BottomSheet";
import { useTranslation } from "../i18n";
import { useAuthStore } from "../store/authStore";
import { getLookups } from "../api/lookups";
import { getTutors } from "../api/tutors";

const CURRENT_YEAR = new Date().getFullYear();

export default function Home() {
  const navigate = useNavigate();
  const { t, lang } = useTranslation();
  const { status } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedArea, setSelectedArea] = useState("");
  const [activeTab, setActiveTab] = useState("home");
  const [postSheetOpen, setPostSheetOpen] = useState(false);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);

  // Live Backend Data States
  const [lookups, setLookups] = useState({
    areas: [],
    subjects: [],
    class_levels: [],
    universities: [],
  });
  const [tutors, setTutors] = useState([]);
  const [loadingTutors, setLoadingTutors] = useState(true);
  const [loadingLookups, setLoadingLookups] = useState(true);

  // Fetch Lookups on Mount
  useEffect(() => {
    let isMounted = true;
    async function loadLookups() {
      try {
        const data = await getLookups();
        if (isMounted && data) {
          setLookups(data);
        }
      } catch (err) {
        console.warn("Could not load lookups from backend:", err);
      } finally {
        if (isMounted) setLoadingLookups(false);
      }
    }
    loadLookups();
    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch Tutors when search query or selected area changes
  useEffect(() => {
    let isMounted = true;
    async function loadTutors() {
      setLoadingTutors(true);
      try {
        const params = {};
        if (searchQuery) params.search = searchQuery;
        if (selectedArea) params.area = selectedArea;
        const data = await getTutors(params);
        if (isMounted) {
          setTutors(data || []);
        }
      } catch (err) {
        console.warn("Could not load tutors from backend:", err);
        if (isMounted) setTutors([]);
      } finally {
        if (isMounted) setLoadingTutors(false);
      }
    }

    const timer = setTimeout(loadTutors, 200);
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [searchQuery, selectedArea]);

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    if (tabId === "post") {
      setPostSheetOpen(true);
    } else if (tabId === "tutors") {
      document.getElementById("searchInput")?.focus();
    } else if (tabId === "areas") {
      document.getElementById("areasSection")?.scrollIntoView({ behavior: "smooth" });
    } else if (tabId === "account") {
      navigate(status === "authenticated" ? "/dashboard" : "/login");
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    document.getElementById("tutorsListSection")?.scrollIntoView({ behavior: "smooth" });
  };

  const areasList = lookups.areas || [];
  const classLevelsList = lookups.class_levels || [];
  const universitiesList = lookups.universities || [];

  return (
    <div className="min-h-screen bg-bg text-fg flex flex-col font-body transition-colors pb-20 md:pb-0">
      {/* App Top Bar */}
      <Header />

      <main className="flex-1">
        {/* Mobile App Style Hero */}
        <section className="relative overflow-hidden pt-6 pb-12 md:py-24 bg-orange-pale/50 border-b border-border">
          {/* Subtle Ambient Glow */}
          <div className="absolute top-10 left-1/4 w-80 h-80 rounded-full bg-orange/8 blur-3xl pointer-events-none -z-10" />

          <div className="max-w-[1200px] mx-auto px-4 md:px-6">
            {/* Trust Pill */}
            <div className="flex justify-center mb-4">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-bg-card border border-border shadow-xs text-xs font-display font-semibold text-navy">
                <ShieldCheck className="w-3.5 h-3.5 text-info" />
                <span>{t("hero.badge")}</span>
              </div>
            </div>

            {/* Main Headline */}
            <h1 className="text-2xl sm:text-4xl md:text-5xl font-display font-extrabold tracking-tight text-fg text-center max-w-3xl mx-auto leading-tight mb-3 md:mb-5">
              {t("hero.title")}
            </h1>

            {/* Subtitle */}
            <p className="text-sm sm:text-base md:text-lg text-fg-secondary text-center max-w-2xl mx-auto mb-6 md:mb-10 leading-relaxed px-2">
              {t("hero.subtitle")}
            </p>

            {/* App-like Search Bar Card */}
            <div className="max-w-2xl mx-auto bg-bg-card border border-border rounded-2xl p-2.5 sm:p-3 shadow-md mb-5">
              <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
                <div className="flex-1 flex items-center gap-2.5 px-3 py-2 bg-bg-subtle rounded-xl border border-border focus-within:border-orange focus-within:ring-2 focus-within:ring-orange/15 transition-all">
                  <Search className="w-4 h-4 text-fg-muted shrink-0" />
                  <input
                    id="searchInput"
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t("hero.searchPlaceholder")}
                    className="w-full bg-transparent text-sm text-fg placeholder:text-fg-muted focus:outline-hidden"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="text-xs text-fg-muted hover:text-fg px-1"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {/* Filter toggle button on mobile */}
                <button
                  type="button"
                  onClick={() => setFilterSheetOpen(true)}
                  className="md:hidden p-2.5 rounded-xl border border-border bg-bg-subtle text-fg-secondary hover:text-fg active:scale-95 transition-all cursor-pointer"
                  title="Filter"
                  aria-label="Filter"
                >
                  <Filter className="w-4 h-4" />
                </button>

                {/* Primary Action Button */}
                <Button type="submit" variant="primary" size="md" className="shrink-0 px-4 md:px-6">
                  <span className="hidden sm:inline">{t("hero.searchButton")}</span>
                  <Search className="w-4 h-4 sm:hidden" />
                </Button>
              </form>

              {/* Dynamic Horizontal Scroll Area Chips from Django Admin */}
              <div
                id="areasSection"
                className="mt-3 pt-2.5 border-t border-border-light flex items-center gap-1.5 overflow-x-auto scrollbar-none text-xs pb-1"
              >
                <span className="shrink-0 font-semibold text-fg-secondary flex items-center gap-1 pl-1 pr-1.5">
                  <MapPin className="w-3.5 h-3.5 text-orange shrink-0" />
                  <span>সিলেট:</span>
                </span>

                {/* All Areas Filter Button */}
                <button
                  type="button"
                  onClick={() => setSelectedArea("")}
                  className={`shrink-0 px-2.5 py-1 rounded-full border text-xs font-medium cursor-pointer active:scale-95 transition-all ${
                    !selectedArea
                      ? "bg-navy text-on-navy border-navy font-bold shadow-xs"
                      : "bg-bg-subtle text-fg border-border hover:bg-orange-light hover:text-orange-text"
                  }`}
                >
                  সব এলাকা
                </button>

                {loadingLookups ? (
                  <span className="text-xs text-fg-muted px-2">এলাকা লোড হচ্ছে...</span>
                ) : (
                  areasList.map((area) => {
                    const isSelected = selectedArea === area.slug;
                    const areaName = lang === "en" ? area.name_en : area.name_bn;
                    return (
                      <button
                        key={area.id}
                        type="button"
                        onClick={() => setSelectedArea(isSelected ? "" : area.slug)}
                        className={`shrink-0 px-2.5 py-1 rounded-full border text-xs font-medium cursor-pointer active:scale-95 transition-all ${
                          isSelected
                            ? "bg-orange text-on-orange border-orange font-bold shadow-xs"
                            : "bg-bg-subtle text-fg border-border hover:bg-orange-light hover:text-orange-text"
                        }`}
                      >
                        {areaName}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Dynamic Platform Stats from Live Backend Data */}
        <section className="bg-bg py-5 md:py-8 border-b border-border">
          <div className="max-w-[1200px] mx-auto px-4 md:px-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 md:gap-6 text-center">
              <div className="p-3 bg-bg-subtle/50 md:bg-transparent rounded-xl border md:border-0 border-border">
                <p className="font-display font-extrabold text-xl sm:text-3xl text-navy">
                  {tutors.length}
                </p>
                <p className="text-[11px] sm:text-xs text-fg-secondary mt-0.5">
                  {t("stats.verifiedTutors")}
                </p>
              </div>
              <div className="p-3 bg-bg-subtle/50 md:bg-transparent rounded-xl border md:border-0 border-border">
                <p className="font-display font-extrabold text-xl sm:text-3xl text-orange">
                  {areasList.length || 14}
                </p>
                <p className="text-[11px] sm:text-xs text-fg-secondary mt-0.5">
                  {t("stats.sylhetAreas")}
                </p>
              </div>
              <div className="p-3 bg-bg-subtle/50 md:bg-transparent rounded-xl border md:border-0 border-border">
                <p className="font-display font-extrabold text-xl sm:text-3xl text-success">
                  {lookups.subjects?.length || 12}
                </p>
                <p className="text-[11px] sm:text-xs text-fg-secondary mt-0.5">
                  টিউশন বিষয়সমূহ
                </p>
              </div>
              <div className="p-3 bg-bg-subtle/50 md:bg-transparent rounded-xl border md:border-0 border-border">
                <p className="font-display font-extrabold text-xl sm:text-3xl text-navy">
                  {universitiesList.length || 3}
                </p>
                <p className="text-[11px] sm:text-xs text-fg-secondary mt-0.5">
                  ক্যাম্পাস পার্টনার
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Live Tutors Section */}
        <section id="tutorsListSection" className="py-10 md:py-20 bg-bg">
          <div className="max-w-[1200px] mx-auto px-4 md:px-6">
            <div className="flex items-center justify-between mb-6 md:mb-10">
              <div>
                <h2 className="text-xl sm:text-3xl font-display font-bold text-fg">
                  {t("section.featuredTitle")}
                </h2>
                <p className="text-xs sm:text-base text-fg-secondary mt-1">
                  {selectedArea
                    ? `ফিল্টার: ${selectedArea}`
                    : t("section.featuredSubtitle")}
                </p>
              </div>
              {tutors.length > 0 && (
                <Button variant="ghost" size="sm" className="hidden sm:inline-flex gap-1">
                  View All
                  <ArrowRight className="w-4 h-4" />
                </Button>
              )}
            </div>

            {/* Live Tutors State Handler */}
            {loadingTutors ? (
              <div className="text-center py-16">
                <div className="inline-block w-8 h-8 border-3 border-orange border-t-transparent rounded-full animate-spin mb-3" />
                <p className="text-xs text-fg-secondary font-display">
                  টিউটর তালিকা লোড হচ্ছে...
                </p>
              </div>
            ) : tutors.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                {tutors.map((tutor) => (
                  <TutorCard key={tutor.id} {...tutor} />
                ))}
              </div>
            ) : (
              /* Clean Empty State when no tutors added yet from Django admin */
              <div className="text-center py-12 px-6 bg-bg-card rounded-2xl border border-border max-w-lg mx-auto shadow-xs">
                <div className="w-14 h-14 rounded-full bg-orange-light text-orange flex items-center justify-center mx-auto mb-4">
                  <GraduationCap className="w-7 h-7" />
                </div>
                <h3 className="font-display font-bold text-lg text-fg mb-1.5">
                  এখনো কোনো টিউটর যুক্ত হয়নি
                </h3>
                <p className="text-xs sm:text-sm text-fg-secondary mb-6 leading-relaxed">
                  Django Admin থেকে নতুন টিউটর যোগ করুন অথবা সরাসরি রেজিস্ট্রেশন করে সিলেটে টিউশনি শুরু করুন!
                </p>
                <div className="flex flex-col sm:flex-row gap-2.5 justify-center">
                  <Button
                    variant="primary"
                    size="md"
                    onClick={() => {
                      window.location.href = "/register";
                    }}
                  >
                    <Sparkles className="w-4 h-4 mr-1.5" />
                    টিউটর হিসেবে প্রোফাইল তৈরি করুন
                  </Button>
                  <Button
                    variant="outline"
                    size="md"
                    onClick={() => setPostSheetOpen(true)}
                  >
                    টিউশন রিকোয়ারমেন্ট দিন
                  </Button>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* How It Works - Mobile Friendly Cards */}
        <section className="py-12 md:py-16 bg-bg-subtle border-t border-b border-border">
          <div className="max-w-[1200px] mx-auto px-4 md:px-6">
            <div className="text-center max-w-xl mx-auto mb-8 md:mb-12">
              <h2 className="text-xl sm:text-3xl font-display font-bold text-fg">
                {t("section.howItWorksTitle")}
              </h2>
              <p className="text-xs sm:text-sm text-fg-secondary mt-1.5">
                সহজ তিন ধাপে সিলেটে বিশ্বস্ত হোম টিউটর
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-8">
              <div className="bg-bg-card p-5 rounded-xl border border-border shadow-xs flex md:flex-col items-start md:items-center gap-4 md:text-center">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-orange-light text-orange font-display font-extrabold text-base md:text-lg flex items-center justify-center shrink-0">
                  1
                </div>
                <div>
                  <h3 className="font-display font-bold text-base md:text-lg text-fg mb-1">
                    খুঁজুন বা পোস্ট করুন
                  </h3>
                  <p className="text-xs md:text-sm text-fg-secondary leading-relaxed">
                    আপনার এলাকা ও বিষয় দিয়ে সরাসরি সার্চ করুন অথবা চাহিদা জানিয়ে রিকোয়ারমেন্ট পোস্ট করুন।
                  </p>
                </div>
              </div>

              <div className="bg-bg-card p-5 rounded-xl border border-border shadow-xs flex md:flex-col items-start md:items-center gap-4 md:text-center">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-info/10 text-info font-display font-extrabold text-base md:text-lg flex items-center justify-center shrink-0">
                  2
                </div>
                <div>
                  <h3 className="font-display font-bold text-base md:text-lg text-fg mb-1">
                    ভেরিফাইড আইডি যাচাই
                  </h3>
                  <p className="text-xs md:text-sm text-fg-secondary leading-relaxed">
                    SUST ও শীর্ষ ক্যাম্পাসের টিউটরদের ভেরিফাইড আইডি, রেটিং এবং রিভিউ দেখে নিশ্চিন্তে বাছাই করুন।
                  </p>
                </div>
              </div>

              <div className="bg-bg-card p-5 rounded-xl border border-border shadow-xs flex md:flex-col items-start md:items-center gap-4 md:text-center">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-success-bg text-success font-display font-extrabold text-base md:text-lg flex items-center justify-center shrink-0">
                  3
                </div>
                <div>
                  <h3 className="font-display font-bold text-base md:text-lg text-fg mb-1">
                    ফ্রি ট্রায়াল ও ক্লাস শুরু
                  </h3>
                  <p className="text-xs md:text-sm text-fg-secondary leading-relaxed">
                    কথা বলুন এবং প্রয়োজনে ট্রায়াল ক্লাস নিয়ে ১০০% নিশ্চিত হয়ে ক্লাস শুরু করুন।
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Mobile Tutor Registration Banner */}
        <section className="py-12 md:py-16 bg-navy text-on-navy relative overflow-hidden px-4">
          <div className="max-w-[1200px] mx-auto text-center relative z-10">
            <div className="w-12 h-12 rounded-full bg-on-navy/10 flex items-center justify-center mx-auto mb-4">
              <GraduationCap className="w-6 h-6 text-orange" />
            </div>
            <h2 className="text-xl sm:text-3xl font-display font-extrabold text-on-navy mb-2">
              আপনি কি সিলেটে টিউশনি খুঁজছেন?
            </h2>
            <p className="text-xs sm:text-base text-on-navy/80 max-w-md mx-auto mb-6">
              SUST, Metropolitan ও Leading University শিক্ষার্থীদের জন্য ১০০% ফ্রি রেজিস্ট্রেশন।
            </p>
            <Button
              variant="primary"
              size="lg"
              className="w-full sm:w-auto"
              onClick={() => {
                window.location.href = "/register";
              }}
            >
              টিউটর হিসেবে প্রোফাইল খুলুন
            </Button>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-navy-deep text-on-navy/70 py-8 md:py-12 border-t border-border/20 text-xs">
        <div className="max-w-[1200px] mx-auto px-4 md:px-6 flex flex-col md:flex-row justify-between items-center gap-4 text-center md:text-left">
          <div>
            <div className="flex items-center justify-center md:justify-start gap-1 mb-1">
              <span className="font-display font-bold text-lg text-on-navy">Sylhety</span>
              <span className="font-display font-bold text-lg text-orange-text">Tutor</span>
            </div>
            <p className="text-[11px] text-on-navy/60">
              Webnify IT Solution, Sylhet.
            </p>
          </div>
          <div className="flex gap-4 text-on-navy/80">
            <a href="#about" className="hover:text-on-navy transition-colors">আমাদের সম্পর্কে</a>
            <a href="#privacy" className="hover:text-on-navy transition-colors">প্রাইভেসি</a>
            <a href="#terms" className="hover:text-on-navy transition-colors">শর্তাবলী</a>
          </div>
          <p className="text-[10px] text-on-navy/50">
            © {CURRENT_YEAR} SylhetyTutor.
          </p>
        </div>
      </footer>

      {/* Native App-like Bottom Navigation Bar (Mobile only) */}
      <BottomNav activeTab={activeTab} onTabChange={handleTabChange} />

      {/* Post Tuition Bottom Sheet Modal (Mobile App Feel) */}
      <BottomSheet
        isOpen={postSheetOpen}
        onClose={() => setPostSheetOpen(false)}
        title="টিউশন রিকোয়ারমেন্ট পোস্ট করুন"
      >
        <div className="space-y-4">
          <p className="text-xs text-fg-secondary">
            আপনার সন্তানের জন্য প্রয়োজনীয় বিষয় ও এলাকা জানান, আমরা উপযুক্ত টিউটর খুঁজে দেব।
          </p>
          <div>
            <label className="text-xs font-bold text-fg block mb-1">কোন ক্লাসের শিক্ষার্থী?</label>
            <select className="w-full p-2.5 bg-bg-subtle border border-border rounded-lg text-sm text-fg">
              {classLevelsList.map((cl) => (
                <option key={cl.id} value={cl.slug}>
                  {cl.name_en} ({cl.name_bn})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-fg block mb-1">এলাকা (Sylhet Area)</label>
            <select className="w-full p-2.5 bg-bg-subtle border border-border rounded-lg text-sm text-fg">
              {areasList.map((a) => (
                <option key={a.id} value={a.slug}>
                  {a.name_en} ({a.name_bn})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-fg block mb-1">বিষয়সমূহ</label>
            <input
              type="text"
              placeholder="e.g. Math, Physics, English"
              className="w-full p-2.5 bg-bg-subtle border border-border rounded-lg text-sm text-fg placeholder:text-fg-muted"
            />
          </div>
          <Button
            variant="primary"
            className="w-full mt-2"
            onClick={() => {
              alert("রিকোয়ারমেন্ট ড্রাফট সংরক্ষিত হয়েছে!");
              setPostSheetOpen(false);
            }}
          >
            পোস্ট সম্পন্ন করুন (Submit)
          </Button>
        </div>
      </BottomSheet>

      {/* Quick Filter Bottom Sheet Modal */}
      <BottomSheet
        isOpen={filterSheetOpen}
        onClose={() => setFilterSheetOpen(false)}
        title="ফিল্টার করুন (Filters)"
      >
        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold text-fg block mb-1.5">টিউটরের জেন্ডার</label>
            <div className="grid grid-cols-3 gap-2">
              <button type="button" className="p-2 border border-orange bg-orange-light text-orange-text font-bold text-xs rounded-lg">
                যেকোনো
              </button>
              <button type="button" className="p-2 border border-border bg-bg-subtle text-fg text-xs rounded-lg">
                ছাত্র (Male)
              </button>
              <button type="button" className="p-2 border border-border bg-bg-subtle text-fg text-xs rounded-lg">
                ছাত্রী (Female)
              </button>
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-fg block mb-1.5">বিশ্ববিদ্যালয়</label>
            <div className="space-y-1.5 text-xs text-fg">
              {universitiesList.map((uni) => (
                <label key={uni.id} className="flex items-center gap-2">
                  <input type="checkbox" defaultChecked className="rounded accent-orange" />
                  <span>{uni.short_name || uni.name_en} ({uni.name_bn})</span>
                </label>
              ))}
            </div>
          </div>
          <Button
            variant="primary"
            className="w-full"
            onClick={() => setFilterSheetOpen(false)}
          >
            ফিল্টার প্রয়োগ করুন (Apply Filters)
          </Button>
        </div>
      </BottomSheet>
    </div>
  );
}
