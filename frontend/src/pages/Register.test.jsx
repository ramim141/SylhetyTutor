import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Register from "./Register";
import { useAuthStore } from "../store/authStore";
import { mixed } from "../i18n";

describe("Register Page", () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, status: "guest", error: null });
  });

  it("renders register form fields and role switcher", () => {
    render(
      <MemoryRouter>
        <Register />
      </MemoryRouter>
    );

    expect(screen.getByRole("heading", { level: 1, name: mixed["auth.register.title"] })).toBeInTheDocument();
    expect(screen.getByText(mixed["auth.role.guardian"])).toBeInTheDocument();
    expect(screen.getByText(mixed["auth.role.tutor"])).toBeInTheDocument();
    expect(screen.getByLabelText(new RegExp(mixed["auth.fullName.label"]))).toBeInTheDocument();
    expect(screen.getByLabelText(new RegExp(mixed["auth.phone.label"]))).toBeInTheDocument();
    expect(screen.getByPlaceholderText(mixed["auth.password.placeholder"])).toBeInTheDocument();
  });

  it("submits valid registration data to authStore.register", async () => {
    const user = userEvent.setup();
    const registerMock = vi.fn().mockResolvedValue({ id: "2", full_name: "Mahmud Hasan" });
    useAuthStore.setState({ register: registerMock });

    render(
      <MemoryRouter>
        <Register />
      </MemoryRouter>
    );

    const nameInput = screen.getByLabelText(new RegExp(mixed["auth.fullName.label"]));
    const phoneInput = screen.getByLabelText(new RegExp(mixed["auth.phone.label"]));
    const pwdInput = screen.getByPlaceholderText(mixed["auth.password.placeholder"]);
    const submitBtn = screen.getByRole("button", { name: mixed["auth.submit.register"] });

    await user.type(nameInput, "Mahmud Hasan");
    await user.type(phoneInput, "01755667788");
    await user.type(pwdInput, "ValidPassword123!");
    await user.click(submitBtn);

    await waitFor(() => {
      expect(registerMock).toHaveBeenCalledWith(
        expect.objectContaining({
          full_name: "Mahmud Hasan",
          phone: "01755667788",
          password: "ValidPassword123!",
          role: "guardian",
        })
      );
    });
  });

  it("displays phone unique field error from backend response", async () => {
    const user = userEvent.setup();
    const registerMock = vi.fn().mockRejectedValue({
      response: {
        status: 400,
        data: {
          code: "invalid",
          fields: {
            phone: [{ code: "unique", message: "A user with this phone already exists." }],
          },
        },
      },
    });
    useAuthStore.setState({ register: registerMock });

    render(
      <MemoryRouter>
        <Register />
      </MemoryRouter>
    );

    const nameInput = screen.getByLabelText(new RegExp(mixed["auth.fullName.label"]));
    const phoneInput = screen.getByLabelText(new RegExp(mixed["auth.phone.label"]));
    const pwdInput = screen.getByPlaceholderText(mixed["auth.password.placeholder"]);
    const submitBtn = screen.getByRole("button", { name: mixed["auth.submit.register"] });

    await user.type(nameInput, "Mahmud Hasan");
    await user.type(phoneInput, "01755667788");
    await user.type(pwdInput, "ValidPassword123!");
    await user.click(submitBtn);

    expect(await screen.findByText(mixed["error.phone.unique"])).toBeInTheDocument();
  });
});
