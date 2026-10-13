import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

afterEach(() => {
  cleanup();
  localStorage.clear();
});

// jsdom has no matchMedia; themeStore uses it for the "system" theme
if (!window.matchMedia) {
  window.matchMedia = (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  });
}

// jsdom doesn't implement scrolling; pages call these on tab taps and form submits
Element.prototype.scrollIntoView ??= function scrollIntoView() {};
window.scrollTo = () => {};

// jsdom has no object URLs; the document preview turns a fetched image into one
URL.createObjectURL ??= () => "blob:preview";
URL.revokeObjectURL ??= () => {};
