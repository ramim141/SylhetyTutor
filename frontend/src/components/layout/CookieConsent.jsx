import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Cookie, X } from "lucide-react";
import { useTranslation } from "../../i18n";

const CONSENT_KEY = "sylhety_cookie_consent";

export function CookieConsent() {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const consented = localStorage.getItem(CONSENT_KEY);
      if (!consented) {
        setVisible(true);
      }
    } catch {
      // In case localStorage is disabled
    }
  }, []);

  const handleAccept = () => {
    try {
      localStorage.setItem(CONSENT_KEY, "true");
    } catch {
      // Ignore
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <aside
      aria-label="Cookie Consent Banner"
      className="fixed bottom-20 md:bottom-6 left-4 right-4 md:left-auto md:right-6 md:max-w-md z-40 bg-ink text-on-ink p-4 rounded-xl shadow-xl border border-on-ink/15 animate-in fade-in slide-in-from-bottom-4 duration-300"
    >
      <div className="flex items-start gap-3">
        <Cookie className="w-5 h-5 text-orange shrink-0 mt-0.5" aria-hidden />
        <div className="flex-1 text-xs md:text-sm text-on-ink/90 leading-relaxed">
          <p>
            {t("cookie.message")}{" "}
            <Link
              to="/privacy"
              className="text-orange underline underline-offset-2 hover:text-orange-hover"
            >
              {t("cookie.learnMore")}
            </Link>
          </p>
        </div>
        <button
          type="button"
          onClick={handleAccept}
          className="text-on-ink/60 hover:text-on-ink transition-colors p-1"
          aria-label="Close cookie banner"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="mt-3 flex justify-end">
        <button
          type="button"
          onClick={handleAccept}
          className="px-4 py-1.5 rounded-lg bg-orange text-on-orange text-xs font-semibold hover:bg-orange-hover transition-colors shadow-sm"
        >
          {t("cookie.accept")}
        </button>
      </div>
    </aside>
  );
}
