import { Phone } from "lucide-react";
import { useTranslation } from "../../i18n";

/** The other side's contact, shown only once the API sends it (after a booked demo). */
export function ContactCard({ contact, title }) {
  const { t } = useTranslation();
  return (
    <div className="bg-success-bg border border-success rounded-md p-3 flex flex-col gap-1">
      <p className="text-sm font-display font-bold text-success">{title}</p>
      <p className="text-sm text-fg break-words">{contact.name}</p>
      {contact.phone && (
        <a
          href={`tel:${contact.phone}`}
          className="inline-flex items-center gap-2 min-h-11 text-base font-display font-semibold text-fg tabular-nums"
          aria-label={t("app.contact.call", { name: contact.name })}
        >
          <Phone className="w-4 h-4 shrink-0" aria-hidden />
          {contact.phone}
        </a>
      )}
      {contact.email && <p className="text-sm text-fg-secondary break-words">{contact.email}</p>}
      <p className="text-xs text-fg-secondary">{t("app.contact.note")}</p>
    </div>
  );
}
