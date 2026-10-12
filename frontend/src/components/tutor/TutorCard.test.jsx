import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { TutorCard } from "./TutorCard";
import { mixed } from "../../i18n";

const base = {
  name: "Rahim Uddin",
  initials: "RU",
  university: "SUST",
  area: "Amberkhana",
  subjects: ["Physics"],
  classes: ["HSC"],
};

describe("TutorCard", () => {
  it("shows the fee range with thousands separators", () => {
    render(<TutorCard {...base} feeMin={3000} feeMax={12000} />);

    expect(screen.getByText("৳3,000–12,000")).toBeInTheDocument();
  });

  it("shows no fee at all (not ৳0) when the tutor has not set one", () => {
    render(<TutorCard {...base} feeMin={null} feeMax={null} />);

    expect(screen.queryByText(new RegExp(mixed["card.salary"]))).not.toBeInTheDocument();
    expect(screen.queryByText(/৳/)).not.toBeInTheDocument();
  });

  it("says New instead of a rating when there are no reviews", () => {
    render(<TutorCard {...base} reviewCount={0} rating={0} />);

    expect(screen.getByText(mixed["card.new"])).toBeInTheDocument();
    expect(screen.queryByText("0.0")).not.toBeInTheDocument();
  });

  describe("opening the profile", () => {
    const renderCard = (props) =>
      render(
        <MemoryRouter initialEntries={["/tutors"]}>
          <Routes>
            <Route path="/tutors" element={<TutorCard {...base} {...props} />} />
            <Route path="/tutors/:slug" element={<div>Profile page</div>} />
          </Routes>
        </MemoryRouter>
      );

    it("links the tutor's name to the profile address", () => {
      renderCard({ slug: "rahim-uddin-physics" });

      expect(screen.getByRole("link", { name: "Rahim Uddin" })).toHaveAttribute(
        "href",
        "/tutors/rahim-uddin-physics"
      );
    });

    it("has a single link (the View Profile look is not a second tab stop)", () => {
      renderCard({ slug: "rahim-uddin-physics" });

      expect(screen.getAllByRole("link")).toHaveLength(1);
      expect(screen.queryByRole("button")).not.toBeInTheDocument();
    });

    it("opens the profile", async () => {
      renderCard({ slug: "rahim-uddin-physics" });

      await userEvent.click(screen.getByRole("link", { name: "Rahim Uddin" }));

      expect(screen.getByText("Profile page")).toBeInTheDocument();
    });

    it("shows the name without a link when there is no address yet", () => {
      renderCard({});

      expect(screen.queryByRole("link")).not.toBeInTheDocument();
      expect(screen.getByRole("heading", { name: "Rahim Uddin" })).toBeInTheDocument();
    });
  });
});
