import {
  EDIT_FLOW,
  FULL_FLOW,
  STEP_FIELDS,
  draftFrom,
  patchForStep,
  startIndex,
  stepOfField,
  validateStep,
  yearKey,
} from "./steps";

const profile = (extra = {}) => ({
  gender: "",
  university: null,
  department: "",
  year: "",
  student_id_number: "",
  bio: "",
  fee_min: null,
  fee_max: null,
  subjects: [],
  class_levels: [],
  areas: [],
  availability: [],
  documents: { nid: false, student_id: false },
  ...extra,
});

describe("stepOfField", () => {
  it("knows where every field the server asks for is edited", () => {
    const asked = [
      "gender",
      "nid_photo",
      "student_id_photo",
      "university",
      "department",
      "year",
      "student_id_number",
      "subjects",
      "class_levels",
      "areas",
      "availability",
      "fee_min",
      "fee_max",
    ]; // the backend's TutorProfile.FORM_ORDER
    for (const field of asked) expect(stepOfField(field)).not.toBeNull();
    expect(Object.values(STEP_FIELDS).flat().sort()).toEqual([...asked].sort());
  });

  it("returns null for something it does not know", () => {
    expect(stepOfField("bio")).toBeNull();
  });
});

describe("startIndex", () => {
  it("starts a new tutor at the first step", () => {
    expect(startIndex(FULL_FLOW, Object.values(STEP_FIELDS).flat())).toBe(0);
  });

  it("resumes at the first step that still has something missing", () => {
    expect(startIndex(FULL_FLOW, ["university", "fee_min", "fee_max"])).toBe(2);
    expect(startIndex(FULL_FLOW, ["areas"])).toBe(4);
  });

  it("goes to the review when nothing is missing", () => {
    expect(startIndex(FULL_FLOW, [])).toBe(FULL_FLOW.length - 1);
    expect(FULL_FLOW[startIndex(FULL_FLOW, [])]).toBe("review");
  });

  it("an approved tutor always starts at the first editable step", () => {
    expect(startIndex(EDIT_FLOW, [])).toBe(0);
  });
});

describe("draftFrom", () => {
  it("turns an empty profile into empty inputs", () => {
    const draft = draftFrom(profile());
    expect(draft).toMatchObject({
      gender: "",
      university: "",
      fee_min: "",
      fee_max: "",
      subjects: [],
    });
  });

  it("keeps fees as text and copies the lists", () => {
    const source = profile({
      fee_min: 3000,
      fee_max: 5000,
      subjects: ["math"],
      availability: [{ day: "sat", slot: "evening" }],
    });
    const draft = draftFrom(source);

    expect(draft.fee_min).toBe("3000");
    draft.subjects.push("physics");
    expect(source.subjects).toEqual(["math"]);
  });
});

