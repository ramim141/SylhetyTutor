import React, { useState } from "react";
import { Search, MapPin, ShieldCheck, ArrowRight } from "lucide-react";
import { Header } from "./components/layout/Header";
import { Button } from "./components/ui/Button";
import { TutorCard } from "./components/tutor/TutorCard";
import { useTranslation } from "./i18n";

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
];

export default function App() {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div className="min-h-screen bg-bg text-fg flex flex-col font-body transition-colors">
      <Header />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden pt-12 pb-20 md:py-24 bg-orange-pale/50 border-b border-border">
          <div className="absolute top-10 left-1/4 w-96 h-96 rounded-full bg-orange/8 blur-3xl pointer-events-none -z-10" />
          <div className="absolute -bottom-10 right-10 w-80 h-80 rounded-full bg-orange/6 blur-2xl pointer-events-none -z-10" />

          <div className="max-w-[1200px] mx-auto px-4 md:px-6 text-center">
            {/* Trust Pill */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-bg-card border border-border shadow-xs text-xs font-display font-semibold text-navy mb-6">
              <ShieldCheck className="w-4 h-4 text-info" />
              <span>{t("hero.badge")}</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-display font-extrabold tracking-tight text-fg max-w-3xl mx-auto leading-tight mb-5">
              {t("hero.title")}
            </h1>

            {/* Subtitle */}
            <p className="text-base sm:text-lg text-fg-secondary max-w-2xl mx-auto mb-10 leading-relaxed">
              {t("hero.subtitle")}
            </p>

            {/* Search Box Card */}
            <div className="max-w-3xl mx-auto bg-bg-card border border-border rounded-xl p-3 sm:p-4 shadow-lg mb-6">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  alert(`Searching for: ${searchQuery}`);
                }}
                className="flex flex-col sm:flex-row gap-3"
              >
                <div className="flex-1 flex items-center gap-3 px-3 py-2 bg-bg-subtle rounded-md border border-border focus-within:border-orange focus-within:ring-2 focus-within:ring-orange/15 transition-all">
                  <Search className="w-5 h-5 text-fg-muted shrink-0" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t("hero.searchPlaceholder")}
                    className="w-full bg-transparent text-sm sm:text-base text-fg placeholder:text-fg-muted focus:outline-hidden"
                  />
                </div>

                <Button type="submit" variant="primary" size="md" className="shrink-0">
                  <Search className="w-4 h-4" />
                  {t("hero.searchButton")}
                </Button>
              </form>

              {/* Popular Area Quick Filter Chips */}
              <div className="flex items-center gap-2 mt-4 pt-3 border-t border-border-light flex-wrap text-xs text-fg-muted">
                <span className="font-semibold text-fg-secondary flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-orange" />
                  {t("hero.popularAreas")}
                </span>
                {POPULAR_AREAS.map((area) => (
                  <button
                    key={area}
                    type="button"
                    onClick={() => setSearchQuery(area)}
                    className="px-2.5 py-1 rounded-full bg-bg-subtle hover:bg-orange-light hover:text-orange-text border border-border transition-colors cursor-pointer"
                  >
                    {area}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Quick Trust Statistics Counter */}
        <section className="bg-bg py-8 border-b border-border">
          <div className="max-w-[1200px] mx-auto px-4 md:px-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
              <div>
                <p className="font-display font-extrabold text-2xl sm:text-3xl text-navy">
                  150+
                </p>
                <p className="text-xs sm:text-sm text-fg-secondary mt-1">
                  {t("stats.verifiedTutors")}
                </p>
              </div>
              <div>
                <p className="font-display font-extrabold text-2xl sm:text-3xl text-orange">
                  320+
                </p>
                <p className="text-xs sm:text-sm text-fg-secondary mt-1">
                  {t("stats.successfulMatches")}
                </p>
              </div>
              <div>
                <p className="font-display font-extrabold text-2xl sm:text-3xl text-success">
                  98.5%
                </p>
                <p className="text-xs sm:text-sm text-fg-secondary mt-1">
                  {t("stats.satisfactionRate")}
                </p>
              </div>
              <div>
                <p className="font-display font-extrabold text-2xl sm:text-3xl text-navy">
                  14
                </p>
                <p className="text-xs sm:text-sm text-fg-secondary mt-1">
                  {t("stats.sylhetAreas")}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Featured Tutors Section */}
        <section className="py-16 md:py-20 bg-bg">
          <div className="max-w-[1200px] mx-auto px-4 md:px-6">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
              <div>
                <h2 className="text-2xl sm:text-3xl font-display font-bold text-fg">
                  {t("section.featuredTitle")}
                </h2>
                <p className="text-sm sm:text-base text-fg-secondary mt-1.5">
                  {t("section.featuredSubtitle")}
                </p>
              </div>
              <Button variant="ghost" size="sm" className="self-start md:self-auto gap-1">
                View All Tutors
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>

            {/* Grid of Tutor Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {SAMPLE_TUTORS.map((tutor) => (
                <TutorCard key={tutor.id} {...tutor} />
              ))}
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="py-16 bg-bg-subtle border-t border-b border-border">
          <div className="max-w-[1200px] mx-auto px-4 md:px-6">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <h2 className="text-2xl sm:text-3xl font-display font-bold text-fg">
                {t("section.howItWorksTitle")}
              </h2>
              <p className="text-sm text-fg-secondary mt-2">
                নিরাপদ ও সহজ তিন ধাপে আপনার আদর্শ টিউটর খুঁজে নিন
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-bg-card p-6 rounded-xl border border-border shadow-xs text-center">
                <div className="w-12 h-12 rounded-full bg-orange-light text-orange font-display font-extrabold text-lg flex items-center justify-center mx-auto mb-4">
                  1
                </div>
                <h3 className="font-display font-bold text-lg text-fg mb-2">
                  খুঁজুন বা পোস্ট করুন
                </h3>
                <p className="text-sm text-fg-secondary leading-relaxed">
                  আপনার এলাকা, বিষয় ও ক্লাস নির্বাচন করে টিউটর খুঁজুন অথবা আপনার চাহিদা জানিয়ে টিউশন পোস্ট করুন।
                </p>
              </div>

              <div className="bg-bg-card p-6 rounded-xl border border-border shadow-xs text-center">
                <div className="w-12 h-12 rounded-full bg-info/10 text-info font-display font-extrabold text-lg flex items-center justify-center mx-auto mb-4">
                  2
                </div>
                <h3 className="font-display font-bold text-lg text-fg mb-2">
                  ভেরিফাইড প্রোফাইল যাচাই
                </h3>
                <p className="text-sm text-fg-secondary leading-relaxed">
                  এনআইডি ও বিশ্ববিদ্যালয় আইডি যাচাইকৃত টিউটরদের অভিজ্ঞতা, রেটিং এবং রিভিউ দেখে শর্টলিস্ট করুন।
                </p>
              </div>

              <div className="bg-bg-card p-6 rounded-xl border border-border shadow-xs text-center">
                <div className="w-12 h-12 rounded-full bg-success-bg text-success font-display font-extrabold text-lg flex items-center justify-center mx-auto mb-4">
                  3
                </div>
                <h3 className="font-display font-bold text-lg text-fg mb-2">
                  ফ্রি ট্রায়াল ও ক্লাস শুরু
                </h3>
                <p className="text-sm text-fg-secondary leading-relaxed">
                  সরাসরি কথা বলুন এবং প্রয়োজনে ট্রায়াল ক্লাসের মাধ্যমে সন্তুষ্ট হয়ে সন্তানকে নিরাপদে পড়ানো শুরু করুন।
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Banner */}
        <section className="py-16 bg-navy text-on-navy relative overflow-hidden">
          <div className="max-w-[1200px] mx-auto px-4 md:px-6 text-center relative z-10">
            <h2 className="text-2xl sm:text-4xl font-display font-extrabold text-white mb-4">
              আপনি কি একজন বিশ্ববিদ্যালয় শিক্ষার্থী?
            </h2>
            <p className="text-base text-gray-300 max-w-xl mx-auto mb-8">
              সিলেটে আপনার সুবিধাজনক এলাকায় পড়িয়ে প্রতি মাসে সম্মানজনক আয় করুন। কোনো রেজিস্ট্রেশন ফি নেই।
            </p>
            <Button variant="primary" size="lg">
              টিউটর হিসেবে আজই যুক্ত হন
            </Button>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-navy-deep text-gray-400 py-12 border-t border-border/20 text-sm">
        <div className="max-w-[1200px] mx-auto px-4 md:px-6 flex flex-col md:flex-row justify-between items-center gap-6 text-center md:text-left">
          <div>
            <div className="flex items-center justify-center md:justify-start gap-1 mb-2">
              <span className="font-display font-bold text-xl text-white">Sylhety</span>
              <span className="font-display font-bold text-xl text-orange">Tutor</span>
            </div>
            <p className="text-xs text-gray-400">
              A community initiative by Webnify IT Solution, Sylhet.
            </p>
          </div>
          <div className="flex gap-6 text-xs text-gray-300">
            <a href="#about" className="hover:text-white transition-colors">
              আমাদের সম্পর্কে
            </a>
            <a href="#privacy" className="hover:text-white transition-colors">
              গোপনীয়তা নীতি
            </a>
            <a href="#terms" className="hover:text-white transition-colors">
              শর্তাবলী
            </a>
            <a href="#contact" className="hover:text-white transition-colors">
              যোগাযোগ
            </a>
          </div>
          <p className="text-xs text-gray-500">
            © {new Date().getFullYear()} SylhetyTutor. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
