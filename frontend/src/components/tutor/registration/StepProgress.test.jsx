import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StepProgress } from "./StepProgress";
import { mixed } from "../../../i18n";

describe("StepProgress", () => {
  it("tells where the tutor is, in words and in a bar", () => {
    render(<StepProgress step={3} total={6} title="Your studies" />);

    expect(screen.getByText("Step 3 / 6")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Your studies" })).toBeInTheDocument();
    const bar = screen.getByRole("progressbar", { name: mixed["tr.progress"] });
    expect(bar).toHaveAttribute("aria-valuenow", "3");
    expect(bar).toHaveAttribute("aria-valuemax", "6");
    expect(bar.firstChild).toHaveStyle({ width: "50%" });
  });
});
