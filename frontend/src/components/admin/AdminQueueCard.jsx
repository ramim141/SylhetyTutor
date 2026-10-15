import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import { useTranslation } from "../../i18n";
import { getApprovals } from "../../api/admin";
import { Button } from "../ui/Button";

/** Dashboard card for admins: how many profiles wait, and the way into the queue. */
export function AdminQueueCard() {
  const { t } = useTranslation();
  const [result, setResult] = useState({ done: false, waiting: null });

  useEffect(() => {
    const controller = new AbortController();
    getApprovals({ status: "pending" }, { signal: controller.signal })
      .then((data) => setResult({ done: true, waiting: data.counts.pending }))
      .catch(() => {
        if (!controller.signal.aborted) setResult({ done: true, waiting: null });
      });
    return () => controller.abort();
  }, []);

  const { done, waiting } = result;

  return (
    <section className="bg-orange-pale border border-orange/20 rounded-lg p-5 flex flex-col gap-4">
      <div className="flex gap-3">
        <ShieldCheck className="w-6 h-6 text-orange shrink-0" aria-hidden />
        <div className="flex flex-col gap-1">
          <h2 className="font-display font-bold text-fg">{t("admin.queue.title")}</h2>
          <p className="text-sm text-fg-secondary" aria-live="polite">
            {!done
              ? t("common.loading")
              : waiting == null
                ? t("admin.queue.loadFailed")
                : waiting === 0
                  ? t("admin.dashboard.none")
                  : t("admin.dashboard.waiting", { n: waiting })}
          </p>
        </div>
      </div>
      <Link to="/admin/verification" className="block">
        <Button className="w-full">{t("admin.dashboard.open")}</Button>
      </Link>
      <Link to="/admin/payments" className="block">
        <Button variant="outline" className="w-full">
          {t("admin.pay.open")}
        </Button>
      </Link>
    </section>
  );
}
