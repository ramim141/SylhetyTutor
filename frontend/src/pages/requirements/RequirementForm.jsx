import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useTranslation } from "../../i18n";
import { useLookups } from "../../hooks/useLookups";
import { toOptions } from "../../utils/lookups";
import { getFieldErrors, getFormError } from "../../api/errors";
import {
  createRequirement,
  getRequirement,
  publishRequirement,
  updateRequirement,
} from "../../api/requirements";
import { Alert } from "../../components/ui/Alert";
import { Button } from "../../components/ui/Button";
import { ChipSelect } from "../../components/ui/ChipSelect";
import { Input } from "../../components/ui/Input";
import { SelectField } from "../../components/ui/SelectField";
import { BottomNav } from "../../components/layout/BottomNav";

const EMPTY = {
  class_level: "",
  area: "",
  subjects: [],
  budget_min: "",
  budget_max: "",
  preferred_gender: "any",
  schedule_note: "",
};

const toNumber = (value) => (value === "" || value == null ? null : Number(value));

/** One page for a new or an existing draft: save it, or save and publish it. */
export default function RequirementForm() {
  const { id } = useParams();
  const { t, lang, has } = useTranslation();
  const navigate = useNavigate();
  const lookups = useLookups();
  const [values, setValues] = useState(EMPTY);
  const [loading, setLoading] = useState(Boolean(id));
  const [busy, setBusy] = useState(null); // "draft" | "publish"
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  // A new form becomes an existing draft once it has been saved, even if publishing then fails
  const [draftId, setDraftId] = useState(id || null);

  useEffect(() => {
    if (!id) return undefined;
    let active = true;
    getRequirement(id)
      .then((data) => {
        if (!active) return;
        if (data.status !== "draft") {
          navigate("/requirements", { replace: true });
          return;
        }
        setValues({
          class_level: data.class_level?.slug || "",
          area: data.area?.slug || "",
          subjects: data.subjects.map((s) => s.slug),
          budget_min: data.budget_min ?? "",
          budget_max: data.budget_max ?? "",
          preferred_gender: data.preferred_gender,
          schedule_note: data.schedule_note,
        });
        setLoading(false);
      })
      .catch(() => {
        if (active) navigate("/requirements", { replace: true });
      });
    return () => {
      active = false;
    };
  }, [id, navigate]);

  const set = (name) => (value) => setValues((v) => ({ ...v, [name]: value }));

  const body = () => {
    const out = {
      subjects: values.subjects,
      budget_min: toNumber(values.budget_min),
      budget_max: toNumber(values.budget_max),
      preferred_gender: values.preferred_gender,
      schedule_note: values.schedule_note.trim(),
    };
    // An empty select is "not chosen yet": leave it out rather than send a blank slug
    if (values.class_level) out.class_level = values.class_level;
    if (values.area) out.area = values.area;
    return out;
  };

  const submit = async (mode) => {
    setBusy(mode);
    setErrors({});
    setFormError("");
    try {
      let current = draftId;
      if (current) {
        await updateRequirement(current, body());
      } else {
        current = (await createRequirement(body())).id;
        setDraftId(current);
      }
      if (mode === "publish") {
        await publishRequirement(current);
        navigate("/requirements", { state: { notice: "published" } });
      } else {
        navigate("/requirements", { state: { notice: "saved" } });
      }
    } catch (err) {
      setErrors(getFieldErrors(err, { t, has }));
      setFormError(getFormError(err, { t, has }) || "");
      setBusy(null);
    }
  };

  const subjectOptions = toOptions(lookups.subjects, lang);
  const genderOptions = ["any", "male", "female"].map((value) => ({
    value,
    label: t(`req.gender.${value}`),
  }));

  return (
    <div className="min-h-dvh bg-bg-subtle text-fg pb-28 md:pb-10">
      <header className="sticky top-0 z-40 bg-bg/95 backdrop-blur-md border-b border-border pt-[env(safe-area-inset-top)]">
        <div className="max-w-lg mx-auto px-2 h-14 flex items-center gap-1">
          <Link
            to="/requirements"
            className="w-11 h-11 flex items-center justify-center rounded-full text-fg-secondary hover:text-fg hover:bg-bg-subtle"
            aria-label={t("common.back")}
          >
            <ArrowLeft className="w-5 h-5" aria-hidden />
          </Link>
          <h1 className="text-lg font-display font-bold flex-1">
            {id ? t("req.form.titleEdit") : t("req.form.titleNew")}
          </h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-5">
        {loading ? (
          <p role="status" className="text-sm text-fg-secondary text-center py-10">
            {t("common.loading")}
          </p>
        ) : (
          <form
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              submit("publish");
            }}
            className="bg-bg-card border border-border rounded-lg p-5 flex flex-col gap-5"
          >
            {formError && <Alert variant="error">{formError}</Alert>}

            <SelectField
              label={t("req.form.classLevel")}
              value={values.class_level}
              onChange={set("class_level")}
              options={toOptions(lookups.class_levels, lang)}
              error={errors.class_level}
            />
            <SelectField
              label={t("req.form.area")}
              value={values.area}
              onChange={set("area")}
              options={toOptions(lookups.areas, lang)}
              error={errors.area}
            />
            <ChipSelect
              label={t("req.form.subjects")}
              hint={t("req.form.subjectsHint")}
              options={subjectOptions}
              value={values.subjects}
              onChange={set("subjects")}
              error={errors.subjects}
            />

            <div className="grid grid-cols-2 gap-3">
              <Input
                label={t("req.form.budgetMin")}
                type="number"
                inputMode="numeric"
                min="500"
                value={values.budget_min}
                onChange={(e) => set("budget_min")(e.target.value)}
                error={errors.budget_min}
              />
              <Input
                label={t("req.form.budgetMax")}
                type="number"
                inputMode="numeric"
                min="500"
                value={values.budget_max}
                onChange={(e) => set("budget_max")(e.target.value)}
                error={errors.budget_max}
              />
            </div>
            <p className="-mt-3 text-xs text-fg-muted">{t("req.form.budgetHint")}</p>

            <SelectField
              label={t("req.form.gender")}
              value={values.preferred_gender}
              onChange={(value) => set("preferred_gender")(value || "any")}
              options={genderOptions}
            />

            <Input
              label={t("req.form.schedule")}
              helperText={t("req.form.scheduleHint")}
              value={values.schedule_note}
              maxLength={300}
              onChange={(e) => set("schedule_note")(e.target.value)}
              error={errors.schedule_note}
            />

            <div className="flex flex-col gap-3 pt-1">
              <Button type="submit" size="lg" loading={busy === "publish"} disabled={Boolean(busy)}>
                {t("req.action.publish")}
              </Button>
              <Button
                type="button"
                variant="outline"
                loading={busy === "draft"}
                disabled={Boolean(busy)}
                onClick={() => submit("draft")}
              >
                {t("req.action.saveDraft")}
              </Button>
            </div>
          </form>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
