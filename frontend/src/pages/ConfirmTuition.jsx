import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { CheckCircle2, CircleAlert } from "lucide-react";
import { useTranslation } from "../i18n";
import { formatDateTime } from "../utils/dateTime";
import { getFormError } from "../api/errors";
import { answerConfirmation, getConfirmation } from "../api/payments";
import { Alert } from "../components/ui/Alert";
import { Button } from "../components/ui/Button";
import { Logo } from "../components/ui/Logo";

/**
 * The guardian's one-tap page, opened from the emailed link (no login, no navbar). It shows
 * only the tutor's name and the demo time, and records yes or no once.
 */
export default function ConfirmTuition() {
  const { token } = useParams();
  const { t, has, lang } = useTranslation();
  const [state, setState] = useState({ status: "loading" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    getConfirmation(token)
      .then((data) => !cancelled && setState({ status: "ready", data }))
      .catch((err) => {
        if (cancelled) return;
        setState({ status: err?.response?.status === 404 ? "invalid" : "error" });
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const answer = async (value) => {
    setBusy(true);
    setError(null);
    try {
      const data = await answerConfirmation(token, value);
      setState({ status: "ready", data });
    } catch (err) {
      setError(getFormError(err, { t, has }) || t("error.generic"));
    } finally {
      setBusy(false);
    }
  };

  const data = state.data;

  return (
    <div className="min-h-dvh bg-bg-subtle text-fg flex flex-col items-center px-4 py-10 gap-6">
      <Logo />
      <main className="w-full max-w-md bg-bg-card border border-border rounded-lg shadow-card p-6 flex flex-col gap-4">
        {state.status === "loading" && (
          <p role="status" className="text-sm text-fg-secondary text-center">
            {t("common.loading")}
          </p>
        )}
        {state.status === "invalid" && (
          <div role="alert" className="flex flex-col items-center gap-3 text-center">
            <CircleAlert className="w-8 h-8 text-fg-muted" aria-hidden />
            <p className="text-sm text-fg-secondary">{t("confirm.invalid")}</p>
          </div>
        )}
        {state.status === "error" && (
          <Alert variant="error">{t("confirm.loadFailed")}</Alert>
        )}
        {state.status === "ready" && data.answered && (
          <div className="flex flex-col items-center gap-3 text-center">
            <CheckCircle2 className="w-8 h-8 text-success" aria-hidden />
            <p className="font-display font-bold text-fg">
              {data.started ? t("confirm.thanksYes") : t("confirm.thanksNo")}
            </p>
          </div>
        )}
        {state.status === "ready" && !data.answered && (
          <>
            <h1 className="text-xl font-display font-extrabold">{t("confirm.title")}</h1>
            <p className="text-sm text-fg-secondary">
              {t("confirm.body", {
                tutor: data.tutor_name,
                when: formatDateTime(data.demo_at, lang),
              })}
            </p>
            {error && <Alert variant="error">{error}</Alert>}
            <Button size="lg" className="w-full" disabled={busy} onClick={() => answer("yes")}>
              {t("confirm.yes")}
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="w-full"
              disabled={busy}
              onClick={() => answer("no")}
            >
              {t("confirm.no")}
            </Button>
          </>
        )}
      </main>
    </div>
  );
}
