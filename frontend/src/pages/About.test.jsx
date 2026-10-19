import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect } from "vitest";
import About from "./About";
import { mixed } from "../i18n";

describe("About page", () => {
  it("renders mission, why choose us, and local Sylhet roots", () => {
    render(
      <MemoryRouter>
        <About />
      </MemoryRouter>
    );

    expect(screen.getByRole("heading", { level: 1, name: mixed["about.title"] })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: mixed["about.missionTitle"] })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: mixed["about.whyTitle"] })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: mixed["about.builtByTitle"] })).toBeInTheDocument();
  });
});
