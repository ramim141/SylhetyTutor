import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, RefreshCw } from "lucide-react";
import { useTranslation } from "../i18n";
import { getMyProfile, saveMyProfile, submitMyProfile } from "../api/tutors";
import { getFieldErrors, getFormError } from "../api/errors";
import { useAuthStore } from "../store/authStore";
import { useLookups } from "../hooks/useLookups";
import { Alert } from "../components/ui/Alert";
import { Button } from "../components/ui/Button";
import { Logo } from "../components/ui/Logo";
import { StepProgress } from "../components/tutor/registration/StepProgress";
import { StepAbout } from "../components/tutor/registration/StepAbout";
import { StepDocuments } from "../components/tutor/registration/StepDocuments";
import { StepStudies } from "../components/tutor/registration/StepStudies";
import { StepTeaching } from "../components/tutor/registration/StepTeaching";
import { StepWhere } from "../components/tutor/registration/StepWhere";
import { StepBioFee } from "../components/tutor/registration/StepBioFee";
import { StepReview } from "../components/tutor/registration/StepReview";
import {
  EDIT_FLOW,
  FIELD_NAMES,
  FULL_FLOW,
  draftFrom,
  patchForStep,
  startIndex,
  validateStep,
} from "../components/tutor/registration/steps";

const BODIES = {
  1: StepAbout,
  2: StepDocuments,
  3: StepStudies,
  4: StepTeaching,
  5: StepWhere,
  6: StepBioFee,
  review: StepReview,
};

/**
 * The tutor's 6-step profile form plus a review. Each step is saved when the tutor moves on,
 * so closing the page loses nothing and reopening it resumes at the first step still missing
 * something. After approval only the teaching steps are editable.
 */
