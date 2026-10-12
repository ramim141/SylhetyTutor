import { getReturnTo, keepReturnTo } from "./returnTo";

const at = (from) => ({ state: { from } });

describe("getReturnTo", () => {
  it("defaults to the dashboard when nothing was requested", () => {
    expect(getReturnTo(undefined)).toBe("/dashboard");
    expect(getReturnTo({ state: null })).toBe("/dashboard");
    expect(getReturnTo({})).toBe("/dashboard");
  });

  it("returns the page the visitor wanted, keeping its query string and hash", () => {
    expect(getReturnTo(at({ pathname: "/tutors", search: "?area=amberkhana", hash: "#top" }))).toBe(
      "/tutors?area=amberkhana#top"
    );
    expect(getReturnTo(at({ pathname: "/dashboard" }))).toBe("/dashboard");
  });

  it("never loops back to the login or register page", () => {
    expect(getReturnTo(at({ pathname: "/login" }))).toBe("/dashboard");
    expect(getReturnTo(at({ pathname: "/register", search: "?x=1" }))).toBe("/dashboard");
  });

  it("ignores anything that is not an in-app path", () => {
    expect(getReturnTo(at({ pathname: "//evil.example" }))).toBe("/dashboard");
    expect(getReturnTo(at({ pathname: "https://evil.example" }))).toBe("/dashboard");
    expect(getReturnTo(at({ pathname: 42 }))).toBe("/dashboard");
  });
});

describe("keepReturnTo", () => {
  it("carries the destination to the sibling auth page", () => {
    const from = { pathname: "/tutors", search: "?q=math" };
    expect(keepReturnTo(at(from))).toEqual({ from });
  });

  it("passes nothing when there is no destination", () => {
    expect(keepReturnTo({ state: null })).toBeUndefined();
  });
});
