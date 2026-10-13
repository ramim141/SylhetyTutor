import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LanguageMenu } from "./LanguageMenu";
import { en, mixed } from "../../i18n";
import { useLanguageStore } from "../../store/languageStore";

describe("LanguageMenu", () => {
  beforeEach(() => useLanguageStore.setState({ lang: "mixed" }));

  it("is a single button showing the current language, with the menu closed", () => {
    render(<LanguageMenu />);

    expect(screen.getAllByRole("button")).toHaveLength(1);
    expect(screen.getByRole("button")).toHaveTextContent("Mix");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("opens the three choices and switches language", async () => {
    const user = userEvent.setup();
    render(<LanguageMenu />);

    await user.click(screen.getByRole("button"));
    expect(screen.getAllByRole("option")).toHaveLength(3);
    expect(screen.getByRole("option", { name: mixed["lang.mixed"] })).toHaveAttribute("aria-selected", "true");

    await user.click(screen.getByRole("option", { name: en["lang.en"] }));

    expect(useLanguageStore.getState().lang).toBe("en");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(screen.getByRole("button")).toHaveTextContent("EN");
  });

  it("closes with Escape and on an outside tap", async () => {
    const user = userEvent.setup();
    render(
      <div>
        <LanguageMenu />
        <p>outside</p>
      </div>
    );

    await user.click(screen.getByRole("button"));
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button"));
    await user.click(screen.getByText("outside"));
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });
});
