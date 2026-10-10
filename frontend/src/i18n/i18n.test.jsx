import { act, renderHook } from "@testing-library/react";
import { useTranslation, en, bn, mixed } from "./index";

describe("i18n", () => {
  it("defines every key in all three languages", () => {
    const keys = Object.keys(mixed).sort();

    expect(Object.keys(en).sort()).toEqual(keys);
    expect(Object.keys(bn).sort()).toEqual(keys);
  });

  it("switches language and remembers it under sylhetytutor_lang", () => {
    const { result } = renderHook(() => useTranslation());

    act(() => result.current.setLang("en"));

    expect(result.current.lang).toBe("en");
    expect(result.current.t("nav.home")).toBe(en["nav.home"]);
    expect(localStorage.getItem("sylhetytutor_lang")).toBe("en");
    expect(document.documentElement.lang).toBe("en");
  });

  it("falls back to the key itself when a translation is missing", () => {
    const { result } = renderHook(() => useTranslation());

    expect(result.current.t("does.not.exist")).toBe("does.not.exist");
  });
});
