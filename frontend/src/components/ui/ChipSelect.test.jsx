import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ChipSelect } from "./ChipSelect";

const OPTIONS = [
  { value: "math", label: "Math" },
  { value: "physics", label: "Physics" },
  { value: "bangla", label: "Bangla" },
];

const setup = (value = [], extra = {}) => {
  const onChange = vi.fn();
  render(
    <ChipSelect label="Subjects" options={OPTIONS} value={value} onChange={onChange} {...extra} />,
  );
  return onChange;
};

describe("ChipSelect", () => {
  it("is a labelled group of toggle buttons", () => {
    setup(["math"]);

    expect(screen.getByRole("group", { name: "Subjects" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Math" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Physics" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("adds an option to the choice", async () => {
    const onChange = setup(["math"]);

    await userEvent.click(screen.getByRole("button", { name: "Physics" }));

    expect(onChange).toHaveBeenCalledWith(["math", "physics"]);
  });

  it("removes an option that was chosen", async () => {
    const onChange = setup(["math", "physics"]);

    await userEvent.click(screen.getByRole("button", { name: "Math" }));

    expect(onChange).toHaveBeenCalledWith(["physics"]);
  });

  it("shows the hint and the error", () => {
    setup([], { hint: "Choose all that apply.", error: "Choose at least one." });

    expect(screen.getByText("Choose all that apply.")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Choose at least one.");
  });

  it("cannot be changed when disabled", async () => {
    const onChange = setup([], { disabled: true });

    await userEvent.click(screen.getByRole("button", { name: "Math" }));

    expect(onChange).not.toHaveBeenCalled();
  });
});
