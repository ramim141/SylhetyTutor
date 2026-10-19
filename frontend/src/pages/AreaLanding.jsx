import { useEffect, useState, useMemo } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { ChevronRight, MapPin, Plus, GraduationCap } from "lucide-react";
import { Header } from "../components/layout/Header";
import { Footer } from "../components/layout/Footer";
import { SEO } from "../components/common/SEO";
import { TutorCard } from "../components/tutor/TutorCard";
import { TutorCardSkeleton } from "../components/tutor/TutorCardSkeleton";
import { Button } from "../components/ui/Button";
import { Alert } from "../components/ui/Alert";
import { useTranslation } from "../i18n";
import { useAuthStore } from "../store/authStore";
import { useLookups } from "../hooks/useLookups";
import { getTutors } from "../api/tutors";

export default function AreaLanding() {
  const { slug } = useParams();
  const { t, lang } = useTranslation();
  const navigate = useNavigate();
  const { status, user } = useAuthStore();
  const lookups = useLookups();

  const area = useMemo(() => {
    return lookups.areas.find((a) => a.slug === slug);
  }, [lookups.areas, slug]);

  const areaName = area
    ? lang === "en"
      ? area.name_en
      : area.name_bn
    : slug;

  const [tutors, setTutors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    setError(false);
    getTutors({ area: slug, page_size: 12 })
      .then((data) => {
        setTutors(data?.results ?? []);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [slug]);

  const displayedTutors = useMemo(() => {
    if (!tutors) return [];
    if (user?.role !== "tutor") return tutors;
    return tutors.filter((t) => {
      if (t.userId != null && Number(t.userId) === Number(user.id)) return false;
      if (user.tutor_slug && t.slug === user.tutor_slug) return false;
      return true;
    });
  }, [tutors, user?.id, user?.role, user?.tutor_slug]);

  const handlePostCta = () => {
    if (status === "authenticated" && (user?.role === "guardian" || user?.role === "admin")) {
      navigate(area ? `/requirements/new?area=${area.id}` : "/requirements/new");
    } else if (status === "authenticated") {
      navigate("/dashboard");
    } else {
      navigate(`/register?returnTo=${encodeURIComponent(`/requirements/new${area ? `?area=${area.id}` : ""}`)}`);
    }
  };

  const pageTitle = t("areaLanding.metaTitle", { area: areaName });
  const heroSubtitle = t("areaLanding.heroSubtitle", { area: areaName });

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": pageTitle,
    "description": heroSubtitle,
    "url": `https://sylhetytutor.com/tutors/area/${slug}`,
    "breadcrumb": {
      "@type": "BreadcrumbList",
      "itemListElement": [
        {
          "@type": "ListItem",
          "position": 1,
          "name": "Home",
          "item": "https://sylhetytutor.com",
        },
        {
          "@type": "ListItem",
          "position": 2,
          "name": "Tutors",
          "item": "https://sylhetytutor.com/tutors",
        },
        {
          "@type": "ListItem",
          "position": 3,
          "name": areaName,
          "item": `https://sylhetytutor.com/tutors/area/${slug}`,
        },
      ],
    },
  };

  return (
    <div className="min-h-screen flex flex-col bg-bg text-fg">
      <SEO title={pageTitle} description={heroSubtitle} jsonLd={jsonLd} />
      <Header />

      <main className="flex-1 max-w-6xl mx-auto px-4 md:px-6 py-6 md:py-10 w-full">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs md:text-sm text-fg-muted mb-6">
          <Link to="/" className="hover:text-orange transition-colors">
            {t("areaLanding.breadcrumbHome")}
          </Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <Link to="/tutors" className="hover:text-orange transition-colors">
            {t("areaLanding.breadcrumbAreas")}
          </Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-fg font-medium">{areaName}</span>
        </nav>

        {/* Hero Section */}
        <div className="bg-bg-subtle border border-border rounded-2xl p-6 md:p-10 mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-orange-light text-orange-text mb-3">
              <MapPin className="w-3.5 h-3.5" /> {areaName}, Sylhet
            </span>
            <h1 className="text-2xl md:text-4xl font-display font-extrabold mb-3">
              {t("areaLanding.heroTitle", { area: areaName })}
            </h1>
            <p className="text-fg-secondary text-sm md:text-base leading-relaxed">
              {heroSubtitle}
            </p>
          </div>

          <Button
            size="lg"
            onClick={handlePostCta}
            className="shrink-0 flex items-center gap-2 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            {t("areaLanding.postCta", { area: areaName })}
          </Button>
        </div>

        {/* Tutor Listing Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-display font-bold flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-orange" />
            {t("areaLanding.allTutorsInArea", { area: areaName })}
          </h2>
          <Link
            to={`/tutors?area=${slug}`}
            className="text-xs md:text-sm font-semibold text-orange hover:underline"
          >
            Filter & Search
          </Link>
        </div>

        {/* Tutor Cards Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <TutorCardSkeleton key={i} />
            ))}
          </div>
        ) : error ? (
          <Alert variant="error" className="my-6">
            Failed to load tutors in this area.
          </Alert>
        ) : displayedTutors.length === 0 ? (
          <div className="bg-bg-subtle border border-dashed border-border rounded-2xl p-10 text-center max-w-lg mx-auto">
            <MapPin className="w-10 h-10 text-fg-muted mx-auto mb-3 opacity-60" />
            <p className="text-sm md:text-base text-fg-secondary mb-5">
              {t("areaLanding.noTutors", { area: areaName })}
            </p>
            <Button onClick={handlePostCta}>
              {t("areaLanding.postCta", { area: areaName })}
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
            {displayedTutors.map((tutor) => (
              <TutorCard key={tutor.id} tutor={tutor} />
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
