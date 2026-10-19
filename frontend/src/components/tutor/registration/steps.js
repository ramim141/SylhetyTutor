// The tutor registration form: which fields belong to which step, where to resume, what to
// check before moving on, and what each step saves. No React in here, so it is easy to test.

/** Backend field names (see TutorProfile.FORM_ORDER) by step. */
export const STEP_FIELDS = {
  1: ["gender"],
  2: ["nid_photo", "student_id_photo"],
  3: ["university", "department", "year", "student_id_number"],
  4: ["subjects", "class_levels"],
  5: ["areas", "availability"],
  6: ["fee_min", "fee_max"],
};

export const FULL_FLOW = [1, 2, 3, 4, 5, 6, "review"];
// After approval the identity steps are locked; only what you teach, where and the fee change
export const EDIT_FLOW = [4, 5, 6];

export const YEAR_VALUES = ["1st Year", "2nd Year", "3rd Year", "4th Year", "Masters"];
export const BIO_MAX = 400;
export const FEE_MIN = 500;
export const FEE_MAX = 15000;

/** Fields the server reports as `student_id_number`, `fee_min` … as the form's error keys. */
export const FIELD_NAMES = {
  student_id_number: "studentId",
  fee_min: "feeMin",
  fee_max: "feeMax",
  class_levels: "classLevels",
};

export function stepOfField(field) {
  const entry = Object.entries(STEP_FIELDS).find(([, fields]) => fields.includes(field));
  return entry ? Number(entry[0]) : null;
}

/** Index in `flow` where a tutor should land: the first step that still has something missing. */
export function startIndex(flow, missing) {
  if (flow === EDIT_FLOW) return 0;
  const index = flow.findIndex(
    (step) => step !== "review" && STEP_FIELDS[step].some((field) => missing.includes(field)),
  );
  return index === -1 ? flow.length - 1 : index; // nothing missing: straight to the review
}

/** The form's working copy of my profile (fees as text, so a half-typed number is fine). */
export function draftFrom(profile) {
  return {
    gender: profile.gender || "",
    university: profile.university || "",
    department: profile.department || "",
    year: profile.year || "",
    student_id_number: profile.student_id_number || "",
    subjects: [...profile.subjects],
    class_levels: [...profile.class_levels],
    areas: [...profile.areas],
    availability: profile.availability.map(({ day, slot }) => ({ day, slot })),
    bio: profile.bio || "",
    fee_min: profile.fee_min == null ? "" : String(profile.fee_min),
    fee_max: profile.fee_max == null ? "" : String(profile.fee_max),
  };
}

const blank = (value) => !String(value ?? "").trim();
const whole = (value) => /^\d+$/.test(String(value).trim()) && Number(value) >= 1;

/**
 * What is wrong with a step, before anything is sent: `{ errorKey: i18nKey }`. Empty = fine.
 * The server checks everything again; this just saves a round trip and speaks first.
 */
export function validateStep(step, draft, profile) {
  const problems = {};
  if (step === 1 && !draft.gender) problems.gender = "error.tr.required";
  if (step === 2) {
    if (!profile.documents?.nid) problems.nid = "error.file.required";
    if (!profile.documents?.student_id) problems.student_id = "error.file.required";
  }
  if (step === 3) {
    if (!draft.university) problems.university = "error.tr.required";
    if (blank(draft.department)) problems.department = "error.tr.required";
    if (!draft.year) problems.year = "error.tr.required";
    if (blank(draft.student_id_number)) problems.studentId = "error.tr.required";
  }
  if (step === 4) {
    if (draft.subjects.length === 0) problems.subjects = "error.tr.pickOne";
    if (draft.class_levels.length === 0) problems.classLevels = "error.tr.pickOne";
  }
  if (step === 5) {
    if (draft.areas.length === 0) problems.areas = "error.tr.pickOne";
    if (draft.availability.length === 0) problems.availability = "error.tr.pickOne";
  }
  if (step === 6) {
    if (blank(draft.fee_min)) problems.feeMin = "error.tr.required";
    else if (!whole(draft.fee_min) || Number(draft.fee_min) < FEE_MIN) problems.feeMin = "error.feeMin.min_value";
    else if (Number(draft.fee_min) > FEE_MAX) problems.feeMin = "error.feeMin.max_value";

    if (blank(draft.fee_max)) problems.feeMax = "error.tr.required";
    else if (!whole(draft.fee_max) || Number(draft.fee_max) < FEE_MIN) problems.feeMax = "error.feeMax.min_value";
    else if (Number(draft.fee_max) > FEE_MAX) problems.feeMax = "error.feeMax.max_value";

    if (!problems.feeMin && !problems.feeMax && Number(draft.fee_min) > Number(draft.fee_max)) {
      problems.feeMin = "error.feeMin.fee_range";
    }
    if (draft.bio.length > BIO_MAX) problems.bio = "error.bio.max_length";
  }
  return problems;
}

/** What a step saves (null when saving happens elsewhere, e.g. uploads, or nothing to send). */
export function patchForStep(step, draft) {
  switch (step) {
    case 1:
      return { gender: draft.gender };
    case 3:
      return {
        university: draft.university,
        department: draft.department.trim(),
        year: draft.year,
        student_id_number: draft.student_id_number.trim(),
      };
    case 4:
      return { subjects: draft.subjects, class_levels: draft.class_levels };
    case 5:
      return { areas: draft.areas, availability: draft.availability };
    case 6:
      return {
        bio: draft.bio.trim(),
        fee_min: Number(draft.fee_min),
        fee_max: Number(draft.fee_max),
      };
    default:
      return null;
  }
}

/** Stored year text -> i18n key suffix (so a Bangla page can say "৩য় বর্ষ"); null if unknown. */
export function yearKey(value) {
  const index = YEAR_VALUES.indexOf(value);
  return index === -1 ? null : `tr.year.${index + 1}`;
}
