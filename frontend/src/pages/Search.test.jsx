import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Search from "./Search";
import { getLookups } from "../api/lookups";
import { getTutors } from "../api/tutors";
import { mixed } from "../i18n";
import { useAuthStore } from "../store/authStore";
import { useLanguageStore } from "../store/languageStore";

vi.mock("../api/tutors", () => ({ getTutors: vi.fn() }));
vi.mock("../api/lookups", () => ({ getLookups: vi.fn() }));

const LOOKUPS = {
  areas: [
    { slug: "amberkhana", name_en: "Amberkhana", name_bn: "আম্বরখানা" },
    { slug: "zindabazar", name_en: "Zindabazar", name_bn: "জিন্দাবাজার" },
  ],
  subjects: [{ slug: "physics", name_en: "Physics", name_bn: "পদার্থবিজ্ঞান" }],
  class_levels: [{ slug: "hsc", name_en: "HSC", name_bn: "এইচএসসি" }],
  universities: [{ slug: "sust", name_en: "SUST", name_bn: "সাস্ট", short_name: "SUST" }],
};

const tutor = (id, name) => ({
  id,
  name,
  initials: name.slice(0, 2).toUpperCase(),
  avatarUrl: null,
  university: { slug: "sust", name_en: "SUST", name_bn: "সাস্ট", short_name: "SUST" },
  department: "Physics",
  area: { slug: "amberkhana", name_en: "Amberkhana", name_bn: "আম্বরখানা" },
  subjects: [{ slug: "physics", name_en: "Physics", name_bn: "পদার্থবিজ্ঞান" }],
  classes: [{ slug: "hsc", name_en: "HSC", name_bn: "এইচএসসি" }],
  rating: 0,
  reviewCount: 0,
  feeMin: 3000,
  feeMax: 5000,
  isFeatured: false,
  isVerified: true,
});

const page = (count, names = ["Rahim Uddin", "Salma Akter"]) => ({
  count,
  next: null,
  previous: null,
  results: names.map((name, i) => tutor(`id-${name}-${i}`, name)),
});

function Probe() {
  const { pathname, search } = useLocation();
  return <output data-testid="url">{`${pathname}${search}`}</output>;
}

function renderSearch(url = "/tutors") {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <Probe />
      <Routes>
        <Route path="/tutors" element={<Search />} />
      </Routes>
    </MemoryRouter>
  );
}

const currentUrl = () => screen.getByTestId("url").textContent;
const lastCall = () => getTutors.mock.calls.at(-1)[0];

