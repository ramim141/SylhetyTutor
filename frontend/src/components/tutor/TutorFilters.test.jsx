import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TutorFilters } from "./TutorFilters";
import { en, mixed } from "../../i18n";
import { useLanguageStore } from "../../store/languageStore";

const LOOKUPS = {
  areas: [
    { slug: "amberkhana", name_en: "Amberkhana", name_bn: "আম্বরখানা" },
    { slug: "zindabazar", name_en: "Zindabazar", name_bn: "জিন্দাবাজার" },
  ],
  subjects: [{ slug: "physics", name_en: "Physics", name_bn: "পদার্থবিজ্ঞান" }],
  class_levels: [{ slug: "hsc", name_en: "HSC", name_bn: "এইচএসসি" }],
  universities: [{ slug: "sust", name_en: "SUST", name_bn: "সাস্ট", short_name: "SUST" }],
};

const setup = (props = {}) => {
  const onChange = vi.fn();
  const view = render(
    <TutorFilters values={{}} lookups={LOOKUPS} onChange={onChange} {...props} />,
  );
  return { onChange, ...view };
};

const field = (label) => screen.getByLabelText(label);

describe("TutorFilters", () => {
  beforeEach(() => useLanguageStore.setState({ lang: "mixed" }));

  it("offers every lookup in the current language, with Any first", () => {
    setup();

    const options = [...field(mixed["search.filter.area"]).querySelectorAll("option")];
    expect(options.map((o) => o.textContent)).toEqual([
      mixed["search.any"],
      "আম্বরখানা",
      "জিন্দাবাজার",
    ]);
    expect(options.map((o) => o.value)).toEqual(["", "amberkhana", "zindabazar"]);
  });

  it("uses English names (and the short university name) in English", () => {
    useLanguageStore.setState({ lang: "en" });
    setup();

    const areas = [...field(en["search.filter.area"]).querySelectorAll("option")];
    expect(areas.map((o) => o.textContent)).toContain("Amberkhana");
    const universities = [...field(en["search.filter.university"]).querySelectorAll("option")];
    expect(universities.map((o) => o.textContent)).toContain("SUST");
  });

  it("applies a chosen option straight away, and Any clears it", async () => {
    const user = userEvent.setup();
    const { onChange } = setup({ values: { area: "amberkhana" } });

    await user.selectOptions(field(mixed["search.filter.subject"]), "physics");
    expect(onChange).toHaveBeenLastCalledWith({ subject: "physics" });

    await user.selectOptions(field(mixed["search.filter.area"]), "");
    expect(onChange).toHaveBeenLastCalledWith({ area: "" });
  });

  it("lets the user pick a tutor gender", async () => {
    const user = userEvent.setup();
    const { onChange } = setup();

    await user.selectOptions(field(mixed["search.filter.gender"]), "female");

    expect(onChange).toHaveBeenLastCalledWith({ gender: "female" });
  });

  it("applies the budget once, when the user leaves the box — not per digit", async () => {
    const user = userEvent.setup();
    const { onChange } = setup();

    await user.type(field(mixed["search.feeMin"]), "3500");
    expect(onChange).not.toHaveBeenCalled();

    await user.tab();
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith({ fee_min: 3500, fee_max: "" });
  });

  it("applies the budget on Enter and ignores anything that is not a digit", async () => {
    const user = userEvent.setup();
    const { onChange } = setup();

    await user.type(field(mixed["search.feeMax"]), "6a,0 00{Enter}");

    expect(field(mixed["search.feeMax"])).toHaveValue("6000");
    expect(onChange).toHaveBeenCalledWith({ fee_min: "", fee_max: 6000 });
  });

  it("refuses a minimum above the maximum and says why", async () => {
    const user = userEvent.setup();
    const { onChange } = setup({ values: { fee_max: 4000 } });

    await user.type(field(mixed["search.feeMin"]), "5000");
    await user.tab();

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent(mixed["search.feeError"]);
    expect(field(mixed["search.feeMin"])).toBeInvalid();
  });

  it("emptying a budget box removes that limit", async () => {
    const user = userEvent.setup();
    const { onChange } = setup({ values: { fee_min: 3000, fee_max: 6000 } });

    await user.clear(field(mixed["search.feeMin"]));
    await user.tab();

    expect(onChange).toHaveBeenLastCalledWith({ fee_min: "", fee_max: 6000 });
  });

  it("in the mobile sheet (liveFee) every keystroke updates the draft", async () => {
    const user = userEvent.setup();
    const { onChange } = setup({ liveFee: true });

    await user.type(field(mixed["search.feeMin"]), "35");

    expect(onChange).toHaveBeenLastCalledWith({ fee_min: 35, fee_max: "" });
    expect(onChange).toHaveBeenCalledTimes(2);
  });

  it("shows new budget values when the URL changes underneath it", () => {
    const { rerender, onChange } = setup({ values: { fee_min: 3000 } });
    expect(field(mixed["search.feeMin"])).toHaveValue("3000");

    rerender(<TutorFilters values={{}} lookups={LOOKUPS} onChange={onChange} />);

    expect(field(mixed["search.feeMin"])).toHaveValue("");
  });
});
