// The week as the backend stores it: 7 days (Saturday first, as in Sylhet) x 3 slots.
export const DAYS = ["sat", "sun", "mon", "tue", "wed", "thu", "fri"];
export const SLOTS = ["morning", "afternoon", "evening"];

/** [{day, slot}] -> Set of "day:slot" for quick lookup. */
export function toSlotSet(availability = []) {
  return new Set(availability.map(({ day, slot }) => `${day}:${slot}`));
}
