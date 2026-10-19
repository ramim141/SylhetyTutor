import { ShieldCheck, HeartHandshake, AlertTriangle, UserCheck, PhoneCall } from "lucide-react";
import { Header } from "../components/layout/Header";
import { Footer } from "../components/layout/Footer";
import { SEO } from "../components/common/SEO";
import { useTranslation } from "../i18n";

export default function Safety() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen flex flex-col bg-bg text-fg">
      <SEO title={t("safety.title")} description={t("safety.subtitle")} />
      <Header />

      <main className="flex-1 max-w-4xl mx-auto px-4 py-10 md:py-16 w-full">
        <div className="text-center mb-12">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-orange-light text-orange-text mb-4">
            <ShieldCheck className="w-3.5 h-3.5" /> Trust & Security
          </span>
          <h1 className="text-3xl md:text-5xl font-display font-extrabold tracking-tight mb-4">
            {t("safety.title")}
          </h1>
          <p className="text-base md:text-xl text-fg-secondary max-w-2xl mx-auto leading-relaxed">
            {t("safety.subtitle")}
          </p>
        </div>

        {/* 48-Hour Guarantee Highlight Banner */}
        <section className="bg-linear-to-r from-orange to-orange-hover text-on-orange rounded-2xl p-6 md:p-8 mb-10 shadow-lg">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold bg-white/20 text-white uppercase tracking-wider">
                {t("safety.guaranteeBadge")}
              </span>
              <h2 className="text-2xl md:text-3xl font-display font-extrabold text-white">
                {t("safety.guaranteeTitle")}
              </h2>
              <p className="text-sm md:text-base text-white/95 leading-relaxed">
                {t("safety.guaranteeDesc")}
              </p>
            </div>
            <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center shrink-0 border border-white/20">
              <HeartHandshake className="w-9 h-9 text-white" />
            </div>
          </div>
        </section>

        {/* Core Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-bg-subtle border border-border rounded-xl p-6 flex flex-col">
            <div className="w-10 h-10 rounded-xl bg-info-bg text-info flex items-center justify-center mb-4">
              <UserCheck className="w-5 h-5" />
            </div>
            <h3 className="font-display font-bold text-lg mb-2">
              {t("safety.verificationTitle")}
            </h3>
            <p className="text-xs md:text-sm text-fg-secondary leading-relaxed">
              {t("safety.verificationDesc")}
            </p>
          </div>

          <div className="bg-bg-subtle border border-border rounded-xl p-6 flex flex-col">
            <div className="w-10 h-10 rounded-xl bg-success-bg text-success flex items-center justify-center mb-4">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="font-display font-bold text-lg mb-2">
              {t("safety.conductTitle")}
            </h3>
            <p className="text-xs md:text-sm text-fg-secondary leading-relaxed">
              {t("safety.conductDesc")}
            </p>
          </div>

          <div className="bg-bg-subtle border border-border rounded-xl p-6 flex flex-col">
            <div className="w-10 h-10 rounded-xl bg-warning-bg text-warning flex items-center justify-center mb-4">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h3 className="font-display font-bold text-lg mb-2">
              {t("safety.reportTitle")}
            </h3>
            <p className="text-xs md:text-sm text-fg-secondary leading-relaxed">
              {t("safety.reportDesc")}
            </p>
          </div>
        </div>

        {/* Contact Hotline / Sylhet support */}
        <section className="bg-bg-subtle border border-border rounded-2xl p-6 md:p-8 flex items-center gap-4">
          <PhoneCall className="w-8 h-8 text-orange shrink-0" />
          <div>
            <h3 className="font-display font-bold text-base md:text-lg mb-1">
              Sylhet Support Hotline
            </h3>
            <p className="text-xs md:text-sm text-fg-secondary leading-relaxed">
              জরুরি কোনো জিজ্ঞাসা বা রিপোর্ট করার জন্য সরাসরি আমাদের সাথে যোগাযোগ করতে পারেন। SylhetyTutor আপনার পরিবারের নিরাপত্তা ও নিশ্চিন্ত টিউশন নিশ্চিত করতে প্রতিশ্রুতিবদ্ধ।
            </p>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
