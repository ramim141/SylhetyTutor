import { FileText, Shield } from "lucide-react";
import { Header } from "../components/layout/Header";
import { Footer } from "../components/layout/Footer";
import { SEO } from "../components/common/SEO";
import { useTranslation } from "../i18n";

export default function Terms() {
  const { t } = useTranslation();

  const sections = [
    { title: t("terms.sec1Title"), text: t("terms.sec1Text") },
    { title: t("terms.sec2Title"), text: t("terms.sec2Text") },
    { title: t("terms.sec3Title"), text: t("terms.sec3Text") },
    { title: t("terms.sec4Title"), text: t("terms.sec4Text") },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-bg text-fg">
      <SEO title={t("terms.title")} description={t("terms.subtitle")} />
      <Header />

      <main className="flex-1 max-w-3xl mx-auto px-4 py-10 md:py-16 w-full">
        <div className="border-b border-border pb-6 mb-8">
          <div className="flex items-center gap-2 text-orange text-xs font-semibold uppercase tracking-wider mb-2">
            <FileText className="w-4 h-4" /> Legal
          </div>
          <h1 className="text-3xl md:text-4xl font-display font-extrabold mb-2">
            {t("terms.title")}
          </h1>
          <p className="text-fg-secondary text-sm md:text-base">
            {t("terms.subtitle")}
          </p>
          <p className="text-xs text-fg-muted mt-3">
            {t("terms.lastUpdated")}
          </p>
        </div>

        <div className="space-y-8">
          {sections.map((sec, idx) => (
            <section key={idx} className="bg-bg-subtle border border-border rounded-xl p-5 md:p-6">
              <h2 className="text-lg md:text-xl font-display font-bold mb-3 flex items-center gap-2">
                <Shield className="w-4 h-4 text-orange" />
                {sec.title}
              </h2>
              <p className="text-fg-secondary leading-relaxed text-sm md:text-base">
                {sec.text}
              </p>
            </section>
          ))}
        </div>
      </main>

      <Footer />
    </div>
  );
}
