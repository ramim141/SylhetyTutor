// The tutor search page keeps its filters in the URL (?area=amberkhana&subject=physics)
// so a link can be shared and the Back button works. Only known, valid values get through;
// the same names are sent to the API (GET /tutors/, see backend/apps/tutors/filters.py).
export const PAGE_SIZE = 20;
export const SORTS = ["featured", "rating", "newest"];
export const GENDERS = ["male", "female"];

const TEXT_KEYS = ["q", "area", "subject", "class_level", "university"];
const NUMBER_KEYS = ["fee_min", "fee_max"];
// Filters shown as "applied" (the search box, sort and page are not filters)
export const FILTER_KEYS = ["area", "subject", "class_level", "university", "gender", ...NUMBER_KEYS];

function toWholeNumber(value) {
  return /^\d{1,9}$/.test(value ?? "") ? Number(value) : null;
}

export function parseFilters(params) {
  const filters = {};
  for (const key of TEXT_KEYS) {
    const value = (params.get(key) ?? "").trim();
    if (value) filters[key] = value;
  }
  const gender = params.get("gender");
  if (GENDERS.includes(gender)) filters.gender = gender;
  for (const key of NUMBER_KEYS) {
    const value = toWholeNumber(params.get(key));
    if (value !== null) filters[key] = value;
  }
  const sort = params.get("sort");
  if (SORTS.includes(sort) && sort !== SORTS[0]) filters.sort = sort; // featured is the default
  const page = toWholeNumber(params.get("page"));
  if (page && page > 1) filters.page = page;
  return filters;
}

export function toSearchParams(filters) {
  const params = new URLSearchParams();
  for (const key of [...TEXT_KEYS, "gender", ...NUMBER_KEYS, "sort", "page"]) {
    const value = filters[key];
    if (value !== undefined && value !== null && value !== "") params.set(key, String(value));
  }
  return params;
}

/** Apply a change; any change except paging goes back to page 1. Empty values remove the key. */
export function applyChange(filters, patch) {
  const next = { ...filters, ...patch };
  if (!("page" in patch)) delete next.page;
  for (const key of Object.keys(next)) {
    if (next[key] === "" || next[key] === null || next[key] === undefined) delete next[key];
  }
  if (next.sort === SORTS[0]) delete next.sort;
  if (next.page <= 1) delete next.page;
  return next;
}

export function countActiveFilters(filters) {
  return FILTER_KEYS.filter((key) => filters[key] !== undefined).length;
}

export function clearFilters(filters) {
  const { q, sort } = filters;
  return applyChange({}, { q, sort });
}

/** Link to the search page, e.g. searchPath({ area: "amberkhana" }) -> "/tutors?area=amberkhana". */
export function searchPath(filters = {}) {
  const query = toSearchParams(applyChange({}, filters)).toString();
  return query ? `/tutors?${query}` : "/tutors";
}
