import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, ShieldAlert, HeartHandshake, RefreshCw } from "lucide-react";
import { useTranslation } from "../../i18n";
import {
  getAdminReports,
  resolveAdminReport,
  suspendTutorAdminReport,
  getAdminReplacements,
  resolveAdminReplacement,
} from "../../api/safety";
import { getFormError } from "../../api/errors";
import { Header } from "../../components/layout/Header";
import { Alert } from "../../components/ui/Alert";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Dialog } from "../../components/ui/Dialog";

const REPORT_STATUSES = ["all", "pending", "reviewed", "resolved", "dismissed"];

export default function ReportsAdmin() {
  const { t, i18n } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();

  const tab = searchParams.get("tab") || "reports";
  const statusFilter = searchParams.get("status") || "all";

  const [reports, setReports] = useState([]);
  const [replacements, setReplacements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  // Dialog states
  const [resolveReportTarget, setResolveReportTarget] = useState(null);
  const [resolveAction, setResolveAction] = useState("dismiss");
  const [adminNotes, setAdminNotes] = useState("");

  const [suspendTarget, setSuspendTarget] = useState(null);
  const [suspendReason, setSuspendReason] = useState("");

  const [resolveReplacementTarget, setResolveReplacementTarget] = useState(null);
  const [replacementNotes, setReplacementNotes] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState("");

  const loadData = useCallback(() => {
    setLoading(true);
    setError("");

    if (tab === "reports") {
      const params = statusFilter !== "all" ? { status: statusFilter } : {};
      getAdminReports(params)
        .then((data) => {
          setReports(Array.isArray(data) ? data : (data?.results ?? []));
        })
        .catch((err) => setError(getFormError(err, i18n) || "Failed to load reports."))
        .finally(() => setLoading(false));
    } else {
      getAdminReplacements()
        .then((data) => {
          setReplacements(Array.isArray(data) ? data : (data?.results ?? []));
        })
        .catch((err) => setError(getFormError(err, i18n) || "Failed to load replacements."))
        .finally(() => setLoading(false));
    }
  }, [tab, statusFilter, i18n]);

  useEffect(() => {
    loadData();
  }, [loadData, reloadKey]);

  const handleTabChange = (newTab) => {
    setSearchParams({ tab: newTab, status: "all" });
  };

  const handleStatusChange = (newStatus) => {
    setSearchParams({ tab, status: newStatus });
  };

  // Submit resolve report
  const submitResolveReport = async (e) => {
    e.preventDefault();
    if (!resolveReportTarget) return;
    setActionError("");
    setSubmitting(true);
    try {
      await resolveAdminReport(resolveReportTarget.id, {
        status: resolveAction === "dismiss" ? "dismissed" : "resolved",
        action_taken: resolveAction,
        admin_notes: adminNotes.trim(),
      });
      setResolveReportTarget(null);
      setAdminNotes("");
      setReloadKey((k) => k + 1);
    } catch (err) {
      setActionError(getFormError(err, i18n) || "Failed to resolve report.");
    } finally {
      setSubmitting(false);
    }
  };

  // Submit suspend tutor
  const submitSuspendTutor = async (e) => {
    e.preventDefault();
    if (!suspendTarget) return;
    if (!suspendReason.trim()) {
      setActionError("Please provide a suspension reason.");
      return;
    }
    setActionError("");
    setSubmitting(true);
    try {
      await suspendTutorAdminReport(suspendTarget.id, {
        reason: suspendReason.trim(),
      });
      setSuspendTarget(null);
      setSuspendReason("");
      setReloadKey((k) => k + 1);
    } catch (err) {
      setActionError(getFormError(err, i18n) || "Failed to suspend tutor.");
    } finally {
      setSubmitting(false);
    }
  };

  // Submit resolve replacement
  const submitResolveReplacement = async (e) => {
    e.preventDefault();
    if (!resolveReplacementTarget) return;
    setActionError("");
    setSubmitting(true);
    try {
      await resolveAdminReplacement(resolveReplacementTarget.id, {
        status: "resolved",
        resolution_notes: replacementNotes.trim(),
      });
      setResolveReplacementTarget(null);
      setReplacementNotes("");
      setReloadKey((k) => k + 1);
    } catch (err) {
      setActionError(getFormError(err, i18n) || "Failed to resolve replacement request.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg text-fg">
      <Header />

      <main className="max-w-5xl mx-auto px-4 md:px-6 py-6 md:py-10">
        <div className="flex items-center gap-3 mb-6">
          <Link
            to="/admin/dashboard"
            className="inline-flex items-center gap-1.5 text-xs md:text-sm font-semibold text-fg-secondary hover:text-fg"
          >
            <ArrowLeft className="w-4 h-4" />
            Dashboard
          </Link>
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-display font-bold flex items-center gap-2.5">
              <ShieldAlert className="w-7 h-7 text-orange" />
              {t("admin.reports.title")}
            </h1>
            <p className="text-xs md:text-sm text-fg-secondary mt-1">
              {t("admin.reports.cardDesc")}
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setReloadKey((k) => k + 1)}
            disabled={loading}
            className="self-start md:self-auto flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {/* Tab navigation */}
        <div className="flex border-b border-border mb-6">
          <button
            type="button"
            onClick={() => handleTabChange("reports")}
            className={`pb-3 px-4 font-display font-semibold text-sm border-b-2 transition-colors flex items-center gap-2 ${
              tab === "reports"
                ? "border-orange text-orange"
                : "border-transparent text-fg-secondary hover:text-fg"
            }`}
          >
            <ShieldAlert className="w-4 h-4" />
            {t("admin.reports.open")}
          </button>
          <button
            type="button"
            onClick={() => handleTabChange("replacements")}
            className={`pb-3 px-4 font-display font-semibold text-sm border-b-2 transition-colors flex items-center gap-2 ${
              tab === "replacements"
                ? "border-orange text-orange"
                : "border-transparent text-fg-secondary hover:text-fg"
            }`}
          >
            <HeartHandshake className="w-4 h-4" />
            {t("admin.reports.tabReplacements")}
          </button>
        </div>

        {/* Status filters for reports */}
        {tab === "reports" && (
          <div className="flex flex-wrap gap-2 mb-6">
            {REPORT_STATUSES.map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => handleStatusChange(st)}
                className={`min-h-9 px-3.5 rounded-full text-xs font-display font-semibold border transition-colors ${
                  statusFilter === st
                    ? "bg-orange text-on-orange border-orange"
                    : "bg-bg-card text-fg-secondary border-border hover:border-orange"
                }`}
              >
                {t(`admin.reports.tab${st.charAt(0).toUpperCase() + st.slice(1)}`)}
              </button>
            ))}
          </div>
        )}

        {error && (
          <Alert variant="error" className="mb-6">
            {error}
          </Alert>
        )}

        {/* Reports Tab Content */}
        {tab === "reports" && (
          <div className="space-y-4">
            {loading ? (
              <div className="py-12 text-center text-sm text-fg-muted">Loading reports...</div>
            ) : reports.length === 0 ? (
              <div className="bg-bg-subtle border border-border rounded-xl p-8 text-center text-sm text-fg-muted">
                {t("admin.reports.empty")}
              </div>
            ) : (
              reports.map((rep) => (
                <div
                  key={rep.id}
                  className="bg-bg-card border border-border rounded-xl p-5 shadow-sm space-y-3"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-display font-bold text-base text-fg">
                          #{rep.id} {t(`report.category.${rep.category}`)}
                        </span>
                        <Badge
                          variant={
                            rep.status === "resolved"
                              ? "verified"
                              : rep.status === "dismissed"
                              ? "free"
                              : "warning"
                          }
                        >
                          {rep.status}
                        </Badge>
                        {rep.action_taken && rep.action_taken !== "none" && (
                          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-orange-light text-orange-text uppercase">
                            Action: {rep.action_taken}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-fg-muted mt-0.5">
                        {new Date(rep.created_at).toLocaleString()}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {rep.status !== "resolved" && rep.status !== "dismissed" && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setResolveReportTarget(rep);
                              setResolveAction("dismiss");
                              setAdminNotes(rep.admin_notes || "");
                            }}
                          >
                            {t("admin.reports.resolve")}
                          </Button>

                          {rep.target_user?.role === "tutor" && (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => {
                                setSuspendTarget(rep);
                                setSuspendReason(`Suspended due to report #${rep.id}: ${rep.reason}`);
                              }}
                            >
                              {t("admin.reports.suspendTutor")}
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs md:text-sm bg-bg-subtle p-3 rounded-lg border border-border/50">
                    <div>
                      <span className="font-semibold text-fg-muted block mb-0.5">
                        {t("admin.reports.reporter")}:
                      </span>
                      <p className="font-medium text-fg">
                        {rep.reporter?.full_name} ({rep.reporter?.phone})
                      </p>
                    </div>
                    <div>
                      <span className="font-semibold text-fg-muted block mb-0.5">
                        {t("admin.reports.target")}:
                      </span>
                      <p className="font-medium text-fg">
                        {rep.target_user?.full_name} ({rep.target_user?.phone}) — Role: {rep.target_user?.role}
                      </p>
                    </div>
                  </div>

                  <div>
                    <span className="text-xs font-semibold text-fg-muted block mb-1">
                      Reason / Description:
                    </span>
                    <p className="text-xs md:text-sm text-fg leading-relaxed bg-bg p-3 rounded-lg border border-border">
                      {rep.reason}
                    </p>
                  </div>

                  {rep.admin_notes && (
                    <div className="text-xs text-fg-secondary border-t border-border/50 pt-2">
                      <span className="font-semibold">{t("admin.reports.adminNotes")}:</span>{" "}
                      {rep.admin_notes}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* Replacements Tab Content */}
        {tab === "replacements" && (
          <div className="space-y-4">
            {loading ? (
              <div className="py-12 text-center text-sm text-fg-muted">Loading replacements...</div>
            ) : replacements.length === 0 ? (
              <div className="bg-bg-subtle border border-border rounded-xl p-8 text-center text-sm text-fg-muted">
                {t("admin.reports.empty")}
              </div>
            ) : (
              replacements.map((req) => (
                <div
                  key={req.id}
                  className="bg-bg-card border border-border rounded-xl p-5 shadow-sm space-y-3"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-display font-bold text-base text-fg">
                          Replacement Request #{req.id}
                        </span>
                        <Badge variant={req.status === "resolved" ? "verified" : "warning"}>
                          {req.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-fg-muted mt-0.5">
                        {new Date(req.created_at).toLocaleString()}
                      </p>
                    </div>

                    {req.status !== "resolved" && (
                      <Button
                        size="sm"
                        onClick={() => {
                          setResolveReplacementTarget(req);
                          setReplacementNotes(req.resolution_notes || "");
                        }}
                      >
                        {t("admin.reports.resolve")}
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs md:text-sm bg-bg-subtle p-3 rounded-lg border border-border/50">
                    <div>
                      <span className="font-semibold text-fg-muted block mb-0.5">Guardian:</span>
                      <p className="font-medium text-fg">
                        {req.guardian?.full_name} ({req.guardian?.phone})
                      </p>
                    </div>
                    <div>
                      <span className="font-semibold text-fg-muted block mb-0.5">Match Info:</span>
                      <p className="font-medium text-fg">
                        Match #{req.match} — Tutor: {req.tutor?.full_name} ({req.tutor?.phone})
                      </p>
                    </div>
                  </div>

                  <div>
                    <span className="text-xs font-semibold text-fg-muted block mb-1">
                      Reason for Replacement:
                    </span>
                    <p className="text-xs md:text-sm text-fg leading-relaxed bg-bg p-3 rounded-lg border border-border">
                      {req.reason}
                    </p>
                  </div>

                  {req.resolution_notes && (
                    <div className="text-xs text-fg-secondary border-t border-border/50 pt-2">
                      <span className="font-semibold">Resolution Notes:</span> {req.resolution_notes}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </main>

      {/* Resolve Report Dialog */}
      <Dialog
        isOpen={Boolean(resolveReportTarget)}
        onClose={() => setResolveReportTarget(null)}
        title={t("admin.reports.resolve")}
      >
        <form onSubmit={submitResolveReport} className="space-y-4">
          {actionError && <Alert variant="error">{actionError}</Alert>}

          <div>
            <label className="block text-xs font-semibold text-fg-secondary uppercase tracking-wider mb-2">
              Action
            </label>
            <div className="flex gap-2">
              {["dismiss", "warn", "suspend"].map((act) => (
                <button
                  key={act}
                  type="button"
                  onClick={() => setResolveAction(act)}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold uppercase tracking-wider border transition-colors ${
                    resolveAction === act
                      ? "bg-orange text-on-orange border-orange"
                      : "bg-bg-subtle text-fg border-border hover:border-orange"
                  }`}
                >
                  {t(`admin.reports.action${act.charAt(0).toUpperCase() + act.slice(1)}`)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-fg-secondary uppercase tracking-wider mb-2">
              {t("admin.reports.adminNotes")}
            </label>
            <textarea
              rows={3}
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              placeholder="Internal resolution notes..."
              className="w-full px-3 py-2 rounded-lg border border-border bg-bg text-sm text-fg"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setResolveReportTarget(null)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving..." : t("admin.reports.saveResolution")}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Suspend Tutor Dialog */}
      <Dialog
        isOpen={Boolean(suspendTarget)}
        onClose={() => setSuspendTarget(null)}
        title={t("admin.reports.suspendTutor")}
      >
        <form onSubmit={submitSuspendTutor} className="space-y-4">
          {actionError && <Alert variant="error">{actionError}</Alert>}

          <p className="text-xs md:text-sm text-fg-secondary">
            This will immediately unverify/suspend the tutor profile and send a notification email
            explaining the reason.
          </p>

          <div>
            <label className="block text-xs font-semibold text-fg-secondary uppercase tracking-wider mb-2">
              {t("admin.reports.suspendReason")}
            </label>
            <textarea
              rows={3}
              value={suspendReason}
              onChange={(e) => setSuspendReason(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-border bg-bg text-sm text-fg"
              required
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setSuspendTarget(null)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" variant="destructive" disabled={submitting}>
              {submitting ? "Suspending..." : t("admin.reports.suspendTutor")}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Resolve Replacement Dialog */}
      <Dialog
        isOpen={Boolean(resolveReplacementTarget)}
        onClose={() => setResolveReplacementTarget(null)}
        title="Resolve Replacement Request"
      >
        <form onSubmit={submitResolveReplacement} className="space-y-4">
          {actionError && <Alert variant="error">{actionError}</Alert>}

          <div>
            <label className="block text-xs font-semibold text-fg-secondary uppercase tracking-wider mb-2">
              Resolution Notes
            </label>
            <textarea
              rows={3}
              value={replacementNotes}
              onChange={(e) => setReplacementNotes(e.target.value)}
              placeholder="e.g., Contacted guardian and matched new tutor NUSRAT..."
              className="w-full px-3 py-2 rounded-lg border border-border bg-bg text-sm text-fg"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setResolveReplacementTarget(null)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving..." : "Mark Resolved"}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
