import { render } from "@testing-library/react";
import { describe, it, expect, afterEach } from "vitest";
import { SEO } from "./SEO";

describe("SEO component", () => {
  afterEach(() => {
    document.title = "";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.remove();
    const ld = document.querySelector('script[type="application/ld+json"]');
    if (ld) ld.remove();
  });

  it("updates document title with SylhetyTutor suffix", () => {
    render(<SEO title="Verified Tutors" />);
    expect(document.title).toBe("Verified Tutors | SylhetyTutor");
  });

  it("does not duplicate SylhetyTutor in title if already included", () => {
    render(<SEO title="SylhetyTutor — Home" />);
    expect(document.title).toBe("SylhetyTutor — Home");
  });

  it("injects and cleans up JSON-LD schema script", () => {
    const jsonLd = { "@context": "https://schema.org", "@type": "FAQPage" };
    const { unmount } = render(<SEO title="FAQ" jsonLd={jsonLd} />);

    const script = document.querySelector('script[type="application/ld+json"]');
    expect(script).not.toBeNull();
    expect(JSON.parse(script.textContent)).toEqual(jsonLd);

    unmount();
    expect(document.querySelector('script[type="application/ld+json"]')).toBeNull();
  });
});
