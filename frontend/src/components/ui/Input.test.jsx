import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Input } from "./Input";

describe("Input component", () => {
  it("renders with label and helper text", () => {
    render(
      <Input
        label="Phone Number"
        helperText="Enter 11 digits"
        placeholder="01712345678"
      />
    );

    expect(screen.getByLabelText(/phone number/i)).toBeInTheDocument();
    expect(screen.getByText("Enter 11 digits")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("01712345678")).toBeInTheDocument();
  });

  it("renders required indicator when required", () => {
    render(<Input label="Full Name" required />);
    expect(screen.getByText("*")).toBeInTheDocument();
    expect(screen.getByLabelText(/full name/i)).toBeRequired();
  });

  it("renders error state and accessible aria-invalid", () => {
    render(
      <Input
        label="Phone Number"
        error="Invalid phone number format"
      />
    );

    const input = screen.getByLabelText(/phone number/i);
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("alert")).toHaveTextContent("Invalid phone number format");
  });

  it("handles user typing correctly", async () => {
    const user = userEvent.setup();
    render(<Input label="Test Input" />);

    const input = screen.getByLabelText("Test Input");
    await user.type(input, "01712345678");

    expect(input).toHaveValue("01712345678");
  });
});
