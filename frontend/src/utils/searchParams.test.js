import {
  applyChange,
  clearFilters,
  countActiveFilters,
  parseFilters,
  toSearchParams,
} from "./searchParams";

const parse = (query) => parseFilters(new URLSearchParams(query));

describe("parseFilters", () => {
  it("reads every known filter", () => {
    expect(
      parse(
        "q=math&area=amberkhana&subject=physics&class_level=hsc&university=sust&gender=female" +
          "&fee_min=3000&fee_max=6000&sort=rating&page=3"
      )
    ).toEqual({
      q: "math",
      area: "amberkhana",
      subject: "physics",
      class_level: "hsc",
      university: "sust",
      gender: "female",
      fee_min: 3000,
      fee_max: 6000,
      sort: "rating",
      page: 3,
    });
  });

  it("drops unknown keys and invalid values instead of sending them to the API", () => {
    expect(
      parse("evil=1&gender=robot&sort=random&page=0&fee_min=-5&fee_max=abc&area=%20&q=%20%20")
    ).toEqual({});
  });

  it("treats the default sort and page 1 as no value", () => {
    expect(parse("sort=featured&page=1")).toEqual({});
  });

  it("trims text values", () => {
    expect(parse("q=%20rahim%20")).toEqual({ q: "rahim" });
  });
});

describe("toSearchParams", () => {
  it("writes a stable, shareable query string", () => {
    const filters = { page: 2, sort: "newest", subject: "physics", area: "amberkhana", q: "ali" };
    expect(toSearchParams(filters).toString()).toBe(
      "q=ali&area=amberkhana&subject=physics&sort=newest&page=2"
    );
  });

  it("round-trips through parseFilters", () => {
    const filters = { area: "zindabazar", gender: "male", fee_min: 4000, sort: "rating", page: 2 };
    expect(parseFilters(toSearchParams(filters))).toEqual(filters);
  });
});

describe("applyChange", () => {
  it("goes back to page 1 when a filter changes", () => {
    expect(applyChange({ area: "a", page: 4 }, { subject: "math" })).toEqual({
      area: "a",
      subject: "math",
    });
  });

  it("keeps the page when only the page changes", () => {
    expect(applyChange({ area: "a" }, { page: 3 })).toEqual({ area: "a", page: 3 });
  });

  it("removes a filter set to an empty value", () => {
    expect(applyChange({ area: "a", q: "x" }, { area: "" })).toEqual({ q: "x" });
  });

  it("does not store the default sort or page 1", () => {
    expect(applyChange({ sort: "rating" }, { sort: "featured" })).toEqual({});
    expect(applyChange({}, { page: 1 })).toEqual({});
  });
});

describe("filters helpers", () => {
  it("counts filters but not the search text, sort or page", () => {
    expect(countActiveFilters({ q: "x", sort: "rating", page: 2 })).toBe(0);
    expect(countActiveFilters({ area: "a", gender: "male", fee_max: 5000, q: "x" })).toBe(3);
  });

  it("clearFilters keeps what the user typed and the chosen sort", () => {
    expect(clearFilters({ q: "ali", sort: "newest", area: "a", fee_min: 3000, page: 2 })).toEqual({
      q: "ali",
      sort: "newest",
    });
  });
});
