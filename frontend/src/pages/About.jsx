import { ShieldCheck, HeartHandshake, Sparkles, MapPin, Award } from "lucide-react";
import { Header } from "../components/layout/Header";
import { Footer } from "../components/layout/Footer";
import { SEO } from "../components/common/SEO";
import { useTranslation } from "../i18n";

export default function About() {
  const { t } = useTranslation();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "EducationalOrganization",
    "name": "SylhetyTutor",
    "url": "https://sylhetytutor.com",
    "logo": "https://sylhetytutor.com/logo.png",
    "description": "Connecting families in Sylhet with verified university home tutors.",
    "address": {
      "@type": "PostalAddress",
      "addressLocality": "Sylhet",
      "addressCountry": "BD",
    },
  };

  return (
    <div className="min-h-screen flex flex-col bg-bg text-fg">
      <SEO
        title={t("about.title")}
        description={t("about.subtitle")}
        jsonLd={jsonLd}
      />
      <Header />

      <main className="flex-1 max-w-4xl mx-auto px-4 py-10 md:py-16 w-full">
        {/* Hero */}
        <div className="text-center mb-12">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-orange-light text-orange-text mb-4">
            <Sparkles className="w-3.5 h-3.5" /> Sylhet Local Platform
          </span>
          <h1 className="text-3xl md:text-5xl font-display font-extrabold tracking-tight mb-4">
            {t("about.title")}
          </h1>
          <p className="text-base md:text-xl text-fg-secondary max-w-2xl mx-auto leading-relaxed">
            {t("about.subtitle")}
          </p>
        </div>

        {/* Mission Card */}
        <section className="bg-bg-subtle border border-border rounded-2xl p-6 md:p-8 mb-10 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-orange text-on-orange flex items-center justify-center font-bold">
              <HeartHandshake className="w-5 h-5" />
            </div>
            <h2 className="text-xl md:text-2xl font-display font-bold">
              {t("about.missionTitle")}
            </h2>
          </div>
          <p className="text-fg-secondary leading-relaxed text-sm md:text-base">
            {t("about.missionText")}
          </p>
        </section>

        {/* Why Choose Us */}
        <section className="mb-12">
          <h2 className="text-2xl font-display font-bold mb-6 text-center">
            {t("about.whyTitle")}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-bg-subtle border border-border rounded-xl p-5 flex flex-col">
              <div className="w-9 h-9 rounded-lg bg-info-bg text-info flex items-center justify-center mb-3">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="font-display font-semibold text-base mb-2">
                {t("about.whyPoint1Title")}
              </h3>
              <p className="text-xs md:text-sm text-fg-secondary leading-relaxed">
                {t("about.whyPoint1Desc")}
              </p>
            </div>

            <div className="bg-bg-subtle border border-border rounded-xl p-5 flex flex-col">
              <div className="w-9 h-9 rounded-lg bg-success-bg text-success flex items-center justify-center mb-3">
                <Award className="w-5 h-5" />
              </div>
              <h3 className="font-display font-semibold text-base mb-2">
                {t("about.whyPoint2Title")}
              </h3>
              <p className="text-xs md:text-sm text-fg-secondary leading-relaxed">
                {t("about.whyPoint2Desc")}
              </p>
            </div>

            <div className="bg-bg-subtle border border-border rounded-xl p-5 flex flex-col">
              <div className="w-9 h-9 rounded-lg bg-orange-light text-orange-text flex items-center justify-center mb-3">
                <Sparkles className="w-5 h-5" />
              </div>
              <h3 className="font-display font-semibold text-base mb-2">
                {t("about.whyPoint3Title")}
              </h3>
              <p className="text-xs md:text-sm text-fg-secondary leading-relaxed">
                {t("about.whyPoint3Desc")}
              </p>
            </div>
          </div>
        </section>

        {/* Local sylhet pride */}
        <section className="bg-navy-deep text-on-navy rounded-2xl p-6 md:p-8 flex items-center gap-4">
          <MapPin className="w-8 h-8 text-orange shrink-0" />
          <div>
            <h3 className="font-display font-bold text-lg mb-1">{t("about.builtByTitle")}</h3>
            <p className="text-xs md:text-sm opacity-85 leading-relaxed">{t("about.builtByText")}</p>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
