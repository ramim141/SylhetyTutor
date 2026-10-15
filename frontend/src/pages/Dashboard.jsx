import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Calendar, ClipboardList, LogOut, Mail, Phone, Search } from "lucide-react";
import { useTranslation } from "../i18n";
import { useAuthStore } from "../store/authStore";
import { authApi } from "../api/auth";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { ChangePasswordForm } from "../components/auth/ChangePasswordForm";
import { TutorStatusCard } from "../components/tutor/TutorStatusCard";
import { AdminQueueCard } from "../components/admin/AdminQueueCard";
import { BottomNav } from "../components/layout/BottomNav";

const LANGUAGES = ["en", "bn", "mixed"];

function DetailRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-3 py-3.5">
      <Icon className="w-5 h-5 text-fg-muted shrink-0" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-xs text-fg-secondary">{label}</p>
        <p className="font-display font-semibold text-fg truncate tabular-nums">{value || "—"}</p>
      </div>
    </div>
  );
}

function NextStep({ role, t, onBrowse }) {
  if (role === "guardian") {
    return (
      <>
        <section className="bg-bg-card border border-border rounded-lg p-5 shadow-card flex flex-col gap-4">
          <div className="flex gap-3">
            <ClipboardList className="w-6 h-6 text-orange shrink-0" aria-hidden />
            <div className="flex flex-col gap-1">
              <h2 className="font-display font-bold text-fg">
                {t("dashboard.guardian.postTitle")}
              </h2>
              <p className="text-sm text-fg-secondary">{t("dashboard.guardian.postBody")}</p>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Link to="/requirements/new" className="block">
              <Button className="w-full">{t("dashboard.guardian.postCta")}</Button>
            </Link>
            <Link to="/requirements" className="block">
              <Button variant="outline" className="w-full">
                {t("dashboard.guardian.myCta")}
              </Button>
            </Link>
          </div>
        </section>
        <section className="bg-orange-pale border border-orange/20 rounded-lg p-5 flex flex-col gap-4">
          <div className="flex gap-3">
            <Search className="w-6 h-6 text-orange shrink-0" aria-hidden />
            <div className="flex flex-col gap-1">
              <p className="text-xs font-display font-semibold text-orange-text">
                {t("dashboard.nextStep")}
              </p>
              <h2 className="font-display font-bold text-fg">
                {t("dashboard.guardian.nextTitle")}
              </h2>
              <p className="text-sm text-fg-secondary">{t("dashboard.guardian.nextBody")}</p>
            </div>
          </div>
          <Button onClick={onBrowse} className="w-full">
            {t("dashboard.guardian.nextCta")}
          </Button>
        </section>
      </>
    );
  }
  return null;
}

