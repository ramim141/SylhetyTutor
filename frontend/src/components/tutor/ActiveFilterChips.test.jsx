import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ActiveFilterChips } from "./ActiveFilterChips";
import { en, mixed } from "../../i18n";
import { useLanguageStore } from "../../store/languageStore";

const LOOKUPS = {
  areas: [{ slug: "amberkhana", name_en: "Amberkhana", name_bn: "আম্বরখানা" }],
  subjects: [{ slug: "physics", name_en: "Physics", name_bn: "পদার্থবিজ্ঞান" }],
  class_levels: [],
  universities: [{ slug: "sust", name_en: "SUST", name_bn: "সাস্ট", short_name: "SUST" }],
};

const setup = (filters, onRemove = vi.fn()) => {
  render(<ActiveFilterChips filters={filters} lookups={LOOKUPS} onRemove={onRemove} />);
  return onRemove;
};

describe("ActiveFilterChips", () => {
  beforeEach(() => useLanguageStore.setState({ lang: "mixed" }));

  it("renders nothing when no filter is applied", () => {
    const { container } = render(
      <ActiveFilterChips
        filters={{ q: "x", sort: "rating", page: 2 }}
        lookups={LOOKUPS}
        onRemove={() => {}}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("names each filter in the current language", () => {
    setup({ area: "amberkhana", subject: "physics", gender: "female", university: "sust" });

    expect(screen.getByText(`${mixed["search.filter.area"]}: আম্বরখানা`)).toBeInTheDocument();
    expect(
      screen.getByText(`${mixed["search.filter.subject"]}: পদার্থবিজ্ঞান`),
    ).toBeInTheDocument();
    expect(
      screen.getByText(`${mixed["search.filter.gender"]}: ${mixed["search.gender.female"]}`),
    ).toBeInTheDocument();
  });

  it("uses English names and the short university name in English", () => {
    useLanguageStore.setState({ lang: "en" });
    setup({ area: "amberkhana", university: "sust" });

    expect(screen.getByText(`${en["search.filter.area"]}: Amberkhana`)).toBeInTheDocument();
    expect(screen.getByText(`${en["search.filter.university"]}: SUST`)).toBeInTheDocument();
  });

  it("falls back to the slug while the lookups have not loaded", () => {
    useLanguageStore.setState({ lang: "en" });
    setup({ subject: "chemistry" });

    expect(screen.getByText(`${en["search.filter.subject"]}: chemistry`)).toBeInTheDocument();
  });

  it.each([
    [{ fee_min: 3000, fee_max: 6000 }, "৳3,000–৳6,000"],
    [{ fee_min: 3000 }, mixed["search.fee.from"].replace("{min}", "৳3,000")],
    [{ fee_max: 6000 }, mixed["search.fee.upTo"].replace("{max}", "৳6,000")],
  ])("shows the budget %j as one chip", (filters, text) => {
    setup(filters);

    expect(screen.getAllByRole("button")).toHaveLength(1);
    expect(screen.getByText(text)).toBeInTheDocument();
  });

  it("removing a chip reports the keys it covers", async () => {
    const user = userEvent.setup();
    const onRemove = setup({ area: "amberkhana", fee_min: 3000, fee_max: 6000 });

    await user.click(screen.getByRole("button", { name: /Area/ }));
    expect(onRemove).toHaveBeenLastCalledWith(["area"]);

    await user.click(screen.getByRole("button", { name: /৳3,000/ }));
    expect(onRemove).toHaveBeenLastCalledWith(["fee_min", "fee_max"]);
  });
});
