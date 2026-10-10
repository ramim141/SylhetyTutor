import React, { useState } from "react";
import {
  Search,
  MapPin,
  ShieldCheck,
  ArrowRight,
  Filter,
  GraduationCap,
} from "lucide-react";
import { Header } from "../components/layout/Header";
import { BottomNav } from "../components/layout/BottomNav";
import { Button } from "../components/ui/Button";
import { TutorCard } from "../components/tutor/TutorCard";
import { BottomSheet } from "../components/ui/BottomSheet";
import { useTranslation } from "../i18n";

const SAMPLE_TUTORS = [
  {
    id: "1",
    name: "Rahim Uddin",
    initials: "RU",
    university: "SUST (CSE, 3rd Year)",
    department: "Computer Science & Engineering",
    area: "Amberkhana",
    subjects: ["Physics", "Higher Math", "ICT"],
    classes: ["SSC 9–10", "HSC 11–12"],
    rating: 4.9,
    reviewCount: 28,
    feeMin: 5000,
    feeMax: 7000,
    isFeatured: true,
    isVerified: true,
  },
  {
    id: "2",
    name: "Tanjina Akter",
    initials: "TA",
    university: "Metropolitan University (English)",
    department: "English",
    area: "Zindabazar",
    subjects: ["English", "Bangla", "General Science"],
    classes: ["Class 6–8", "SSC 9–10"],
    rating: 4.8,
    reviewCount: 19,
    feeMin: 4000,
    feeMax: 6000,
    isFeatured: true,
    isVerified: true,
  },
  {
    id: "3",
    name: "Sayeed Chowdhury",
    initials: "SC",
    university: "Leading University (EEE)",
    department: "Electrical & Electronic Eng.",
    area: "Akhalia",
    subjects: ["Math", "Physics", "Chemistry"],
    classes: ["Class 6–8", "SSC 9–10"],
    rating: 4.7,
    reviewCount: 14,
    feeMin: 4500,
    feeMax: 6500,
    isFeatured: false,
    isVerified: true,
  },
  {
    id: "4",
    name: "Fariha Jannat",
    initials: "FJ",
    university: "SUST (Chemistry)",
    department: "Chemistry",
    area: "Shibganj",
    subjects: ["Chemistry", "Biology", "General Science"],
    classes: ["SSC 9–10", "HSC 11–12"],
    rating: 5.0,
    reviewCount: 22,
    feeMin: 5500,
    feeMax: 8000,
    isFeatured: false,
    isVerified: true,
  },
];

const POPULAR_AREAS = [
  "Amberkhana",
  "Akhalia",
  "Zindabazar",
  "Shibganj",
  "Subidbazar",
  "Uposhohor",
  "Tilagarh",
  "Pathantula",
  "Lamabazar",
  "Modina Market",
];

