import { describe, it, expect, beforeEach } from "vitest";
import { captureUTM, getStoredUTM } from "./utm";

describe("utm utility", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it("returns empty object when no UTM parameters are stored", () => {
    expect(getStoredUTM()).toEqual({});
  });

  it("captures UTM parameters from window.location.search", () => {
    delete window.location;
    window.location = new URL("https://sylhetytutor.com/?utm_source=facebook&utm_medium=cpc&utm_campaign=launch_sylhet");

    captureUTM();

    const stored = getStoredUTM();
    expect(stored).toEqual({
      acquisition_source: "facebook",
      acquisition_medium: "cpc",
      acquisition_campaign: "launch_sylhet",
    });
  });

  it("handles missing individual UTM parameters gracefully", () => {
    delete window.location;
    window.location = new URL("https://sylhetytutor.com/?utm_source=newsletter");

    captureUTM();

    const stored = getStoredUTM();
    expect(stored.acquisition_source).toBe("newsletter");
    expect(stored.acquisition_medium).toBe("");
    expect(stored.acquisition_campaign).toBe("");
  });
});
