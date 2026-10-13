import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import RequirementForm from "./RequirementForm";
import { mixed } from "../../i18n";
import { getLookups } from "../../api/lookups";
import {
  createRequirement,
  getRequirement,
  publishRequirement,
  updateRequirement,
} from "../../api/requirements";
import { useAuthStore } from "../../store/authStore";
import { useLanguageStore } from "../../store/languageStore";

vi.mock("../../api/lookups", () => ({ getLookups: vi.fn() }));
vi.mock("../../api/requirements", () => ({
  createRequirement: vi.fn(),
  getRequirement: vi.fn(),
  publishRequirement: vi.fn(),
  updateRequirement: vi.fn(),
}));

const LOOKUPS = {
  areas: [{ slug: "amberkhana", name_en: "Amberkhana", name_bn: "আম্বরখানা" }],
  subjects: [
    { slug: "math", name_en: "Math", name_bn: "গণিত" },
    { slug: "physics", name_en: "Physics", name_bn: "পদার্থ" },
  ],
  class_levels: [{ slug: "hsc", name_en: "HSC", name_bn: "এইচএসসি" }],
  universities: [],
};

function renderForm(path = "/requirements/new") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/requirements/new" element={<RequirementForm />} />
        <Route path="/requirements/:id/edit" element={<RequirementForm />} />
        <Route path="/requirements" element={<p>LIST PAGE</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

async function fillRequired(user) {
  await screen.findByRole("option", { name: "এইচএসসি" });
  await user.selectOptions(screen.getByLabelText(mixed["req.form.classLevel"]), "hsc");
  await user.selectOptions(screen.getByLabelText(mixed["req.form.area"]), "amberkhana");
  await user.click(screen.getByRole("button", { name: "গণিত" }));
}

function apiError(status, data) {
  return { response: { status, data } };
}

describe("RequirementForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useLanguageStore.setState({ lang: "mixed" });
    useAuthStore.setState({
      user: { full_name: "Karim", role: "guardian" },
      status: "authenticated",
    });
    getLookups.mockResolvedValue(LOOKUPS);
  });

  it("saves a draft with lookups sent as slugs and goes back to the list", async () => {
    createRequirement.mockResolvedValue({ id: "r1" });
    const user = userEvent.setup();
    renderForm();

    await fillRequired(user);
    await user.type(screen.getByLabelText(mixed["req.form.budgetMin"]), "3000");
    await user.click(screen.getByRole("button", { name: mixed["req.action.saveDraft"] }));

    await waitFor(() =>
      expect(createRequirement).toHaveBeenCalledWith({
        class_level: "hsc",
        area: "amberkhana",
        subjects: ["math"],
        budget_min: 3000,
        budget_max: null,
        preferred_gender: "any",
        schedule_note: "",
      }),
    );
    expect(await screen.findByText("LIST PAGE")).toBeInTheDocument();
    expect(publishRequirement).not.toHaveBeenCalled();
  });

  it("saves and publishes in one step", async () => {
    createRequirement.mockResolvedValue({ id: "r1" });
    publishRequirement.mockResolvedValue({ id: "r1", status: "open" });
    const user = userEvent.setup();
    renderForm();

    await fillRequired(user);
    await user.click(screen.getByRole("button", { name: mixed["req.action.publish"] }));

    await waitFor(() => expect(publishRequirement).toHaveBeenCalledWith("r1"));
    expect(await screen.findByText("LIST PAGE")).toBeInTheDocument();
  });

  it("shows the contact-details error next to the note, in the guardian's language", async () => {
    createRequirement.mockRejectedValue(
      apiError(400, {
        code: "invalid",
        fields: { schedule_note: [{ code: "contact_not_allowed", message: "English" }] },
      }),
    );
    const user = userEvent.setup();
    renderForm();

    await fillRequired(user);
    await user.type(screen.getByLabelText(mixed["req.form.schedule"]), "call 01712345678");
    await user.click(screen.getByRole("button", { name: mixed["req.action.saveDraft"] }));

    expect(
      await screen.findByText(mixed["error.schedule_note.contact_not_allowed"]),
    ).toBeInTheDocument();
    expect(screen.queryByText("LIST PAGE")).not.toBeInTheDocument();
  });

  it("keeps the saved draft when publishing fails, so a retry does not create a second one", async () => {
    createRequirement.mockResolvedValue({ id: "r1" });
    publishRequirement.mockRejectedValueOnce(apiError(409, { code: "too_many_open", detail: "x" }));
    publishRequirement.mockResolvedValueOnce({ id: "r1", status: "open" });
    updateRequirement.mockResolvedValue({ id: "r1" });
    const user = userEvent.setup();
    renderForm();

    await fillRequired(user);
    await user.click(screen.getByRole("button", { name: mixed["req.action.publish"] }));
    expect(await screen.findByText(mixed["error.too_many_open"])).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: mixed["req.action.publish"] }));
    await waitFor(() => expect(publishRequirement).toHaveBeenCalledTimes(2));
    expect(createRequirement).toHaveBeenCalledTimes(1);
    expect(updateRequirement).toHaveBeenCalledWith("r1", expect.any(Object));
  });

  it("opens an existing draft filled in, and sends changes to it", async () => {
    getRequirement.mockResolvedValue({
      id: "r9",
      status: "draft",
      class_level: LOOKUPS.class_levels[0],
      area: LOOKUPS.areas[0],
      subjects: [LOOKUPS.subjects[1]],
      budget_min: 2000,
      budget_max: 4000,
      preferred_gender: "female",
      schedule_note: "Evening",
    });
    updateRequirement.mockResolvedValue({ id: "r9" });
    const user = userEvent.setup();
    renderForm("/requirements/r9/edit");

    expect(await screen.findByDisplayValue("2000")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Evening")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: mixed["req.action.saveDraft"] }));
    await waitFor(() =>
      expect(updateRequirement).toHaveBeenCalledWith(
        "r9",
        expect.objectContaining({ subjects: ["physics"], preferred_gender: "female" }),
      ),
    );
  });

  it("sends a draft that is no longer a draft back to the list", async () => {
    getRequirement.mockResolvedValue({ id: "r9", status: "open", subjects: [] });
    renderForm("/requirements/r9/edit");
    expect(await screen.findByText("LIST PAGE")).toBeInTheDocument();
  });
});
