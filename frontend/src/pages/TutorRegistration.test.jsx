import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import TutorRegistration from "./TutorRegistration";
import { getLookups } from "../api/lookups";
import { getMyProfile, saveMyProfile, submitMyProfile } from "../api/tutors";
import { mixed } from "../i18n";
import { useAuthStore } from "../store/authStore";
import { useLanguageStore } from "../store/languageStore";

vi.mock("../api/tutors", () => ({
  getMyProfile: vi.fn(),
  saveMyProfile: vi.fn(),
  submitMyProfile: vi.fn(),
  uploadDocument: vi.fn(),
  deleteDocument: vi.fn(),
  getDocumentBlob: vi.fn().mockResolvedValue(new Blob(["x"])),
}));
vi.mock("../api/lookups", () => ({ getLookups: vi.fn() }));
vi.mock("../api/auth", () => ({ authApi: { uploadAvatar: vi.fn(), deleteAvatar: vi.fn() } }));

const LOOKUPS = {
  areas: [
    { slug: "amberkhana", name_en: "Amberkhana", name_bn: "আম্বরখানা" },
    { slug: "zindabazar", name_en: "Zindabazar", name_bn: "জিন্দাবাজার" },
  ],
  subjects: [
    { slug: "math", name_en: "Math", name_bn: "গণিত" },
    { slug: "physics", name_en: "Physics", name_bn: "পদার্থবিজ্ঞান" },
  ],
  class_levels: [{ slug: "hsc", name_en: "HSC", name_bn: "এইচএসসি" }],
  universities: [{ slug: "sust", name_en: "SUST", name_bn: "সাস্ট", short_name: "SUST" }],
};

const ALL_MISSING = [
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
]; // fmt: skip
const KEY_FOR_PATCH = {
  gender: ["gender"],
  university: ["university"],
  department: ["department"],
  year: ["year"],
  student_id_number: ["student_id_number"],
  subjects: ["subjects"],
  class_levels: ["class_levels"],
  areas: ["areas"],
  availability: ["availability"],
  fee_min: ["fee_min"],
  fee_max: ["fee_max"],
}; // fmt: skip

const baseProfile = (extra = {}) => ({
  id: "p1",
  slug: null,
  status: "draft",
  rejection_reason: "",
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
  missing: [...ALL_MISSING],
  required_total: 13,
  can_edit: true,
  ...extra,
});

// A tiny stand-in for the server: saving a field removes it from `missing`
function serve(initial) {
  let current = initial;
  getMyProfile.mockImplementation(async () => current);
  saveMyProfile.mockImplementation(async (patch) => {
    const solved = Object.keys(patch).flatMap((key) => KEY_FOR_PATCH[key] ?? []);
    current = {
      ...current,
      ...patch,
      university: patch.university ?? current.university,
      missing: current.missing.filter((field) => !solved.includes(field)),
    };
    return current;
  });
}

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={["/tutor/profile"]}>
      <Routes>
        <Route path="/tutor/profile" element={<TutorRegistration />} />
        <Route path="/dashboard" element={<div>Dashboard page</div>} />
      </Routes>
    </MemoryRouter>,
  );

const stepTitle = (n) =>
  screen.findByRole("heading", { level: 2, name: mixed[`tr.step.${n}.title`] });
const next = () => userEvent.click(screen.getByRole("button", { name: mixed["tr.next"] }));
const labelled = (key) => screen.getByLabelText(mixed[key]);

