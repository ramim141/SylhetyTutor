import { render, screen } from "@testing-library/react";
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
});
