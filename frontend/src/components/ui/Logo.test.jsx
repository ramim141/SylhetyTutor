import { render } from "@testing-library/react";
import { Logo } from "./Logo";

describe("Logo", () => {
  it("renders both theme files by default so CSS can pick one", () => {
    const { container } = render(<Logo />);

    const imgs = [...container.querySelectorAll("img")];
    expect(imgs.map((i) => i.className.includes("logo-light") || i.className.includes("logo-dark"))).toEqual([true, true]);
    expect(imgs.every((i) => i.getAttribute("alt") === "SylhetyTutor")).toBe(true);
  });

  it("on-dark renders only the dark-surface file", () => {
    const { container } = render(<Logo variant="on-dark" />);

    const imgs = container.querySelectorAll("img");
    expect(imgs).toHaveLength(1);
    expect(imgs[0]).toHaveAttribute("src", "/images/logo-dark.png");
  });
});
