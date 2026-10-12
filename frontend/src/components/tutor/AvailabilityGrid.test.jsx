import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { AvailabilityGrid } from "./AvailabilityGrid";
import { en, mixed } from "../../i18n";
import { useLanguageStore } from "../../store/languageStore";

describe("AvailabilityGrid", () => {
  beforeEach(() => useLanguageStore.setState({ lang: "mixed" }));

  it("has a row for each of the seven days and a column for each of the three slots", () => {
    render(<AvailabilityGrid availability={[]} />);

    const table = screen.getByRole("table", { name: mixed["profile.availability"] });
    expect(within(table).getAllByRole("row")).toHaveLength(8); // header + 7 days
    expect(within(table).getAllByRole("columnheader")).toHaveLength(4); // day + 3 slots
    expect(within(table).getAllByRole("cell")).toHaveLength(21);
  });

  it("starts the week on Saturday, as in Sylhet", () => {
    render(<AvailabilityGrid availability={[]} />);

    const days = screen.getAllByRole("rowheader").map((h) => h.textContent);
    expect(days[0]).toBe(mixed["profile.day.sat"]);
    expect(days[6]).toBe(mixed["profile.day.fri"]);
  });

  it("marks exactly the free slots, in words and not only by colour", () => {
    render(
      <AvailabilityGrid
        availability={[
          { day: "sat", slot: "evening" },
          { day: "mon", slot: "morning" },
        ]}
      />
    );

    const cells = screen.getAllByRole("cell");
    const free = cells.filter((cell) => cell.dataset.free === "true");
    expect(free).toHaveLength(2);
    expect(within(free[0]).getByText(mixed["profile.free"])).toBeInTheDocument();
    expect(screen.getAllByText(mixed["profile.busy"])).toHaveLength(19);
    // saturday evening is the 3rd cell of the first row; monday morning the 1st of the third
    expect(cells[2].dataset.free).toBe("true");
    expect(cells[6].dataset.free).toBe("true");
  });

  it("uses the chosen language for days and slots", () => {
    useLanguageStore.setState({ lang: "en" });
    render(<AvailabilityGrid availability={[]} />);

    expect(screen.getByRole("rowheader", { name: en["profile.day.thu"] })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: en["profile.slot.afternoon"] })).toBeInTheDocument();
  });
});
