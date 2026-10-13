import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Register from "./Register";
import { toLocalBdPhone } from "../utils/phone";
import { useAuthStore } from "../store/authStore";
import { getLookups } from "../api/lookups";
import { mixed } from "../i18n";

vi.mock("../api/lookups", () => ({ getLookups: vi.fn() }));

const AREAS = [
  { id: "a1", slug: "amberkhana", name_en: "Amberkhana", name_bn: "আম্বরখানা" },
  { id: "a2", slug: "zindabazar", name_en: "Zindabazar", name_bn: "জিন্দাবাজার" },
];

function renderRegister() {
  return render(
    <MemoryRouter>
      <Register />
    </MemoryRouter>
  );
}

async function fillValidForm(user) {
  await user.type(screen.getByLabelText(new RegExp(mixed["reg.fullName.label"].replace(/[()]/g, "."))), "Mahmud Hasan");
  await user.type(screen.getByPlaceholderText(mixed["reg.phone.placeholder"]), "1755-667788");
  await user.selectOptions(await screen.findByRole("combobox"), "amberkhana");
  await user.type(screen.getByPlaceholderText(mixed["reg.password.placeholder"]), "ValidPassword123!");
  await user.click(screen.getByRole("checkbox"));
}

describe("toLocalBdPhone", () => {
  it.each([
    ["1712345678", "01712345678"],
    ["01712345678", "01712345678"],
    ["+880 1712-345678", "01712345678"],
    ["8801712345678", "01712345678"],
    ["12345", ""],
    ["01212345678", ""],
  ])("%s → %s", (input, expected) => {
    expect(toLocalBdPhone(input)).toBe(expected);
  });
});

describe("Register Page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getLookups.mockResolvedValue({ areas: AREAS });
    useAuthStore.setState({ user: null, status: "guest", error: null });
  });

  it("has no navbar and shows the form from the reference design", async () => {
    renderRegister();

    expect(screen.queryByRole("banner", { name: /navigation/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: mixed["reg.title"] })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: new RegExp(mixed["reg.role.guardian"]) })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByText("+880")).toBeInTheDocument();
    expect(await screen.findByRole("option", { name: "আম্বরখানা" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: new RegExp(mixed["reg.google"]) })).toBeDisabled();
  });

  it("has a back button that returns home when the page was opened directly", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={["/register"]}>
        <Routes>
          <Route path="/register" element={<Register />} />
          <Route path="/" element={<div>Home Page</div>} />
        </Routes>
      </MemoryRouter>
    );

    await user.click(screen.getByRole("button", { name: mixed["common.back"] }));

    expect(screen.getByText("Home Page")).toBeInTheDocument();
  });

  it("shows each role with a short description so the choice is clear on phones", () => {
    renderRegister();

    expect(screen.getByText(mixed["auth.role.guardian.desc"])).toBeInTheDocument();
    expect(screen.getByText(mixed["auth.role.tutor.desc"])).toBeInTheDocument();
  });

  it("requires area and agreement before submitting", async () => {
    const user = userEvent.setup();
    const registerMock = vi.fn();
    useAuthStore.setState({ register: registerMock });
    renderRegister();

    await user.click(screen.getByRole("button", { name: new RegExp(mixed["reg.submit"].replace(/[()]/g, ".")) }));

    expect(screen.getByText(mixed["error.area.required"])).toBeInTheDocument();
    expect(screen.getByText(mixed["error.terms.required"])).toBeInTheDocument();
    expect(screen.getByText(mixed["error.phone.missing"])).toBeInTheDocument();
    expect(registerMock).not.toHaveBeenCalled();
  });

  it("submits a normalized phone, the chosen area and role", async () => {
    const user = userEvent.setup();
    const registerMock = vi.fn().mockResolvedValue({ id: "2", full_name: "Mahmud Hasan" });
    useAuthStore.setState({ register: registerMock });
    renderRegister();

    await user.click(screen.getByRole("radio", { name: new RegExp(mixed["reg.role.tutor"]) }));
    await fillValidForm(user);
    await user.click(screen.getByRole("button", { name: new RegExp(mixed["reg.submit"].replace(/[()]/g, ".")) }));

    await waitFor(() =>
      expect(registerMock).toHaveBeenCalledWith(
        expect.objectContaining({
          full_name: "Mahmud Hasan",
          phone: "01755667788",
          area: "amberkhana",
          password: "ValidPassword123!",
          role: "tutor",
        })
      )
    );
  });

  it("shows the backend's duplicate-phone error under the phone field", async () => {
    const user = userEvent.setup();
    const registerMock = vi.fn().mockRejectedValue({
      response: {
        status: 400,
        data: { code: "invalid", fields: { phone: [{ code: "unique", message: "exists" }] } },
      },
    });
    useAuthStore.setState({ register: registerMock });
    renderRegister();

    await fillValidForm(user);
    await user.click(screen.getByRole("button", { name: new RegExp(mixed["reg.submit"].replace(/[()]/g, ".")) }));

    expect(await screen.findByText(mixed["error.phone.unique"])).toBeInTheDocument();
  });

  it("returns a new user to the page that needed an account", async () => {
    useAuthStore.setState({ register: vi.fn().mockResolvedValue({ id: "1" }) });
    const user = userEvent.setup();
    render(
      <MemoryRouter
        initialEntries={[{ pathname: "/register", state: { from: { pathname: "/tutors", search: "?q=math" } } }]}
      >
        <Routes>
          <Route path="/register" element={<Register />} />
          <Route path="/tutors" element={<div>Tutors page</div>} />
          <Route path="/dashboard" element={<div>Dashboard page</div>} />
        </Routes>
      </MemoryRouter>
    );

    await fillValidForm(user);
    await user.click(screen.getByRole("button", { name: new RegExp(mixed["reg.submit"]) }));

    expect(await screen.findByText("Tutors page")).toBeInTheDocument();
  });

  it("names the language and theme buttons in the chosen language", async () => {
    renderRegister();

    expect(
      await screen.findByRole("button", { name: `${mixed["nav.langSelect"]} (Mix)` })
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Theme: / })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Toggle language" })).not.toBeInTheDocument();
  });

  it("tells the user, next to the password, when it is too similar to their own details", async () => {
    useAuthStore.setState({
      register: vi.fn().mockRejectedValue({
        response: {
          status: 400,
          data: {
            code: "invalid",
            fields: { password: [{ code: "password_too_similar", message: "too similar" }] },
          },
        },
      }),
    });
    const user = userEvent.setup();
    renderRegister();

    await fillValidForm(user);
    await user.click(screen.getByRole("button", { name: new RegExp(mixed["reg.submit"]) }));

    expect(await screen.findByText(mixed["error.password.password_too_similar"])).toBeInTheDocument();
  });
});
