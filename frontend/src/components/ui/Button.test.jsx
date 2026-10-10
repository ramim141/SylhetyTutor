import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button } from "./Button";

describe("Button", () => {
  it("uses the DESIGN.md token pair for the primary variant", () => {
    render(<Button>Search</Button>);
    const button = screen.getByRole("button", { name: "Search" });

    expect(button).toHaveClass("bg-orange", "text-on-orange");
    expect(button).not.toHaveClass("text-white");
  });

  it("is disabled and busy while loading, and ignores clicks", async () => {
    const onClick = vi.fn();
    render(
      <Button loading onClick={onClick}>
        Save
      </Button>
    );
    const button = screen.getByRole("button", { name: "Save" });

    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
    await userEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });
});
