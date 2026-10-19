import { Link } from "react-router-dom";
import { useTranslation } from "../../i18n";

const CURRENT_YEAR = new Date().getFullYear();

export function Footer() {
  const { t } = useTranslation();

  const links = [
    { key: "about", path: "/about" },
    { key: "terms", path: "/terms" },
    { key: "privacy", path: "/privacy" },
    { key: "faq", path: "/faq" },
    { key: "safety", path: "/safety" },
  ];

  return (
    <footer className="bg-navy-deep text-on-navy py-8 md:py-12 text-sm border-t border-navy-deep/20">
      <div className="max-w-6xl mx-auto px-4 md:px-6 flex flex-col md:flex-row justify-between items-center gap-6 text-center md:text-left">
        <div>
          <Link to="/" className="font-display font-bold text-lg inline-block">
            Sylhety<span className="text-orange">Tutor</span>
          </Link>
          <p className="text-xs opacity-75 mt-0.5">Webnify IT Solution, Sylhet</p>
        </div>

        <nav aria-label="Footer Navigation" className="flex flex-wrap justify-center gap-2 md:gap-4">
          {links.map(({ key, path }) => (
            <Link
              key={key}
              to={path}
              className="min-h-11 px-2.5 inline-flex items-center text-xs md:text-sm opacity-85 hover:opacity-100 hover:text-orange transition-colors"
            >
              {t(`footer.${key}`)}
            </Link>
          ))}
        </nav>

        <p className="text-xs opacity-60">© {CURRENT_YEAR} SylhetyTutor</p>
      </div>
    </footer>
  );
}
