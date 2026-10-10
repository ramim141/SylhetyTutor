import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BottomSheet } from "./BottomSheet";

describe("BottomSheet component", () => {
  it("does not render when isOpen is false", () => {
    const { container } = render(
      <BottomSheet isOpen={false} title="Sheet Title">
        Content
      </BottomSheet>
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("renders when isOpen is true with dialog role", () => {
    render(
      <BottomSheet isOpen={true} title="Sheet Title">
        <div>Sheet Content</div>
      </BottomSheet>
    );

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Sheet Title")).toBeInTheDocument();
    expect(screen.getByText("Sheet Content")).toBeInTheDocument();
  });

  it("calls onClose when clicking close button", async () => {
    const user = userEvent.setup();
    const handleClose = vi.fn();

    render(
      <BottomSheet isOpen={true} onClose={handleClose} title="Sheet Title">
        Content
      </BottomSheet>
    );

    const closeButton = screen.getByRole("button", { name: /close bottom sheet/i });
    await user.click(closeButton);

    expect(handleClose).toHaveBeenCalledOnce();
  });

  it("calls onClose on Escape key press", async () => {
    const user = userEvent.setup();
    const handleClose = vi.fn();

    render(
      <BottomSheet isOpen={true} onClose={handleClose} title="Sheet Title">
        Content
      </BottomSheet>
    );

    await user.keyboard("{Escape}");
    expect(handleClose).toHaveBeenCalledOnce();
  });
});