export default function TutorRegistration() {
  const i18n = useTranslation();
  const { t } = i18n;
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const lookups = useLookups();

  const [reloadKey, setReloadKey] = useState(0);
  const [load, setLoad] = useState({ key: null, status: "loading" });
  const [profile, setProfile] = useState(null);
  const [draft, setDraft] = useState(null);
  const [index, setIndex] = useState(0);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);

  const requestKey = `load#${reloadKey}`;
  const loadStatus = load.key === requestKey ? load.status : "loading";

  useEffect(() => {
    const controller = new AbortController();
    getMyProfile({ signal: controller.signal })
      .then((mine) => {
        const flow = mine.status === "approved" ? EDIT_FLOW : FULL_FLOW;
        setProfile(mine);
        setDraft(draftFrom(mine));
        setIndex(startIndex(flow, mine.missing));
        setLoad({ key: requestKey, status: "ready" });
      })
      .catch((err) => {
        if (!controller.signal.aborted) {
          setLoad({
            key: requestKey,
            status: err?.response?.status === 403 ? "forbidden" : "error",
          });
        }
      });
    return () => controller.abort();
  }, [requestKey]);

  const header = (
    <header className="bg-bg border-b border-border">
      <div className="max-w-xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
        <Link to="/dashboard" aria-label={t("brand.name")}>
          <Logo className="h-8" />
        </Link>
        <Link
          to="/dashboard"
          className="min-h-11 inline-flex items-center px-2 text-sm font-display font-semibold text-fg-secondary hover:text-fg"
        >
          {t("tr.later")}
        </Link>
      </div>
    </header>
  );

  const shell = (children) => (
    <div className="min-h-dvh bg-bg-subtle text-fg">
      {header}
      <main className="max-w-xl mx-auto px-4 py-5 md:py-8">{children}</main>
    </div>
  );

  if (loadStatus === "loading") {
    return shell(
      <div role="status" aria-label={t("common.loading")} className="flex flex-col gap-4">
        <div className="h-12 rounded-lg bg-bg-card animate-pulse" />
        <div className="h-72 rounded-lg bg-bg-card animate-pulse" />
      </div>,
    );
  }

  if (loadStatus === "forbidden" || (user && user.role !== "tutor")) {
    return shell(
      <div className="flex flex-col items-center gap-4 text-center py-8">
        <Alert variant="info">{t("tr.notTutor")}</Alert>
        <Link to="/dashboard">
          <Button variant="outline">{t("common.backHome")}</Button>
        </Link>
      </div>,
    );
  }

  if (loadStatus === "error") {
    return shell(
      <div className="flex flex-col items-center gap-4 text-center py-8">
        <Alert variant="error">{t("tr.loadError")}</Alert>
        <Button variant="outline" onClick={() => setReloadKey((key) => key + 1)}>
          <RefreshCw className="w-4 h-4" aria-hidden />
          {t("common.retry")}
        </Button>
      </div>,
    );
  }

  // Under review: nothing to edit; the dashboard shows the status
  if (profile.status === "pending") return <Navigate to="/dashboard" replace />;

  const editing = profile.status === "approved";
  const flow = editing ? EDIT_FLOW : FULL_FLOW;
  const step = flow[index];
  const isLast = index === flow.length - 1;
  const isReview = step === "review";
  const Body = BODIES[step];

  const update = (patch) => {
    setDraft((current) => ({ ...current, ...patch }));
    setErrors({});
    setFormError("");
  };

  const onProfile = (updated) => {
    setProfile(updated);
    setErrors({});
    setFormError("");
  };

  const goTo = (target) => {
    const next = flow.indexOf(target);
    if (next !== -1) {
      setIndex(next);
      setErrors({});
      setFormError("");
    }
  };

  const fail = (err) => {
    setFormError(getFormError(err, i18n) || "");
    setErrors(getFieldErrors(err, i18n, FIELD_NAMES));
  };

  const next = async () => {
    const problems = validateStep(step, draft, profile);
    if (Object.keys(problems).length > 0) {
      setErrors(Object.fromEntries(Object.entries(problems).map(([key, text]) => [key, t(text)])));
      return;
    }
    setErrors({});
    setFormError("");

    const patch = patchForStep(step, draft);
    if (patch) {
      setBusy(true);
      try {
        onProfile(await saveMyProfile(patch));
      } catch (err) {
        fail(err);
        return;
      } finally {
        setBusy(false);
      }
    }

    if (editing && isLast) navigate("/dashboard");
    else setIndex(index + 1);
  };

  const submit = async () => {
    setBusy(true);
    setFormError("");
    try {
      await submitMyProfile();
      navigate("/dashboard", { replace: true });
    } catch (err) {
      fail(err);
      try {
        // the server's list of what is still missing; setProfile (not onProfile) so the
        // error shown above is not wiped
        setProfile(await getMyProfile());
      } catch {
        /* the error above is enough */
      }
    } finally {
      setBusy(false);
    }
  };

  const stepNumber = isReview ? FULL_FLOW.length : editing ? index + 1 : step;
  const total = flow.length;
  const title = t(`tr.step.${step}.title`);

  return shell(
    <div className="flex flex-col gap-5">
      <h1 className="font-display font-extrabold text-2xl leading-tight">{t("tr.title")}</h1>

      {profile.status === "rejected" && profile.rejection_reason && (
        <Alert variant="warning">
          {t("tr.rejectedBanner", { reason: profile.rejection_reason })}
        </Alert>
      )}
      {editing && <Alert variant="info">{t("tr.lockedIdentity")}</Alert>}

      <StepProgress step={editing ? index + 1 : stepNumber} total={total} title={title} />

      <section className="bg-bg-card border border-border rounded-lg p-5 shadow-card flex flex-col gap-5">
        {formError && (
          <Alert variant="error" onClose={() => setFormError("")}>
            {formError}
          </Alert>
        )}

        <Body
          profile={profile}
          draft={draft}
          update={update}
          errors={errors}
          lookups={lookups}
          onProfile={onProfile}
          onEdit={goTo}
        />

        <div className="flex gap-3 pt-1">
          {index > 0 && (
            <Button
              type="button"
              variant="ghost"
              disabled={busy}
              onClick={() => goTo(flow[index - 1])}
            >
              <ArrowLeft className="w-4 h-4" aria-hidden />
              {t("tr.back")}
            </Button>
          )}
          {isReview ? (
            <Button
              type="button"
              className="flex-1"
              loading={busy}
              disabled={profile.missing.length > 0}
              onClick={submit}
            >
              {busy ? t("tr.submitting") : t("tr.submit")}
            </Button>
          ) : (
            <Button type="button" className="flex-1" loading={busy} onClick={next}>
              {busy ? t("tr.saving") : editing && isLast ? t("tr.saveChanges") : t("tr.next")}
              {!busy && !(editing && isLast) && <ArrowRight className="w-4 h-4" aria-hidden />}
            </Button>
          )}
        </div>
      </section>
    </div>,
  );
}
