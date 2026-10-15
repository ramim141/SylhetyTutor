import { useState } from "react";
import { useTranslation } from "../../i18n";
import { getFieldErrors, getFormError } from "../../api/errors";
import { Alert } from "../ui/Alert";
import { Button } from "../ui/Button";
import { Dialog } from "../ui/Dialog";
import { Input } from "../ui/Input";

/**
 * bKash Send Money, step by step: where to send and how much, then the TrxID and the number it
 * was sent from. `submit({ transaction_id, sender_number })` calls the API; `onDone` runs when it
 * accepts the claim (an admin verifies it later).
 */
export function PayDialog({ amount, number, submit, onClose, onDone }) {
  const { t, has } = useTranslation();
  const [trx, setTrx] = useState("");
  const [sender, setSender] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [fields, setFields] = useState({});

  const send = async () => {
    setBusy(true);
    setError(null);
    setFields({});
    try {
      const payment = await submit({ transaction_id: trx.trim(), sender_number: sender.trim() });
      onDone(payment);
    } catch (err) {
      const named = getFieldErrors(err, { t, has });
      setFields(named);
      setError(Object.keys(named).length ? null : getFormError(err, { t, has }) || t("error.generic"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      isOpen
      busy={busy}
      onClose={onClose}
      title={t("pay.dialog.title")}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            {t("app.dialog.cancel")}
          </Button>
          <Button onClick={send} loading={busy}>
            {busy ? t("pay.dialog.sending") : t("pay.dialog.send")}
          </Button>
        </>
      }
    >
      <ol className="flex flex-col gap-2 text-sm text-fg-secondary list-decimal pl-5">
        <li>{t("pay.dialog.step1")}</li>
        <li className="text-fg font-display font-semibold tabular-nums">
          {t("pay.dialog.step2", { amount, number })}
        </li>
        <li>{t("pay.dialog.step3")}</li>
      </ol>
      {error && <Alert variant="error">{error}</Alert>}
      <Input
        label={t("pay.dialog.trx")}
        value={trx}
        onChange={(e) => setTrx(e.target.value)}
        helperText={t("pay.dialog.trxHint")}
        error={fields.transaction_id}
        autoCapitalize="characters"
        autoComplete="off"
        maxLength={40}
      />
      <Input
        label={t("pay.dialog.sender")}
        value={sender}
        onChange={(e) => setSender(e.target.value)}
        placeholder="01XXXXXXXXX"
        inputMode="tel"
        error={fields.sender_number}
        maxLength={20}
      />
      <p className="text-xs text-fg-muted">{t("pay.dialog.note")}</p>
    </Dialog>
  );
}
