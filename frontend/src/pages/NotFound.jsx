import { Link } from "react-router-dom";
import { SearchX } from "lucide-react";
import { Header } from "../components/layout/Header";
import { useTranslation } from "../i18n";

export default function NotFound() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-bg text-fg flex flex-col font-body">
      <Header />
      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="text-center max-w-md flex flex-col items-center gap-4">
          <SearchX className="w-12 h-12 text-fg-muted" aria-hidden />
          <h1 className="text-3xl font-display font-extrabold">{t("notFound.title")}</h1>
          <p className="text-fg-secondary">{t("notFound.body")}</p>
          <Link
            to="/"
            className="inline-flex items-center justify-center min-h-11 px-6 rounded-md bg-orange text-on-orange font-display font-semibold text-sm hover:bg-orange-hover transition-colors"
          >
            {t("notFound.backHome")}
          </Link>
        </div>
      </main>
    </div>
  );
}