describe("Search page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useLanguageStore.setState({ lang: "mixed" });
    useAuthStore.setState({ user: null, status: "guest" });
    getTutors.mockResolvedValue(page(2));
    getLookups.mockResolvedValue(LOOKUPS);
  });

  it("shows a skeleton first, then the tutors and how many were found", async () => {
    renderSearch();

    expect(screen.getByRole("status", { name: mixed["home.tutorsLoading"] })).toBeInTheDocument();
    expect(await screen.findByText("Rahim Uddin")).toBeInTheDocument();
    expect(screen.getByText("Salma Akter")).toBeInTheDocument();
    expect(screen.getByText(mixed["search.resultMany"].replace("{count}", "2"))).toBeInTheDocument();
  });

  it("uses the singular wording for exactly one tutor", async () => {
    getTutors.mockResolvedValue(page(1, ["Rahim Uddin"]));
    renderSearch();

    expect(await screen.findByText(mixed["search.resultOne"])).toBeInTheDocument();
  });

  it("reads the filters from a shared link and asks the API for exactly that", async () => {
    renderSearch("/tutors?area=amberkhana&subject=physics&sort=rating&page=2");

    await screen.findByText("Rahim Uddin");
    expect(lastCall()).toEqual({ area: "amberkhana", subject: "physics", sort: "rating", page: 2 });
    expect(screen.getByLabelText(mixed["search.sortLabel"])).toHaveValue("rating");
    // the two filters show as removable chips, named from the lookups
    expect(screen.getByRole("button", { name: /Area/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Subject/ })).toBeInTheDocument();
  });

  it("never forwards unknown or invalid URL values to the API", async () => {
    renderSearch("/tutors?area=amberkhana&evil=1&sort=random&gender=robot&page=-3");

    await screen.findByText("Rahim Uddin");
    expect(lastCall()).toEqual({ area: "amberkhana" });
  });

  it("puts the search text in the URL after a pause, replacing history", async () => {
    const user = userEvent.setup();
    renderSearch("/tutors?area=amberkhana&page=3");
    await screen.findByText("Rahim Uddin");

    await user.type(screen.getByLabelText(mixed["search.label"]), "rahim");

    await waitFor(() => expect(currentUrl()).toBe("/tutors?q=rahim&area=amberkhana"));
    await waitFor(() => expect(lastCall()).toEqual({ q: "rahim", area: "amberkhana" }));
    // typing four letters made one request for "rahim", not one per letter
    expect(getTutors.mock.calls.filter(([params]) => params.q).length).toBe(1);
  });

  it("changing the sort goes back to page 1", async () => {
    const user = userEvent.setup();
    renderSearch("/tutors?page=2");
    await screen.findByText("Rahim Uddin");

    await user.selectOptions(screen.getByLabelText(mixed["search.sortLabel"]), "newest");

    await waitFor(() => expect(currentUrl()).toBe("/tutors?sort=newest"));
    expect(lastCall()).toEqual({ sort: "newest" });
  });

  it("pages through results and disables Previous on the first page", async () => {
    getTutors.mockResolvedValue(page(45));
    const user = userEvent.setup();
    renderSearch();

    expect(await screen.findByText(mixed["search.pageOf"].replace("{page}", "1").replace("{total}", "3"))).toBeInTheDocument();
    expect(screen.getByRole("button", { name: new RegExp(mixed["search.prev"]) })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: new RegExp(mixed["search.next"]) }));

    await waitFor(() => expect(currentUrl()).toBe("/tutors?page=2"));
    expect(lastCall()).toEqual({ page: 2 });
  });

  it("disables Next on the last page", async () => {
    getTutors.mockResolvedValue(page(45));
    renderSearch("/tutors?page=3");

    await screen.findByText("Rahim Uddin");
    expect(screen.getByRole("button", { name: new RegExp(mixed["search.next"]) })).toBeDisabled();
  });

  it("has no pager when everything fits on one page", async () => {
    renderSearch();

    await screen.findByText("Rahim Uddin");
    expect(screen.queryByRole("navigation", { name: mixed["search.pagination"] })).not.toBeInTheDocument();
  });

  it("clear filters removes them but keeps what was typed", async () => {
    const user = userEvent.setup();
    renderSearch("/tutors?q=rahim&area=amberkhana&gender=female&sort=newest");
    await screen.findByText("Rahim Uddin");

    await user.click(screen.getByRole("button", { name: mixed["search.clearFilters"] }));

    await waitFor(() => expect(currentUrl()).toBe("/tutors?q=rahim&sort=newest"));
    expect(screen.getByLabelText(mixed["search.label"])).toHaveValue("rahim");
  });

  it("explains an empty result for filters and offers a way out", async () => {
    getTutors.mockResolvedValue(page(0, []));
    const user = userEvent.setup();
    renderSearch("/tutors?area=chowhatta");

    expect(await screen.findByText(mixed["search.empty.title"])).toBeInTheDocument();
    expect(screen.getByText(mixed["search.empty.filtered"])).toBeInTheDocument();

    getTutors.mockResolvedValue(page(2));
    await user.click(screen.getAllByRole("button", { name: mixed["search.clearFilters"] }).at(-1));

    await waitFor(() => expect(currentUrl()).toBe("/tutors"));
    expect(await screen.findByText("Rahim Uddin")).toBeInTheDocument();
  });

  it("shows an honest message when there are simply no tutors yet", async () => {
    getTutors.mockResolvedValue(page(0, []));
    renderSearch();

    expect(await screen.findByText(mixed["search.empty.body"])).toBeInTheDocument();
  });

  it("shows an error with a retry that asks again", async () => {
    getTutors.mockRejectedValueOnce(new Error("Network Error"));
    const user = userEvent.setup();
    renderSearch();

    expect(await screen.findByText(mixed["home.tutorsError"])).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: mixed["common.retry"] }));

    expect(await screen.findByText("Rahim Uddin")).toBeInTheDocument();
    expect(getTutors).toHaveBeenCalledTimes(2);
  });

  it("falls back to page 1 when a shared link points past the last page", async () => {
    getTutors.mockRejectedValueOnce({ response: { status: 404, data: { detail: "Invalid page." } } });
    renderSearch("/tutors?area=amberkhana&page=99");

    expect(await screen.findByText("Rahim Uddin")).toBeInTheDocument();
    expect(currentUrl()).toBe("/tutors?area=amberkhana");
  });

  describe("filters", () => {
    const sidebar = () => screen.getByRole("complementary", { name: mixed["search.filters"] });
    const waitForLookups = async () =>
      within(sidebar()).findByRole("option", { name: "আম্বরখানা" });

    it("sidebar: choosing an area puts it in the URL and asks the API", async () => {
      const user = userEvent.setup();
      renderSearch("/tutors?page=2");
      await waitForLookups();

      await user.selectOptions(
        within(sidebar()).getByLabelText(mixed["search.filter.area"]),
        "amberkhana"
      );

      await waitFor(() => expect(currentUrl()).toBe("/tutors?area=amberkhana"));
      expect(lastCall()).toEqual({ area: "amberkhana" });
    });

    it("sidebar: shows the filters from a shared link as selected", async () => {
      renderSearch("/tutors?area=zindabazar&gender=female");
      await waitForLookups();

      const aside = within(sidebar());
      expect(aside.getByLabelText(mixed["search.filter.area"])).toHaveValue("zindabazar");
      expect(aside.getByLabelText(mixed["search.filter.gender"])).toHaveValue("female");
    });

    it("applied filters show as chips and a chip removes only its own filter", async () => {
      const user = userEvent.setup();
      renderSearch("/tutors?area=amberkhana&subject=physics&fee_min=3000&fee_max=6000");
      await waitForLookups();

      expect(await screen.findByText(`${mixed["search.filter.area"]}: আম্বরখানা`)).toBeInTheDocument();
      await user.click(screen.getByRole("button", { name: /৳3,000/ }));

      await waitFor(() => expect(currentUrl()).toBe("/tutors?area=amberkhana&subject=physics"));
      expect(lastCall()).toEqual({ area: "amberkhana", subject: "physics" });
    });

    it("the budget goes to the API as numbers once the box loses focus", async () => {
      const user = userEvent.setup();
      renderSearch();
      await waitForLookups();

      await user.type(within(sidebar()).getByLabelText(mixed["search.feeMax"]), "5000");
      await user.tab();

      await waitFor(() => expect(lastCall()).toEqual({ fee_max: 5000 }));
      expect(currentUrl()).toBe("/tutors?fee_max=5000");
    });

    it("keeps working when the lookups cannot be loaded", async () => {
      getLookups.mockRejectedValue(new Error("Network Error"));
      renderSearch("/tutors?area=amberkhana");

      expect(await screen.findByText("Rahim Uddin")).toBeInTheDocument();
      // the chip falls back to the slug instead of disappearing
      expect(screen.getByText(`${mixed["search.filter.area"]}: amberkhana`)).toBeInTheDocument();
    });

    describe("phone sheet", () => {
      const filtersButton = () =>
        screen.getByRole("button", { name: new RegExp(`^${mixed["search.filters"]}`) });

      it("counts the applied filters on the button", async () => {
        renderSearch("/tutors?area=amberkhana&gender=male");
        await screen.findByText("Rahim Uddin");

        expect(filtersButton()).toHaveTextContent(`${mixed["search.filters"]} (2)`);
      });

      it("changes nothing until Show tutors is pressed, then applies everything at once", async () => {
        const user = userEvent.setup();
        renderSearch("/tutors?page=2");
        await screen.findByText("Rahim Uddin");
        const callsBefore = getTutors.mock.calls.length;

        await user.click(filtersButton());
        const dialog = within(screen.getByRole("dialog", { name: mixed["search.filters"] }));
        await dialog.findByRole("option", { name: "জিন্দাবাজার" });
        await user.selectOptions(dialog.getByLabelText(mixed["search.filter.area"]), "zindabazar");
        await user.selectOptions(dialog.getByLabelText(mixed["search.filter.gender"]), "female");
        await user.type(dialog.getByLabelText(mixed["search.feeMin"]), "4000");

        expect(currentUrl()).toBe("/tutors?page=2");
        expect(getTutors.mock.calls.length).toBe(callsBefore);

        await user.click(dialog.getByRole("button", { name: mixed["search.apply"] }));

        await waitFor(() =>
          expect(currentUrl()).toBe("/tutors?area=zindabazar&gender=female&fee_min=4000")
        );
        expect(lastCall()).toEqual({ area: "zindabazar", gender: "female", fee_min: 4000 });
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      });

      it("starts from the current filters and Clear empties the draft", async () => {
        const user = userEvent.setup();
        renderSearch("/tutors?area=amberkhana&subject=physics");
        await screen.findByText("Rahim Uddin");

        await user.click(filtersButton());
        const dialog = within(screen.getByRole("dialog"));
        await dialog.findByRole("option", { name: "আম্বরখানা" });
        expect(dialog.getByLabelText(mixed["search.filter.area"])).toHaveValue("amberkhana");

        await user.click(dialog.getByRole("button", { name: mixed["search.clearFilters"] }));
        expect(dialog.getByLabelText(mixed["search.filter.area"])).toHaveValue("");
        await user.click(dialog.getByRole("button", { name: mixed["search.apply"] }));

        await waitFor(() => expect(currentUrl()).toBe("/tutors"));
      });

      it("closing the sheet discards the draft", async () => {
        const user = userEvent.setup();
        renderSearch();
        await screen.findByText("Rahim Uddin");

        await user.click(filtersButton());
        const dialog = within(screen.getByRole("dialog"));
        await dialog.findByRole("option", { name: "আম্বরখানা" });
        await user.selectOptions(dialog.getByLabelText(mixed["search.filter.area"]), "amberkhana");
        await user.click(dialog.getByRole("button", { name: mixed["common.close"] }));

        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
        expect(currentUrl()).toBe("/tutors");

        await user.click(filtersButton());
        const reopened = within(screen.getByRole("dialog"));
        await reopened.findByRole("option", { name: "আম্বরখানা" });
        expect(reopened.getByLabelText(mixed["search.filter.area"])).toHaveValue("");
      });
    });
  });
});
