import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { Header } from "./Header";
import { en, mixed } from "../../i18n";
import { useAuthStore } from "../../store/authStore";
import { useLanguageStore } from "../../store/languageStore";

function renderHeader() {
  return render(
    <MemoryRouter>
      <Header />
    </MemoryRouter>
  );
}

describe("Header", () => {
  beforeEach(() => {
    useLanguageStore.setState({ lang: "mixed" });
    useAuthStore.setState({ user: null, status: "guest" });
  });

  it("uses the brand logo image (one visible per theme) as the home link", () => {
    renderHeader();

    const home = screen.getByRole("link", { name: mixed["brand.name"] });
    expect(home).toHaveAttribute("href", "/");
    const images = home.querySelectorAll("img");
    expect([...images].map((img) => img.getAttribute("src"))).toEqual([
      "/images/logo.png",
      "/images/logo-dark.png",
    ]);
  });

  it("has a single language button instead of EN / বাং / Mixed buttons", async () => {
    const user = userEvent.setup();
    renderHeader();

    // desktop and phone layouts each render the control; both are the same one-button menu
    const buttons = screen.getAllByRole("button", { name: new RegExp(mixed["nav.langSelect"]) });
    expect(buttons.length).toBeGreaterThan(0);
    expect(screen.queryByRole("radio")).not.toBeInTheDocument();

    await user.click(buttons[0]);
    await user.click(screen.getByRole("option", { name: en["lang.en"] }));

    expect(useLanguageStore.getState().lang).toBe("en");
  });
});
