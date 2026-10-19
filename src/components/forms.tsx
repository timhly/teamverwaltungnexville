import { useState, type FormEvent, type ReactNode } from "react";
import { LoaderCircle } from "lucide-react";
import { Button } from "./ui";
import { errorMessage } from "../lib/utils";

export function CreateForm({
  onSubmit,
  children,
  submitLabel = "Erstellen",
  onCancel,
}: {
  onSubmit: (form: FormData) => Promise<void>;
  children: ReactNode;
  submitLabel?: string;
  onCancel: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    try {
      await onSubmit(form);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <form onSubmit={submit} className="form-stack">
      <fieldset disabled={busy}>{children}</fieldset>
      {error && (
        <div role="alert" className="notice notice-error">
          {error}
        </div>
      )}
      <div className="form-actions">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Abbrechen
        </Button>
        <Button type="submit" disabled={busy}>
          {busy && <LoaderCircle size={16} className="spin" />}
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
export const text = (form: FormData, key: string) =>
  String(form.get(key) || "").trim();
export const nullable = (form: FormData, key: string) =>
  text(form, key) || null;
