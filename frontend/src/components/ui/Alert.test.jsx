import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { mixed } from "../../i18n";
import { Alert } from "./Alert";

describe("Alert component", () => {
  it("renders with error variant and alert role", () => {
    render(
      <Alert variant="error" title="Error Occurred">
        Invalid credentials provided.
      </Alert>
    );

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText("Error Occurred")).toBeInTheDocument();
    expect(screen.getByText("Invalid credentials provided.")).toBeInTheDocument();
  });

  it("renders with success variant and status role", () => {
    render(
      <Alert variant="success" title="Success">
        Account created!
      </Alert>
    );

    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("triggers onClose when dismiss button is clicked", async () => {
    const user = userEvent.setup();
    const handleClose = vi.fn();

    render(
      <Alert variant="info" onClose={handleClose}>
        Dismissable alert
      </Alert>
    );

    const closeButton = screen.getByRole("button", { name: mixed["common.dismiss"] });
    await user.click(closeButton);

    expect(handleClose).toHaveBeenCalledOnce();
  });
});
