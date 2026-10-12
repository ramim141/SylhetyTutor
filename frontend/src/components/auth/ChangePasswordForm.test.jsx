import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ChangePasswordForm } from "./ChangePasswordForm";
import { authApi } from "../../api/auth";
import { mixed } from "../../i18n";
import { useLanguageStore } from "../../store/languageStore";

vi.mock("../../api/auth", () => ({ authApi: { changePassword: vi.fn() } }));

const openForm = async (user) => {
  render(<ChangePasswordForm />);
  await user.click(screen.getByRole("button", { name: mixed["security.changePassword"] }));
};

const fill = async (user, oldPassword, newPassword) => {
  await user.type(screen.getByLabelText(new RegExp(mixed["security.currentPassword"])), oldPassword);
  await user.type(screen.getByLabelText(new RegExp(mixed["security.newPassword"])), newPassword);
};

const submit = (user) => user.click(screen.getByRole("button", { name: mixed["security.update"] }));

describe("ChangePasswordForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useLanguageStore.setState({ lang: "mixed" });
  });

  it("stays collapsed until the user asks to change the password", () => {
    render(<ChangePasswordForm />);

    expect(screen.getByRole("button", { name: mixed["security.changePassword"] })).toBeInTheDocument();
    expect(screen.queryByLabelText(new RegExp(mixed["security.currentPassword"]))).not.toBeInTheDocument();
  });

  it("checks both fields before calling the server", async () => {
    const user = userEvent.setup();
    await openForm(user);

    await submit(user);
    expect(screen.getByText(mixed["error.oldPassword.required"])).toBeInTheDocument();
    expect(screen.getByText(mixed["error.password.required"])).toBeInTheDocument();

    await fill(user, "OldPassword1!", "short");
    await submit(user);
    expect(screen.getByText(mixed["error.password.password_too_short"])).toBeInTheDocument();
    expect(authApi.changePassword).not.toHaveBeenCalled();
  });

  it("sends the passwords, then collapses and confirms", async () => {
    authApi.changePassword.mockResolvedValue({ access: "a", refresh: "r" });
    const user = userEvent.setup();
    await openForm(user);

    await fill(user, "OldPassword1!", "Surma-River-Fresh-9");
    await submit(user);

    await waitFor(() =>
      expect(authApi.changePassword).toHaveBeenCalledWith({
        old_password: "OldPassword1!",
        new_password: "Surma-River-Fresh-9",
      })
    );
    expect(await screen.findByText(mixed["security.passwordChanged"])).toBeInTheDocument();
    expect(screen.queryByLabelText(new RegExp(mixed["security.newPassword"]))).not.toBeInTheDocument();
  });

  it("shows the server's wrong-password code next to the current password field", async () => {
    authApi.changePassword.mockRejectedValue({
      response: {
        status: 400,
        data: {
          code: "invalid",
          fields: { old_password: [{ code: "wrong_password", message: "Current password is incorrect." }] },
        },
      },
    });
    const user = userEvent.setup();
    await openForm(user);

    await fill(user, "NotMyPassword1", "Surma-River-Fresh-9");
    await submit(user);

    expect(await screen.findByText(mixed["error.oldPassword.wrong_password"])).toBeInTheDocument();
    expect(screen.getByLabelText(new RegExp(mixed["security.newPassword"]))).toHaveValue("Surma-River-Fresh-9");
  });

  it("maps a weak new password to the shared password messages", async () => {
    authApi.changePassword.mockRejectedValue({
      response: {
        status: 400,
        data: {
          code: "invalid",
          fields: { new_password: [{ code: "password_too_common", message: "too common" }] },
        },
      },
    });
    const user = userEvent.setup();
    await openForm(user);

    await fill(user, "OldPassword1!", "password123");
    await submit(user);

    expect(await screen.findByText(mixed["error.password.password_too_common"])).toBeInTheDocument();
  });

  it("tells the user to wait when throttled", async () => {
    authApi.changePassword.mockRejectedValue({
      response: { status: 429, data: { code: "throttled", retry_after: 30 } },
    });
    const user = userEvent.setup();
    await openForm(user);

    await fill(user, "OldPassword1!", "Surma-River-Fresh-9");
    await submit(user);

    expect(
      await screen.findByText(mixed["error.throttledWait"].replace("{seconds}", "30"))
    ).toBeInTheDocument();
  });

  it("cancel clears what was typed", async () => {
    const user = userEvent.setup();
    await openForm(user);
    await fill(user, "OldPassword1!", "Surma-River-Fresh-9");

    await user.click(screen.getByRole("button", { name: mixed["security.cancel"] }));
    await user.click(screen.getByRole("button", { name: mixed["security.changePassword"] }));

    expect(screen.getByLabelText(new RegExp(mixed["security.currentPassword"]))).toHaveValue("");
  });
});
