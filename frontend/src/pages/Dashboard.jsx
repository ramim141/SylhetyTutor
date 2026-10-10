import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { Phone, Mail, Shield, Globe, Calendar, LogOut, ArrowLeft } from "lucide-react";
import { useTranslation } from "../i18n";
import { useAuthStore } from "../store/authStore";
import { Button } from "../components/ui/Button";

export default function Dashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  const roleBadgeColors = {
    guardian: "bg-info-bg text-info border-info/30",
    tutor: "bg-success-bg text-success border-success/30",
    admin: "bg-orange/10 text-orange-text border-orange/30",
  };

  const roleLabel =
    user?.role === "guardian"
      ? t("auth.role.guardian")
      : user?.role === "tutor"
        ? t("auth.role.tutor")
        : user?.role || "User";

  return (
    <div className="min-h-screen bg-bg text-fg transition-colors">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-bg/95 backdrop-blur-md border-b border-border">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="p-2 -ml-2 text-fg-secondary hover:text-fg rounded-lg transition-colors"
              aria-label="Back to home"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-lg font-display font-bold text-fg">{t("dashboard.title")}</h1>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="text-error hover:bg-error-bg hover:border-error/30"
          >
            <LogOut className="w-4 h-4 mr-1.5" />
            <span>{t("dashboard.logout")}</span>
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        {/* Welcome Card */}
        <div className="bg-bg-card border border-border rounded-2xl p-6 sm:p-8 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-orange/10 border border-orange/20 flex items-center justify-center text-orange font-display font-black text-2xl shadow-inner">
                {user?.full_name?.charAt(0)?.toUpperCase() || "U"}
              </div>
              <div>
                <p className="text-xs font-display uppercase tracking-wider text-fg-secondary font-bold">
                  {t("dashboard.welcome")}
                </p>
                <h2 className="text-2xl font-display font-extrabold text-fg tracking-tight">
                  {user?.full_name}
                </h2>
              </div>
            </div>

            <div className="self-start sm:self-center">
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-display font-bold border ${
                  roleBadgeColors[user?.role] || roleBadgeColors.guardian
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                <span className="capitalize">{roleLabel}</span>
              </span>
            </div>
          </div>

          {/* User Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
            <div className="flex items-center gap-3 p-3.5 rounded-xl bg-bg-subtle border border-border">
              <Phone className="w-5 h-5 text-fg-secondary shrink-0" />
              <div className="min-w-0">
                <span className="block text-xs font-display text-fg-secondary">
                  {t("dashboard.phone")}
                </span>
                <span className="font-display font-semibold text-sm text-fg truncate block">
                  {user?.phone || "—"}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3.5 rounded-xl bg-bg-subtle border border-border">
              <Mail className="w-5 h-5 text-fg-secondary shrink-0" />
              <div className="min-w-0">
                <span className="block text-xs font-display text-fg-secondary">
                  {t("dashboard.email")}
                </span>
                <span className="font-display font-semibold text-sm text-fg truncate block">
                  {user?.email || "—"}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3.5 rounded-xl bg-bg-subtle border border-border">
              <Globe className="w-5 h-5 text-fg-secondary shrink-0" />
              <div className="min-w-0">
                <span className="block text-xs font-display text-fg-secondary">
                  {t("dashboard.language")}
                </span>
                <span className="font-display font-semibold text-sm text-fg uppercase block">
                  {user?.preferred_language || "mixed"}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3.5 rounded-xl bg-bg-subtle border border-border">
              <Calendar className="w-5 h-5 text-fg-secondary shrink-0" />
              <div className="min-w-0">
                <span className="block text-xs font-display text-fg-secondary">
                  {t("dashboard.joined")}
                </span>
                <span className="font-display font-semibold text-sm text-fg block">
                  {user?.date_joined
                    ? new Date(user.date_joined).toLocaleDateString()
                    : "—"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Links Card */}
        <div className="bg-bg-card border border-border rounded-2xl p-6 shadow-sm">
          <h3 className="text-base font-display font-bold text-fg mb-4">Quick Navigation</h3>
          <div className="flex flex-wrap gap-3">
            <Link to="/">
              <Button variant="outline" size="sm">
                Browse Home & Tutors
              </Button>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
