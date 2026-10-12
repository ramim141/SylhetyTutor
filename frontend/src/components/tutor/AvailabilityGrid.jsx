import { Check, Minus } from "lucide-react";
import { useTranslation } from "../../i18n";
import { DAYS, SLOTS, toSlotSet } from "../../utils/availability";

/**
 * The tutor's free times: a row per day, a column per slot. "Free" is shown by an icon and
 * text for screen readers, not by colour alone (DESIGN.md 2.5).
 *
 * Give it `onToggle(day, slot)` and every cell becomes a button (the registration form);
 * without it the grid is read-only (the public profile).
 */
export function AvailabilityGrid({ availability = [], onToggle, disabled = false }) {
  const { t } = useTranslation();
  const free = toSlotSet(availability);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-separate border-spacing-1.5">
        <caption className="sr-only">{t("profile.availability")}</caption>
        <thead>
          <tr>
            <th scope="col" className="text-left font-display font-semibold text-xs text-fg-muted">
              <span className="sr-only">{t("profile.day")}</span>
            </th>
            {SLOTS.map((slot) => (
              <th
                key={slot}
                scope="col"
                className="font-display font-semibold text-xs text-fg-secondary px-1"
              >
                {t(`profile.slot.${slot}`)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {DAYS.map((day) => (
            <tr key={day}>
              <th
                scope="row"
                className="text-left font-display font-semibold text-fg pr-2 whitespace-nowrap"
              >
                {t(`profile.day.${day}`)}
              </th>
              {SLOTS.map((slot) => {
                const isFree = free.has(`${day}:${slot}`);
                const mark = isFree ? (
                  <Check className="w-5 h-5 mx-auto" aria-hidden />
                ) : (
                  <Minus className="w-4 h-4 mx-auto" aria-hidden />
                );
                return (
                  <td
                    key={slot}
                    data-free={isFree}
                    className={`h-11 rounded-md text-center align-middle ${
                      isFree ? "bg-success-bg text-success" : "bg-bg-subtle text-fg-muted"
                    }`}
                  >
                    {onToggle ? (
                      <button
                        type="button"
                        disabled={disabled}
                        aria-pressed={isFree}
                        onClick={() => onToggle(day, slot)}
                        className="w-full h-full min-h-11 rounded-md cursor-pointer disabled:cursor-not-allowed focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-orange"
                      >
                        {mark}
                        <span className="sr-only">
                          {t("tr.availability.slot", {
                            day: t(`profile.day.${day}`),
                            slot: t(`profile.slot.${slot}`),
                          })}
                        </span>
                      </button>
                    ) : (
                      <>
                        {mark}
                        <span className="sr-only">
                          {isFree ? t("profile.free") : t("profile.busy")}
                        </span>
                      </>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default AvailabilityGrid;
