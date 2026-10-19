import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, beforeEach } from "vitest";
import { CookieConsent } from "./CookieConsent";
import { mixed } from "../../i18n";

describe("CookieConsent component", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("renders cookie banner when user has not consented", () => {
    render(
      <MemoryRouter>
        <CookieConsent />
      </MemoryRouter>
    );

    expect(screen.getByRole("complementary", { name: /cookie consent banner/i })).toBeInTheDocument();
  });

  it("does not render when consent is already in localStorage", () => {
    localStorage.setItem("sylhety_cookie_consent", "true");

    render(
      <MemoryRouter>
        <CookieConsent />
      </MemoryRouter>
    );

    expect(screen.queryByRole("complementary", { name: /cookie consent banner/i })).toBeNull();
  });

  it("dismisses banner and sets localStorage when Accept is clicked", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <CookieConsent />
      </MemoryRouter>
    );

    const acceptBtn = screen.getByRole("button", { name: mixed["cookie.accept"] });
    await user.click(acceptBtn);

    expect(localStorage.getItem("sylhety_cookie_consent")).toBe("true");
    expect(screen.queryByRole("complementary", { name: /cookie consent banner/i })).toBeNull();
  });
});
