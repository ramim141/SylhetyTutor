import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PasswordInput } from "./PasswordInput";

describe("PasswordInput component", () => {
  it("defaults to password type", () => {
    render(<PasswordInput label="Password" />);
    const input = screen.getByLabelText(/^password$/i);
    expect(input).toHaveAttribute("type", "password");
  });

  it("toggles password visibility when clicking the eye button", async () => {
    const user = userEvent.setup();
    render(<PasswordInput label="Password" />);

    const input = screen.getByLabelText(/^password$/i);
    const toggleButton = screen.getByRole("button", { name: /show password/i });

    expect(input).toHaveAttribute("type", "password");

    await user.click(toggleButton);
    expect(input).toHaveAttribute("type", "text");
    expect(screen.getByRole("button", { name: /hide password/i })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /hide password/i }));
    expect(input).toHaveAttribute("type", "password");
  });

  it("renders error state correctly", () => {
    render(<PasswordInput label="Password" error="Password too weak" />);
    expect(screen.getByLabelText(/^password$/i)).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("alert")).toHaveTextContent("Password too weak");
  });
});