export default function Home() {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("home");
  const [postSheetOpen, setPostSheetOpen] = useState(false);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    if (tabId === "post") {
      setPostSheetOpen(true);
    } else if (tabId === "tutors") {
      document.getElementById("searchInput")?.focus();
    } else if (tabId === "areas") {
      document.getElementById("areasSection")?.scrollIntoView({ behavior: "smooth" });
    }
  };

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
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  alert(`Searching for: ${searchQuery || "All Tutors"}`);
                }}
                className="flex items-center gap-2"
              >
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
                </div>

                {/* Filter toggle button on mobile */}
                <button
                  type="button"
                  onClick={() => setFilterSheetOpen(true)}
                  className="md:hidden p-2.5 rounded-xl border border-border bg-bg-subtle text-fg-secondary hover:text-fg active:scale-95 transition-all cursor-pointer"
                  title="Filter"
                >
                  <Filter className="w-4 h-4" />
                </button>

                {/* Primary Action Button */}
                <Button type="submit" variant="primary" size="md" className="shrink-0 px-4 md:px-6">
                  <span className="hidden sm:inline">{t("hero.searchButton")}</span>
                  <Search className="w-4 h-4 sm:hidden" />
                </Button>
              </form>

              {/* Horizontal Scroll Area Chips on Mobile (App-like snap scroll) */}
              <div
                id="areasSection"
                className="mt-3 pt-2.5 border-t border-border-light flex items-center gap-1.5 overflow-x-auto scrollbar-none text-xs pb-1"
              >
                <span className="shrink-0 font-semibold text-fg-secondary flex items-center gap-1 pl-1 pr-1.5">
                  <MapPin className="w-3.5 h-3.5 text-orange shrink-0" />
                  <span>সিলেট:</span>
                </span>
                {POPULAR_AREAS.map((area) => (
                  <button
                    key={area}
                    type="button"
                    onClick={() => setSearchQuery(area)}
                    className={`shrink-0 px-2.5 py-1 rounded-full border text-xs font-medium cursor-pointer active:scale-95 transition-all ${
                      searchQuery === area
                        ? "bg-orange text-on-orange border-orange font-bold shadow-xs"
                        : "bg-bg-subtle text-fg border-border hover:bg-orange-light hover:text-orange-text"
                    }`}
                  >
                    {area}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Quick Stats Strip */}
        <section className="bg-bg py-5 md:py-8 border-b border-border">
          <div className="max-w-[1200px] mx-auto px-4 md:px-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 md:gap-6 text-center">
              <div className="p-3 bg-bg-subtle/50 md:bg-transparent rounded-xl border md:border-0 border-border">
                <p className="font-display font-extrabold text-xl sm:text-3xl text-navy">
                  150+
                </p>
                <p className="text-[11px] sm:text-xs text-fg-secondary mt-0.5">
                  {t("stats.verifiedTutors")}
                </p>
              </div>
              <div className="p-3 bg-bg-subtle/50 md:bg-transparent rounded-xl border md:border-0 border-border">
                <p className="font-display font-extrabold text-xl sm:text-3xl text-orange">
                  320+
                </p>
                <p className="text-[11px] sm:text-xs text-fg-secondary mt-0.5">
                  {t("stats.successfulMatches")}
                </p>
              </div>
              <div className="p-3 bg-bg-subtle/50 md:bg-transparent rounded-xl border md:border-0 border-border">
                <p className="font-display font-extrabold text-xl sm:text-3xl text-success">
                  98.5%
                </p>
                <p className="text-[11px] sm:text-xs text-fg-secondary mt-0.5">
                  {t("stats.satisfactionRate")}
                </p>
              </div>
              <div className="p-3 bg-bg-subtle/50 md:bg-transparent rounded-xl border md:border-0 border-border">
                <p className="font-display font-extrabold text-xl sm:text-3xl text-navy">
                  14
                </p>
                <p className="text-[11px] sm:text-xs text-fg-secondary mt-0.5">
                  {t("stats.sylhetAreas")}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Featured Tutors Section */}
        <section className="py-10 md:py-20 bg-bg">
          <div className="max-w-[1200px] mx-auto px-4 md:px-6">
            <div className="flex items-center justify-between mb-6 md:mb-10">
              <div>
                <h2 className="text-xl sm:text-3xl font-display font-bold text-fg">
                  {t("section.featuredTitle")}
                </h2>
                <p className="text-xs sm:text-base text-fg-secondary mt-1">
                  {t("section.featuredSubtitle")}
                </p>
              </div>
              <Button variant="ghost" size="sm" className="hidden sm:inline-flex gap-1">
                View All
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>

            {/* Grid of Tutor Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
              {SAMPLE_TUTORS.map((tutor) => (
                <TutorCard key={tutor.id} {...tutor} />
              ))}
            </div>

            <div className="mt-6 text-center sm:hidden">
              <Button variant="outline" className="w-full">
                আরও টিউটর দেখুন (View All)
              </Button>
            </div>
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
                    এনআইডি ও বিশ্ববিদ্যালয় আইডি যাচাইকৃত টিউটরদের রেটিং ও বিভাগ দেখে শর্টলিস্ট করুন।
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
            <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-4">
              <GraduationCap className="w-6 h-6 text-orange" />
            </div>
            <h2 className="text-xl sm:text-3xl font-display font-extrabold text-white mb-2">
              আপনি কি সিলেটে টিউশনি খুঁজছেন?
            </h2>
            <p className="text-xs sm:text-base text-gray-300 max-w-md mx-auto mb-6">
              SUST, Metropolitan ও Leading University শিক্ষার্থীদের জন্য ১০০% ফ্রি রেজিস্ট্রেশন।
            </p>
            <Button variant="primary" size="lg" className="w-full sm:w-auto">
              টিউটর হিসেবে প্রোফাইল খুলুন
            </Button>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-navy-deep text-gray-400 py-8 md:py-12 border-t border-border/20 text-xs">
        <div className="max-w-[1200px] mx-auto px-4 md:px-6 flex flex-col md:flex-row justify-between items-center gap-4 text-center md:text-left">
          <div>
            <div className="flex items-center justify-center md:justify-start gap-1 mb-1">
              <span className="font-display font-bold text-lg text-white">Sylhety</span>
              <span className="font-display font-bold text-lg text-orange">Tutor</span>
            </div>
            <p className="text-[11px] text-gray-400">
              Webnify IT Solution, Sylhet.
            </p>
          </div>
          <div className="flex gap-4 text-gray-300">
            <a href="#about" className="hover:text-white">আমাদের সম্পর্কে</a>
            <a href="#privacy" className="hover:text-white">প্রাইভেসি</a>
            <a href="#terms" className="hover:text-white">শর্তাবলী</a>
          </div>
          <p className="text-[10px] text-gray-500">
            © {new Date().getFullYear()} SylhetyTutor.
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
              <option>Class 1–5</option>
              <option>Class 6–8</option>
              <option>SSC 9–10</option>
              <option>HSC 11–12</option>
              <option>English Medium</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-fg block mb-1">এলাকা (Sylhet Area)</label>
            <select className="w-full p-2.5 bg-bg-subtle border border-border rounded-lg text-sm text-fg">
              {POPULAR_AREAS.map((a) => (
                <option key={a}>{a}</option>
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
              <label className="flex items-center gap-2">
                <input type="checkbox" defaultChecked className="rounded accent-orange" />
                <span>SUST (শাহজালাল বিজ্ঞান ও প্রযুক্তি বিশ্ববিদ্যালয়)</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" defaultChecked className="rounded accent-orange" />
                <span>Metropolitan University</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" defaultChecked className="rounded accent-orange" />
                <span>Leading University</span>
              </label>
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