describe("validateStep", () => {
  const empty = draftFrom(profile());

  it("step 1 needs a gender", () => {
    expect(validateStep(1, empty, profile())).toEqual({ gender: "error.tr.required" });
    expect(validateStep(1, { ...empty, gender: "female" }, profile())).toEqual({});
  });

  it("step 2 needs both documents uploaded", () => {
    expect(Object.keys(validateStep(2, empty, profile()))).toEqual(["nid", "student_id"]);
    expect(
      validateStep(2, empty, profile({ documents: { nid: true, student_id: false } })),
    ).toEqual({
      student_id: "error.file.required",
    });
    expect(validateStep(2, empty, profile({ documents: { nid: true, student_id: true } }))).toEqual(
      {},
    );
  });

  it("step 3 needs university, department, year and student ID, ignoring blanks", () => {
    expect(Object.keys(validateStep(3, { ...empty, department: "   " }, profile()))).toEqual([
      "university",
      "department",
      "year",
      "studentId",
    ]); // fmt: skip
    const ok = {
      ...empty,
      university: "sust",
      department: "CSE",
      year: "2nd Year",
      student_id_number: "1",
    };
    expect(validateStep(3, ok, profile())).toEqual({});
  });

  it("steps 4 and 5 need at least one choice in each list", () => {
    expect(Object.keys(validateStep(4, empty, profile()))).toEqual(["subjects", "classLevels"]);
    expect(Object.keys(validateStep(5, empty, profile()))).toEqual(["areas", "availability"]);
    expect(validateStep(4, { ...empty, subjects: ["a"], class_levels: ["b"] }, profile())).toEqual(
      {},
    );
    expect(
      validateStep(
        5,
        { ...empty, areas: ["a"], availability: [{ day: "sat", slot: "evening" }] },
        profile(),
      ),
    ).toEqual({});
  });

  it.each([
    [
      { fee_min: "", fee_max: "" },
      { feeMin: "error.tr.required", feeMax: "error.tr.required" },
    ],
    [{ fee_min: "0", fee_max: "5000" }, { feeMin: "error.feeMin.min_value" }],
    [{ fee_min: "499", fee_max: "5000" }, { feeMin: "error.feeMin.min_value" }],
    [{ fee_min: "abc", fee_max: "5000" }, { feeMin: "error.feeMin.min_value" }],
    [{ fee_min: "3000", fee_max: "-5" }, { feeMax: "error.feeMax.min_value" }],
    [{ fee_min: "3000", fee_max: "15001" }, { feeMax: "error.feeMax.max_value" }],
    [{ fee_min: "6000", fee_max: "4000" }, { feeMin: "error.feeMin.fee_range" }],
    [{ fee_min: "3000", fee_max: "3000" }, {}],
    [{ fee_min: "500", fee_max: "15000" }, {}],
    [{ fee_min: "3000", fee_max: "5000" }, {}],
  ])("step 6 checks the fee %j", (fees, expected) => {
    expect(validateStep(6, { ...empty, ...fees }, profile())).toEqual(expected);
  });

  it("step 6 refuses a bio over 400 characters but allows none", () => {
    const fees = { fee_min: "3000", fee_max: "5000" };
    expect(validateStep(6, { ...empty, ...fees, bio: "x".repeat(401) }, profile())).toEqual({
      bio: "error.bio.max_length",
    });
    expect(validateStep(6, { ...empty, ...fees, bio: "" }, profile())).toEqual({});
  });
});

describe("patchForStep", () => {
  const draft = {
    ...draftFrom(profile()),
    gender: "female",
    university: "sust",
    department: "  CSE ",
    year: "2nd Year",
    student_id_number: " 2021 ",
    subjects: ["math"],
    class_levels: ["hsc"],
    areas: ["amberkhana"],
    availability: [{ day: "sat", slot: "evening" }],
    bio: "  Hello ",
    fee_min: "3000",
    fee_max: "5000",
  };

  it("sends only that step's fields, trimmed, with fees as numbers", () => {
    expect(patchForStep(1, draft)).toEqual({ gender: "female" });
    expect(patchForStep(3, draft)).toEqual({
      university: "sust",
      department: "CSE",
      year: "2nd Year",
      student_id_number: "2021",
    });
    expect(patchForStep(4, draft)).toEqual({ subjects: ["math"], class_levels: ["hsc"] });
    expect(patchForStep(5, draft)).toEqual({
      areas: ["amberkhana"],
      availability: [{ day: "sat", slot: "evening" }],
    });
    expect(patchForStep(6, draft)).toEqual({ bio: "Hello", fee_min: 3000, fee_max: 5000 });
  });

  it("sends nothing for the documents step and the review", () => {
    expect(patchForStep(2, draft)).toBeNull();
    expect(patchForStep("review", draft)).toBeNull();
  });
});

describe("yearKey", () => {
  it("maps the stored English text to a translatable key", () => {
    expect(yearKey("3rd Year")).toBe("tr.year.3");
    expect(yearKey("Masters")).toBe("tr.year.5");
    expect(yearKey("Final year")).toBeNull();
  });
});
