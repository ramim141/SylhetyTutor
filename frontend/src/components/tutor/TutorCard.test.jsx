import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { TutorCard } from "./TutorCard";
import { mixed } from "../../i18n";
import { useAuthStore } from "../../store/authStore";
import { useLanguageStore } from "../../store/languageStore";

const base = {
  name: "Rahim Uddin",
  initials: "RU",
  university: {
    slug: "sust",
    name_en: "Shahjalal University",
    name_bn: "শাহজালাল বিশ্ববিদ্যালয়",
    short_name: "SUST",
  },
  department: "Physics",
  area: { slug: "amberkhana", name_en: "Amberkhana", name_bn: "আম্বরখানা" },
  subjects: [
    { slug: "physics", name_en: "Physics", name_bn: "পদার্থবিজ্ঞান" },
    { slug: "math", name_en: "Math", name_bn: "গণিত" },
  ],
  classes: [{ slug: "hsc", name_en: "HSC", name_bn: "এইচএসসি" }],
};

describe("TutorCard", () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, status: "guest" });
  });

  it("shows the fee range with thousands separators", () => {
    render(<TutorCard {...base} feeMin={3000} feeMax={12000} />);

    expect(screen.getByText("৳3,000–12,000")).toBeInTheDocument();
  });

  it("shows only name and university when viewed by another tutor", () => {
    useAuthStore.setState({ user: { role: "tutor" }, status: "authenticated" });
    render(<TutorCard {...base} feeMin={3000} feeMax={12000} />);

    expect(screen.getByText("Rahim Uddin")).toBeInTheDocument();
    expect(screen.getByText(/শাহজালাল|SUST/)).toBeInTheDocument();
    expect(screen.queryByText("৳3,000–12,000")).not.toBeInTheDocument();
    expect(screen.queryByText("Physics, Math")).not.toBeInTheDocument();
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
        </MemoryRouter>,
      );

    it("links the tutor's name to the profile address", () => {
      renderCard({ slug: "rahim-uddin-physics" });

      expect(screen.getByRole("link", { name: "Rahim Uddin" })).toHaveAttribute(
        "href",
        "/tutors/rahim-uddin-physics",
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

  describe("names in the visitor's language", () => {
    beforeEach(() => useLanguageStore.setState({ lang: "mixed" }));

    it("shows Bangla names for subjects, classes, university and area in Bangla and Mixed mode", () => {
      render(<TutorCard {...base} />);

      expect(screen.getByText("পদার্থবিজ্ঞান, গণিত")).toBeInTheDocument();
      expect(screen.getByText("এইচএসসি")).toBeInTheDocument();
      expect(screen.getByText(/শাহজালাল বিশ্ববিদ্যালয় \(Physics\)/)).toBeInTheDocument();
      expect(screen.getByText("আম্বরখানা")).toBeInTheDocument();
      expect(screen.queryByText(/Amberkhana/)).not.toBeInTheDocument();
    });

    it("shows English names (and the short university name) in English", () => {
      useLanguageStore.setState({ lang: "en" });
      render(<TutorCard {...base} />);

      expect(screen.getByText("Physics, Math")).toBeInTheDocument();
      expect(screen.getByText("HSC")).toBeInTheDocument();
      expect(screen.getByText(/SUST \(Physics\)/)).toBeInTheDocument();
      expect(screen.getByText("Amberkhana")).toBeInTheDocument();
    });

    it("leaves out what the tutor has not filled in instead of inventing it", () => {
      render(
        <TutorCard
          {...base}
          university={null}
          department=""
          area={null}
          subjects={[]}
          classes={[]}
        />,
      );

      expect(screen.queryByText(/Sylhet/)).not.toBeInTheDocument();
      expect(screen.queryByText(/·/)).not.toBeInTheDocument();
    });

    it("shows only the part that exists when the area is missing", () => {
      render(<TutorCard {...base} area={null} />);

      expect(screen.getByText(/শাহজালাল বিশ্ববিদ্যালয় \(Physics\)/)).toBeInTheDocument();
      expect(screen.queryByText(/·/)).not.toBeInTheDocument();
    });
  });
});
