import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect } from "vitest";
import Safety from "./Safety";
import { en } from "../i18n";

describe("Safety page", () => {
  it("renders 48-Hour Guarantee and multi-step verification info", () => {
    render(
      <MemoryRouter>
        <Safety />
      </MemoryRouter>
    );

    expect(screen.getByRole("heading", { level: 1, name: en["safety.title"] })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: en["safety.guaranteeTitle"] })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: en["safety.verificationTitle"] })).toBeInTheDocument();
  });
});
