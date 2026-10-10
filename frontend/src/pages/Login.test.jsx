import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Login from "./Login";
import { useAuthStore } from "../store/authStore";
import { mixed } from "../i18n";

describe("Login Page", () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, status: "guest", error: null });
  });

  it("renders login form with identifier and password inputs", () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    expect(screen.getByRole("heading", { level: 1, name: mixed["auth.login.title"] })).toBeInTheDocument();
    expect(screen.getByLabelText(new RegExp(mixed["auth.identifier.label"]))).toBeInTheDocument();
    expect(screen.getByPlaceholderText(mixed["auth.password.placeholder"])).toBeInTheDocument();
    expect(screen.getByRole("button", { name: mixed["auth.submit.login"] })).toBeInTheDocument();
  });

  it("displays validation errors on empty submission", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    const submitBtn = screen.getByRole("button", { name: mixed["auth.submit.login"] });
    await user.click(submitBtn);

    // Messages come from i18n (Mixed is the default), not English string concatenation
    expect(screen.getByText(mixed["error.identifier.required"])).toBeInTheDocument();
    expect(screen.getByText(mixed["error.password.required"])).toBeInTheDocument();
  });

  it("calls authStore.login on valid form submission", async () => {
    const user = userEvent.setup();
    const loginMock = vi.fn().mockResolvedValue({ id: "1", full_name: "Sylhet User" });
    useAuthStore.setState({ login: loginMock });

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    const idInput = screen.getByLabelText(new RegExp(mixed["auth.identifier.label"]));
    const pwdInput = screen.getByPlaceholderText(mixed["auth.password.placeholder"]);
    const submitBtn = screen.getByRole("button", { name: mixed["auth.submit.login"] });

    await user.type(idInput, "01712345678");
    await user.type(pwdInput, "Secret123!");
    await user.click(submitBtn);

    await waitFor(() => {
      expect(loginMock).toHaveBeenCalledWith({
        identifier: "01712345678",
        password: "Secret123!",
      });
    });
  });

  it("displays server error alert when authentication fails", async () => {
    const user = userEvent.setup();
    const loginMock = vi.fn().mockRejectedValue({
      response: {
        status: 401,
        data: { code: "invalid_credentials", detail: "Phone/email or password is incorrect." },
      },
    });
    useAuthStore.setState({ login: loginMock });

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    const idInput = screen.getByLabelText(new RegExp(mixed["auth.identifier.label"]));
    const pwdInput = screen.getByPlaceholderText(mixed["auth.password.placeholder"]);
    const submitBtn = screen.getByRole("button", { name: mixed["auth.submit.login"] });

    await user.type(idInput, "01712345678");
    await user.type(pwdInput, "WrongPass123");
    await user.click(submitBtn);

    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(screen.getByText(mixed["error.invalid_credentials"])).toBeInTheDocument();
  });
});
