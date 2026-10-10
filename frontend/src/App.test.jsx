import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import App from "./App";
import { mixed } from "./i18n";

function renderAt(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>
  );
}

describe("routes", () => {
  it("renders the home page at /", () => {
    renderAt("/");

    expect(screen.getByRole("heading", { level: 1, name: mixed["hero.title"] })).toBeInTheDocument();
  });

  it("renders the 404 page with a link home for unknown paths", () => {
    renderAt("/does-not-exist");

    expect(screen.getByRole("heading", { name: mixed["notFound.title"] })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: mixed["notFound.backHome"] })).toHaveAttribute("href", "/");
  });

  it("serves the component gallery at /dev/ui in development", async () => {
    renderAt("/dev/ui");

    expect(await screen.findByRole("heading", { name: /component gallery/i })).toBeInTheDocument();
  });
});
