import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AvatarUpload } from "./AvatarUpload";
import { authApi } from "../../../api/auth";
import { mixed } from "../../../i18n";
import { useAuthStore } from "../../../store/authStore";
import { useLanguageStore } from "../../../store/languageStore";

vi.mock("../../../api/auth", () => ({
  authApi: { uploadAvatar: vi.fn(), deleteAvatar: vi.fn() },
}));

const user = (avatar = null) => ({ id: "u1", full_name: "Rahim Uddin", avatar });
const photo = (name = "me.jpg", type = "image/jpeg") => new File(["x"], name, { type });

describe("AvatarUpload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useLanguageStore.setState({ lang: "mixed" });
    useAuthStore.setState({ user: user(), status: "authenticated" });
  });

  it("shows the first letter of the name until there is a photo", () => {
    render(<AvatarUpload />);

    expect(screen.getByText("R")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: mixed["tr.photo.choose"] })).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: mixed["tr.photo.remove"] }),
    ).not.toBeInTheDocument();
  });

  it("warns that a profile photo is public and must never be an ID", () => {
    render(<AvatarUpload />);

    expect(screen.getByText(mixed["tr.photo.public"])).toBeInTheDocument();
  });

  it("uploads a photo and shows it, updating the signed-in user", async () => {
    authApi.uploadAvatar.mockResolvedValue(user("https://i.ibb.co/a/me.jpg"));
    render(<AvatarUpload />);

    await userEvent.upload(
      screen.getByLabelText(mixed["tr.photo.title"], { selector: "input" }),
      photo(),
    );

    const image = await screen.findByRole("img", { name: mixed["tr.photo.alt"] });
    expect(image).toHaveAttribute("src", "https://i.ibb.co/a/me.jpg");
    expect(useAuthStore.getState().user.avatar).toBe("https://i.ibb.co/a/me.jpg");
    expect(screen.getByRole("button", { name: mixed["tr.photo.change"] })).toBeInTheDocument();
  });

  it("refuses a wrong file type without calling the server", async () => {
    render(<AvatarUpload />);

    await userEvent.upload(
      screen.getByLabelText(mixed["tr.photo.title"], { selector: "input" }),
      photo("doc.pdf", "application/pdf"),
      { applyAccept: false },
    );

    expect(await screen.findByText(mixed["error.file.unsupported_format"])).toBeInTheDocument();
    expect(authApi.uploadAvatar).not.toHaveBeenCalled();
  });

  it.each([
    ["uploads are not set up", 503, "uploads_unavailable", "error.uploads_unavailable"],
    ["imgBB refuses the photo", 502, "upload_failed", "error.upload_failed"],
  ])("explains it when %s, and keeps the old photo", async (_, status, code, key) => {
    useAuthStore.setState({ user: user("https://i.ibb.co/old/old.jpg") });
    authApi.uploadAvatar.mockRejectedValue({ response: { status, data: { code, detail: "x" } } });
    render(<AvatarUpload />);

    await userEvent.upload(
      screen.getByLabelText(mixed["tr.photo.title"], { selector: "input" }),
      photo(),
    );

    expect(await screen.findByText(mixed[key])).toBeInTheDocument();
    expect(useAuthStore.getState().user.avatar).toBe("https://i.ibb.co/old/old.jpg");
  });

  it("removes the photo", async () => {
    useAuthStore.setState({ user: user("https://i.ibb.co/a/me.jpg") });
    authApi.deleteAvatar.mockResolvedValue(user(null));
    render(<AvatarUpload />);

    await userEvent.click(screen.getByRole("button", { name: mixed["tr.photo.remove"] }));

    await waitFor(() => expect(useAuthStore.getState().user.avatar).toBeNull());
    expect(
      await screen.findByRole("button", { name: mixed["tr.photo.choose"] }),
    ).toBeInTheDocument();
  });
});