describe("TutorRegistration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useLanguageStore.setState({ lang: "mixed" });
    useAuthStore.setState({
      user: {
        id: "u1",
        full_name: "Nusrat Jahan",
        phone: "01712345678",
        role: "tutor",
        avatar: null,
      },
      status: "authenticated",
    });
    getLookups.mockResolvedValue(LOOKUPS);
  });

  it("starts a new tutor on step 1 of 7 (six steps and the review)", async () => {
    serve(baseProfile());
    renderPage();

    await stepTitle(1);
    expect(screen.getByText("Step 1 / 7")).toBeInTheDocument();
    expect(screen.getByText("Nusrat Jahan")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: mixed["tr.back"] })).not.toBeInTheDocument();
  });

  it("asks for a gender before moving on and sends nothing", async () => {
    serve(baseProfile());
    renderPage();
    await stepTitle(1);

    await next();

    expect(screen.getByRole("alert", { name: "" })).toHaveTextContent(mixed["error.tr.required"]);
    expect(saveMyProfile).not.toHaveBeenCalled();
    expect(screen.getByText("Step 1 / 7")).toBeInTheDocument();
  });

  it("saves the step when moving on, then shows the next one", async () => {
    serve(baseProfile());
    renderPage();
    await stepTitle(1);

    await userEvent.click(screen.getByRole("radio", { name: mixed["search.gender.female"] }));
    await next();

    await stepTitle(2);
    expect(saveMyProfile).toHaveBeenCalledWith({ gender: "female" });
  });

  it("holds the tutor on the documents step until both are uploaded", async () => {
    serve(baseProfile({ gender: "female", missing: ALL_MISSING.slice(1) }));
    renderPage();
    await stepTitle(2);

    await next();

    expect(screen.getAllByText(mixed["error.file.required"])).toHaveLength(2);
    expect(saveMyProfile).not.toHaveBeenCalled();
  });

  it("skips the steps already finished (uploads were saved when they were made)", async () => {
    serve(
      baseProfile({
        gender: "female",
        documents: { nid: true, student_id: true },
        missing: ALL_MISSING.slice(3),
      }),
    );
    renderPage();
    await stepTitle(3); // resumes past the finished steps
  });

  it("resumes at the first step that still has something missing", async () => {
    serve(
      baseProfile({
        gender: "female",
        documents: { nid: true, student_id: true },
        university: "sust",
        department: "CSE",
        year: "2nd Year",
        student_id_number: "2021",
        missing: ["subjects", "class_levels", "areas", "availability", "fee_min", "fee_max"],
      }),
    );
    renderPage();

    await stepTitle(4);
    expect(screen.getByText("Step 4 / 7")).toBeInTheDocument();
  });

  it("step 3: checks the fields, then saves them trimmed", async () => {
    serve(
      baseProfile({
        gender: "female",
        documents: { nid: true, student_id: true },
        missing: ALL_MISSING.slice(3),
      }),
    );
    renderPage();
    await stepTitle(3);

    await next();
    expect(screen.getAllByRole("alert")).toHaveLength(4);

    await userEvent.selectOptions(labelled("tr.university"), "sust");
    await userEvent.type(labelled("tr.department"), "  CSE ");
    await userEvent.selectOptions(labelled("tr.year"), "2nd Year");
    await userEvent.type(labelled("tr.studentId"), "2021331001");
    await next();

    await stepTitle(4);
    expect(saveMyProfile).toHaveBeenCalledWith({
      university: "sust",
      department: "CSE",
      year: "2nd Year",
      student_id_number: "2021331001",
    });
  });

  it("step 4 and 5: choose subjects, classes, areas and free times", async () => {
    serve(
      baseProfile({
        gender: "female",
        documents: { nid: true, student_id: true },
        university: "sust",
        department: "CSE",
        year: "2nd Year",
        student_id_number: "1",
        missing: ["subjects", "class_levels", "areas", "availability", "fee_min", "fee_max"],
      }),
    );
    renderPage();
    await stepTitle(4);

    await next();
    expect(screen.getAllByText(mixed["error.tr.pickOne"])).toHaveLength(2);

    await userEvent.click(screen.getByRole("button", { name: "গণিত" }));
    await userEvent.click(screen.getByRole("button", { name: "পদার্থবিজ্ঞান" }));
    await userEvent.click(screen.getByRole("button", { name: "এইচএসসি" }));
    await next();
    await stepTitle(5);
    expect(saveMyProfile).toHaveBeenLastCalledWith({
      subjects: ["math", "physics"],
      class_levels: ["hsc"],
    });

    await userEvent.click(screen.getByRole("button", { name: "আম্বরখানা" }));
    const cell = mixed["tr.availability.slot"]
      .replace("{day}", mixed["profile.day.sat"])
      .replace("{slot}", mixed["profile.slot.evening"]);
    await userEvent.click(screen.getByRole("button", { name: cell }));
    expect(screen.getByRole("button", { name: cell })).toHaveAttribute("aria-pressed", "true");
    await userEvent.click(screen.getByRole("button", { name: cell })); // tap again: off
    expect(screen.getByRole("button", { name: cell })).toHaveAttribute("aria-pressed", "false");
    await userEvent.click(screen.getByRole("button", { name: cell }));
    await next();

    await stepTitle(6);
    expect(saveMyProfile).toHaveBeenLastCalledWith({
      areas: ["amberkhana"],
      availability: [{ day: "sat", slot: "evening" }],
    });
  });

  describe("step 6: bio and fee", () => {
    const lastStep = () =>
      serve(
        baseProfile({
          gender: "female",
          documents: { nid: true, student_id: true },
          university: "sust",
          department: "CSE",
          year: "2nd Year",
          student_id_number: "1",
          subjects: ["math"],
          class_levels: ["hsc"],
          areas: ["amberkhana"],
          availability: [{ day: "sat", slot: "evening" }],
          missing: ["fee_min", "fee_max"],
        }),
      );

    it("needs both fees and keeps only digits", async () => {
      lastStep();
      renderPage();
      await stepTitle(6);

      await next();
      expect(screen.getAllByText(mixed["error.tr.required"])).toHaveLength(2);

      await userEvent.type(labelled("tr.fee.min"), "3a,5 00");
      expect(labelled("tr.fee.min")).toHaveValue("3500");
    });

    it("refuses a minimum above the maximum", async () => {
      lastStep();
      renderPage();
      await stepTitle(6);

      await userEvent.type(labelled("tr.fee.min"), "6000");
      await userEvent.type(labelled("tr.fee.max"), "4000");
      await next();

      expect(screen.getByText(mixed["error.feeMin.fee_range"])).toBeInTheDocument();
      expect(saveMyProfile).not.toHaveBeenCalled();
    });

    it("saves the fees as numbers and the bio trimmed, then shows the review", async () => {
      lastStep();
      renderPage();
      await stepTitle(6);

      await userEvent.type(labelled("tr.fee.min"), "3000");
      await userEvent.type(labelled("tr.fee.max"), "5000");
      await userEvent.type(labelled("tr.bio.label"), "  I teach physics. ");
      expect(screen.getByText("19/400")).toBeInTheDocument();
      await next();

      await stepTitle("review");
      expect(saveMyProfile).toHaveBeenCalledWith({
        bio: "I teach physics.",
        fee_min: 3000,
        fee_max: 5000,
      });
    });

    it("shows the server's own reason next to the field when it disagrees", async () => {
      lastStep();
      saveMyProfile.mockRejectedValue({
        response: {
          status: 400,
          data: { code: "invalid", fields: { fee_min: [{ code: "fee_range", message: "x" }] } },
        },
      });
      renderPage();
      await stepTitle(6);

      await userEvent.type(labelled("tr.fee.min"), "3000");
      await userEvent.type(labelled("tr.fee.max"), "5000");
      await next();

      expect(await screen.findByText(mixed["error.feeMin.fee_range"])).toBeInTheDocument();
      expect(screen.getByText("Step 6 / 7")).toBeInTheDocument();
    });
  });

  it("going Back keeps what was typed and does not save", async () => {
    serve(baseProfile({ gender: "female", missing: ALL_MISSING.slice(1) }));
    renderPage();
    await stepTitle(2);
    saveMyProfile.mockClear();

    await userEvent.click(screen.getByRole("button", { name: mixed["tr.back"] }));

    await stepTitle(1);
    expect(screen.getByRole("radio", { name: mixed["search.gender.female"] })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    expect(saveMyProfile).not.toHaveBeenCalled();
  });

  describe("review", () => {
    const complete = (extra = {}) =>
      baseProfile({
        gender: "female",
        documents: { nid: true, student_id: true },
        university: "sust",
        department: "CSE",
        year: "2nd Year",
        student_id_number: "2021331001",
        subjects: ["math"],
        class_levels: ["hsc"],
        areas: ["amberkhana"],
        availability: [{ day: "sat", slot: "evening" }],
        fee_min: 3000,
        fee_max: 5000,
        bio: "Hello there",
        missing: [],
        ...extra,
      });

    it("lands on the review when nothing is missing, with a ready submit button", async () => {
      serve(complete());
      renderPage();

      await stepTitle("review");
      expect(screen.getByText(mixed["tr.review.ready"])).toBeInTheDocument();
      expect(screen.getByText("Step 7 / 7")).toBeInTheDocument();
      expect(screen.getByText("৳3,000–৳5,000")).toBeInTheDocument();
      expect(screen.getByText("গণিত")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: mixed["tr.submit"] })).toBeEnabled();
    });

    it("sends the profile for verification and goes to the dashboard", async () => {
      serve(complete());
      submitMyProfile.mockResolvedValue({ status: "pending" });
      renderPage();
      await stepTitle("review");

      await userEvent.click(screen.getByRole("button", { name: mixed["tr.submit"] }));

      expect(await screen.findByText("Dashboard page")).toBeInTheDocument();
      expect(submitMyProfile).toHaveBeenCalledTimes(1);
    });

    it("lists what is missing on the review and jumps to the step that fixes it", async () => {
      const gaps = complete({ missing: ["fee_min", "fee_max"], fee_min: null, fee_max: null });
      // every step but 6 is done, so the form resumes at 6; save once to reach the review
      serve(gaps);
      renderPage();
      await stepTitle(6);
      await userEvent.type(labelled("tr.fee.min"), "3000");
      await userEvent.type(labelled("tr.fee.max"), "5000");
      saveMyProfile.mockResolvedValue({
        ...gaps,
        fee_min: 3000,
        fee_max: 5000,
        missing: ["university"],
      });
      await next();

      await stepTitle("review");
      const missing = screen.getByRole("region", { name: mixed["tr.review.missing"] });
      expect(within(missing).getByText(mixed["tr.field.university"])).toBeInTheDocument();
      expect(screen.getByRole("button", { name: mixed["tr.submit"] })).toBeDisabled();

      await userEvent.click(within(missing).getByRole("button", { name: mixed["tr.review.fix"] }));
      await stepTitle(3);
    });

    it("shows the server's list of what is missing when it refuses the submit", async () => {
      serve(complete());
      submitMyProfile.mockRejectedValue({
        response: {
          status: 400,
          data: { code: "invalid", fields: { nid_photo: [{ code: "required", message: "x" }] } },
        },
      });
      renderPage();
      await stepTitle("review");
      getMyProfile.mockResolvedValue(
        complete({ missing: ["nid_photo"], documents: { nid: false, student_id: true } }),
      );

      await userEvent.click(screen.getByRole("button", { name: mixed["tr.submit"] }));

      expect(await screen.findByText(mixed["tr.field.nid_photo"])).toBeInTheDocument();
      expect(screen.queryByText("Dashboard page")).not.toBeInTheDocument();
      // and the refresh of the missing list did not wipe the reason
      expect(screen.getByRole("button", { name: mixed["tr.submit"] })).toBeDisabled();
    });

    it("explains a conflict, such as already submitted", async () => {
      serve(complete());
      submitMyProfile.mockRejectedValue({
        response: { status: 409, data: { code: "already_submitted", detail: "x" } },
      });
      renderPage();
      await stepTitle("review");

      await userEvent.click(screen.getByRole("button", { name: mixed["tr.submit"] }));

      expect(await screen.findByText(mixed["error.already_submitted"])).toBeInTheDocument();
    });
  });

  it("shows the team's reason when the profile was rejected", async () => {
    serve(
      baseProfile({ status: "rejected", rejection_reason: "Student ID is blurry", missing: [] }),
    );
    renderPage();

    await stepTitle("review");
    expect(
      screen.getByText(mixed["tr.rejectedBanner"].replace("{reason}", "Student ID is blurry")),
    ).toBeInTheDocument();
  });

  it("sends a profile that is under review back to the dashboard", async () => {
    serve(baseProfile({ status: "pending", missing: [] }));
    renderPage();

    expect(await screen.findByText("Dashboard page")).toBeInTheDocument();
  });

  describe("after approval", () => {
    const approved = () =>
      serve(
        baseProfile({
          status: "approved",
          missing: [],
          fee_min: 3000,
          fee_max: 5000,
          subjects: ["math"],
          class_levels: ["hsc"],
          areas: ["amberkhana"],
          availability: [{ day: "sat", slot: "evening" }],
        }),
      );

    it("only offers the teaching steps and says the rest is locked", async () => {
      approved();
      renderPage();

      await stepTitle(4);
      expect(screen.getByText("Step 1 / 3")).toBeInTheDocument();
      expect(screen.getByText(mixed["tr.lockedIdentity"])).toBeInTheDocument();
    });

    it("saves the last step as changes and returns to the dashboard", async () => {
      approved();
      renderPage();
      await stepTitle(4);

      await next();
      await stepTitle(5);
      await next();
      await stepTitle(6);
      await userEvent.click(screen.getByRole("button", { name: mixed["tr.saveChanges"] }));

      expect(await screen.findByText("Dashboard page")).toBeInTheDocument();
      expect(saveMyProfile).toHaveBeenLastCalledWith({ bio: "", fee_min: 3000, fee_max: 5000 });
      expect(submitMyProfile).not.toHaveBeenCalled();
    });
  });

  it("explains that only tutor accounts have a tutor profile", async () => {
    getMyProfile.mockRejectedValue({
      response: { status: 403, data: { code: "permission_denied" } },
    });
    renderPage();

    expect(await screen.findByText(mixed["tr.notTutor"])).toBeInTheDocument();
  });

  it("offers a retry when the profile cannot be loaded", async () => {
    serve(baseProfile());
    getMyProfile.mockRejectedValueOnce(new Error("Network Error"));
    renderPage();

    expect(await screen.findByText(mixed["tr.loadError"])).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: mixed["common.retry"] }));

    await stepTitle(1);
  });

  it("has a way to finish later that goes to the dashboard", async () => {
    serve(baseProfile());
    renderPage();
    await stepTitle(1);

    await userEvent.click(screen.getByRole("link", { name: mixed["tr.later"] }));

    await waitFor(() => expect(screen.getByText("Dashboard page")).toBeInTheDocument());
  });
});
