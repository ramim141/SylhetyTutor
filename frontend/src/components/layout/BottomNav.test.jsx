import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";
import { BottomNav } from "./BottomNav";
import { mixed } from "../../i18n";
import { useAuthStore } from "../../store/authStore";
import { useLanguageStore } from "../../store/languageStore";

function Where() {
  const { pathname, state } = useLocation();
  return <output data-testid="where">{`${pathname}|${state?.tab ?? ""}`}</output>;
}

function renderAt(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route
          path="*"
          element={
            <>
              <Where />
              <BottomNav />
            </>
          }
        />
      </Routes>
    </MemoryRouter>
  );
}

describe("BottomNav", () => {
  beforeEach(() => {
    useLanguageStore.setState({ lang: "mixed" });
    useAuthStore.setState({ user: null, status: "guest" });
  });

  it("marks Find Tutors as the current tab on the search page", () => {
    renderAt("/tutors?area=amberkhana");

    expect(screen.getByRole("button", { name: mixed["nav.findTutors"] })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("button", { name: mixed["nav.home"] })).not.toHaveAttribute("aria-current");
  });

  it("opens the search page from the Find Tutors tab", async () => {
    renderAt("/dashboard");

    await userEvent.click(screen.getByRole("button", { name: mixed["nav.findTutors"] }));

    expect(screen.getByTestId("where")).toHaveTextContent("/tutors|");
  });

  it("still sends the Areas tab to the home page sheet", async () => {
    renderAt("/tutors");

    await userEvent.click(screen.getByRole("button", { name: mixed["nav.areas"] }));

    expect(screen.getByTestId("where")).toHaveTextContent("/|areas");
  });
});