export default function Dashboard() {
  const { t, lang, setLang } = useTranslation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [langStatus, setLangStatus] = useState(null); // 'saved' | 'failed'

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  const changeLanguage = async (next) => {
    if (next === lang) return;
    setLang(next); // instant, even before the server answers
    setLangStatus(null);
    try {
      const updated = await authApi.updateMe({ preferred_language: next });
      useAuthStore.setState({ user: updated });
      setLangStatus("saved");
    } catch {
      setLangStatus("failed");
    }
  };

  const roleLabel =
    user?.role === "guardian"
      ? t("auth.role.guardian")
      : user?.role === "tutor"
        ? t("auth.role.tutor")
        : user?.role;

  const joined = user?.date_joined
    ? new Intl.DateTimeFormat(lang === "bn" ? "bn-BD" : "en-GB", {
        dateStyle: "medium",
      }).format(new Date(user.date_joined))
    : null;

  const initial = user?.full_name?.trim().charAt(0).toUpperCase() || "?";

  return (
    <div className="min-h-dvh bg-bg-subtle text-fg pb-28 md:pb-10">
      <header className="sticky top-0 z-40 bg-bg/95 backdrop-blur-md border-b border-border pt-[env(safe-area-inset-top)]">
        <div className="max-w-lg mx-auto px-2 h-14 flex items-center gap-1">
          <Link
            to="/"
            className="w-11 h-11 flex items-center justify-center rounded-full text-fg-secondary hover:text-fg hover:bg-bg-subtle"
            aria-label={t("common.backHome")}
          >
            <ArrowLeft className="w-5 h-5" aria-hidden />
          </Link>
          <h1 className="text-lg font-display font-bold">{t("dashboard.title")}</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-5 flex flex-col gap-4">
        {/* Profile */}
        <section className="bg-bg-card border border-border rounded-lg p-5 shadow-card flex items-center gap-4">
          <div
            className="w-14 h-14 rounded-full bg-orange-light text-orange-text font-display font-extrabold text-2xl flex items-center justify-center shrink-0"
            aria-hidden
          >
            {initial}
          </div>
          <div className="min-w-0 flex flex-col gap-1">
            <p className="text-sm text-fg-secondary">{t("dashboard.welcome")}</p>
            <h2 className="text-xl font-display font-extrabold leading-tight truncate">
              {user?.full_name}
            </h2>
            <div>
              <Badge variant={user?.role === "tutor" ? "featured" : "verified"}>{roleLabel}</Badge>
            </div>
          </div>
        </section>

        {user?.role === "tutor" ? (
          <>
            <TutorStatusCard />
            <section className="bg-bg-card border border-border rounded-lg p-5 shadow-card flex flex-col gap-4">
              <div className="flex gap-3">
                <ClipboardList className="w-6 h-6 text-orange shrink-0" aria-hidden />
                <div className="flex flex-col gap-1">
                  <h2 className="font-display font-bold text-fg">
                    {t("dashboard.tutor.matchTitle")}
                  </h2>
                  <p className="text-sm text-fg-secondary">{t("dashboard.tutor.matchBody")}</p>
                </div>
              </div>
              <Link to="/tutor/requirements" className="block">
                <Button variant="outline" className="w-full">
                  {t("dashboard.tutor.matchCta")}
                </Button>
              </Link>
              <Link to="/tutor/applications" className="block">
                <Button variant="ghost" className="w-full">
                  {t("dashboard.tutor.appsCta")}
                </Button>
              </Link>
            </section>
          </>
        ) : user?.role === "admin" ? (
          <AdminQueueCard />
        ) : (
          <NextStep role={user?.role} t={t} onBrowse={() => navigate("/tutors")} />
        )}

        {/* Account details */}
        <section className="bg-bg-card border border-border rounded-lg px-5 shadow-card">
          <h2 className="pt-4 text-sm font-display font-bold text-fg-secondary">
            {t("dashboard.account")}
          </h2>
          <div className="divide-y divide-border-light">
            <DetailRow icon={Phone} label={t("dashboard.phone")} value={user?.phone} />
            <DetailRow icon={Mail} label={t("dashboard.email")} value={user?.email} />
            <DetailRow icon={Calendar} label={t("dashboard.joined")} value={joined} />
          </div>
        </section>

        {/* Language preference, saved to the account */}
        <section className="bg-bg-card border border-border rounded-lg p-5 shadow-card flex flex-col gap-3">
          <div>
            <h2 className="text-sm font-display font-bold text-fg-secondary">
              {t("dashboard.preferences")}
            </h2>
            <p className="text-xs text-fg-muted mt-0.5">{t("dashboard.languageHint")}</p>
          </div>
          <div
            role="radiogroup"
            aria-label={t("nav.langSelect")}
            className="grid grid-cols-3 gap-1 p-1 bg-bg-subtle border border-border rounded-full"
          >
            {LANGUAGES.map((code) => (
              <button
                key={code}
                type="button"
                role="radio"
                aria-checked={lang === code}
                onClick={() => changeLanguage(code)}
                className={`min-h-11 rounded-full text-sm font-display font-semibold transition-colors cursor-pointer ${
                  lang === code
                    ? "bg-orange text-on-orange shadow-sm"
                    : "text-fg-secondary hover:text-fg"
                }`}
              >
                {code === "mixed" ? "Mixed" : t(`lang.${code}`)}
              </button>
            ))}
          </div>
          <p
            aria-live="polite"
            className={`text-xs min-h-4 ${langStatus === "failed" ? "text-error" : "text-success"}`}
          >
            {langStatus === "saved" && t("dashboard.languageSaved")}
            {langStatus === "failed" && t("dashboard.languageSaveFailed")}
          </p>
        </section>

        <ChangePasswordForm />

        <Button variant="ghost" size="lg" onClick={handleLogout} className="w-full bg-bg-card">
          <LogOut className="w-5 h-5" aria-hidden />
          {t("dashboard.logout")}
        </Button>
      </main>

      <BottomNav />
    </div>
  );
}
