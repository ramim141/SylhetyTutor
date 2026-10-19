import { useState } from "react";
import { HelpCircle, ChevronDown, Users, GraduationCap } from "lucide-react";
import { Header } from "../components/layout/Header";
import { Footer } from "../components/layout/Footer";
import { SEO } from "../components/common/SEO";
import { useTranslation } from "../i18n";

function FaqItem({ question, answer }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border border-border rounded-xl bg-bg-subtle overflow-hidden transition-colors">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full p-4 md:p-5 text-left flex items-center justify-between gap-4 font-display font-semibold text-sm md:text-base hover:text-orange transition-colors"
        aria-expanded={open}
      >
        <span>{question}</span>
        <ChevronDown
          className={`w-5 h-5 shrink-0 transition-transform duration-200 ${
            open ? "rotate-180 text-orange" : "text-fg-muted"
          }`}
        />
      </button>
      {open && (
        <div className="px-4 pb-4 md:px-5 md:pb-5 text-xs md:text-sm text-fg-secondary leading-relaxed border-t border-border/50 pt-3">
          {answer}
        </div>
      )}
    </div>
  );
}

export default function FAQ() {
  const { t } = useTranslation();

  const guardianQuestions = [
    { q: t("faq.g1Q"), a: t("faq.g1A") },
    { q: t("faq.g2Q"), a: t("faq.g2A") },
    { q: t("faq.g3Q"), a: t("faq.g3A") },
    { q: t("faq.g4Q"), a: t("faq.g4A") },
  ];

  const tutorQuestions = [
    { q: t("faq.t1Q"), a: t("faq.t1A") },
    { q: t("faq.t2Q"), a: t("faq.t2A") },
    { q: t("faq.t3Q"), a: t("faq.t3A") },
  ];

  const allQuestions = [...guardianQuestions, ...tutorQuestions];
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": allQuestions.map(({ q, a }) => ({
      "@type": "Question",
      "name": q,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": a,
      },
    })),
  };

  return (
    <div className="min-h-screen flex flex-col bg-bg text-fg">
      <SEO title={t("faq.title")} description={t("faq.subtitle")} jsonLd={jsonLd} />
      <Header />

      <main className="flex-1 max-w-3xl mx-auto px-4 py-10 md:py-16 w-full">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 text-orange text-xs font-semibold uppercase tracking-wider mb-2">
            <HelpCircle className="w-4 h-4" /> FAQ
          </div>
          <h1 className="text-3xl md:text-4xl font-display font-extrabold mb-3">
            {t("faq.title")}
          </h1>
          <p className="text-fg-secondary text-sm md:text-base max-w-lg mx-auto">
            {t("faq.subtitle")}
          </p>
        </div>

        {/* Guardians section */}
        <section className="mb-10">
          <div className="flex items-center gap-2 text-lg font-display font-bold mb-4 pb-2 border-b border-border">
            <Users className="w-5 h-5 text-orange" />
            {t("faq.forGuardians")}
          </div>
          <div className="space-y-3">
            {guardianQuestions.map((item, idx) => (
              <FaqItem key={`g-${idx}`} question={item.q} answer={item.a} />
            ))}
          </div>
        </section>

        {/* Tutors section */}
        <section>
          <div className="flex items-center gap-2 text-lg font-display font-bold mb-4 pb-2 border-b border-border">
            <GraduationCap className="w-5 h-5 text-orange" />
            {t("faq.forTutors")}
          </div>
          <div className="space-y-3">
            {tutorQuestions.map((item, idx) => (
              <FaqItem key={`t-${idx}`} question={item.q} answer={item.a} />
            ))}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
