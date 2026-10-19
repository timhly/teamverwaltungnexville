import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
  ChevronLeft,
  ChevronRight,
  Inbox,
  LoaderCircle,
  X,
} from "lucide-react";
import {
  cloneElement,
  isValidElement,
  useEffect,
  useId,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type ReactNode,
} from "react";
import { cn } from "../lib/utils";
import { useStore } from "../lib/store";
import { draftPrefix, readDraft, removeDraft, writeDraft } from "../lib/drafts";

export function Button({
  className,
  variant = "default",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "secondary" | "ghost" | "danger";
}) {
  return (
    <button
      className={cn("button", `button-${variant}`, className)}
      {...props}
    />
  );
}
export function Badge({
  children,
  tone = "neutral",
  className,
  style,
}: {
  children: ReactNode;
  tone?: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <span className={cn("badge", `badge-${tone}`, className)} style={style}>
      {children}
    </span>
  );
}
export function Avatar({
  name,
  size = "normal",
}: {
  name: string;
  size?: "normal" | "large";
}) {
  return (
    <span
      aria-hidden="true"
      className={cn("avatar", size === "large" && "avatar-lg")}
      title={name}
    >
      <img
        src={`${import.meta.env.BASE_URL}brand/nexville-avatar.gif`}
        alt=""
        width={size === "large" ? 56 : 36}
        height={size === "large" ? 56 : 36}
        loading="lazy"
      />
    </span>
  );
}
export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  wide = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="dialog-overlay" />
        <DialogPrimitive.Content
          className={cn("dialog-content", wide && "dialog-wide")}
          onOpenAutoFocus={(e) => {
            const target = (
              e.currentTarget as HTMLElement
            ).querySelector<HTMLInputElement>("input,textarea,select");
            if (target) {
              e.preventDefault();
              target.focus();
            }
          }}
        >
          <div className="dialog-heading">
            <div>
              <DialogPrimitive.Title>{title}</DialogPrimitive.Title>
              <DialogPrimitive.Description>
                {description || "Änderungen werden automatisch gespeichert."}
              </DialogPrimitive.Description>
            </div>
            <DialogPrimitive.Close
              className="icon-button"
              aria-label="Dialog schließen"
            >
              <X size={20} />
            </DialogPrimitive.Close>
          </div>
          {children}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
export function Empty({
  title,
  children,
  action,
}: {
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <div className="empty-icon">
        <Inbox size={25} />
      </div>
      <h3>{title}</h3>
      <p>{children}</p>
      {action}
    </div>
  );
}
export function Loading({
  children = "Daten werden geladen …",
}: {
  children?: ReactNode;
}) {
  return (
    <div className="loading">
      <LoaderCircle size={23} className="spin" />
      <span>{children}</span>
    </div>
  );
}
export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  const id = useId();
  const native =
    isValidElement(children) &&
    typeof children.type === "string" &&
    ["input", "textarea", "select"].includes(children.type);
  return (
    <div className="field">
      {native ? <label htmlFor={id}>{label}</label> : <span>{label}</span>}
      {native
        ? cloneElement(children as React.ReactElement<{ id: string }>, { id })
        : children}
      {hint && <small>{hint}</small>}
    </div>
  );
}
export function Pagination({
  page,
  setPage,
  total,
  size = 10,
}: {
  page: number;
  setPage: (page: number) => void;
  total: number;
  size?: number;
}) {
  const pages = Math.max(1, Math.ceil(total / size));
  useEffect(() => {
    if (page >= pages) setPage(pages - 1);
  }, [page, pages, setPage]);
  return (
    <div className="pagination">
      <span>
        {total
          ? `${page * size + 1}–${Math.min((page + 1) * size, total)} von ${total} Einträgen`
          : "0 Einträge"}
      </span>
      <div>
        <Button
          variant="secondary"
          aria-label="Vorherige Seite"
          disabled={page === 0}
          onClick={() => setPage(page - 1)}
        >
          <ChevronLeft size={16} />
        </Button>
        <span>
          {page + 1} / {pages}
        </span>
        <Button
          variant="secondary"
          aria-label="Nächste Seite"
          disabled={page + 1 >= pages}
          onClick={() => setPage(page + 1)}
        >
          <ChevronRight size={16} />
        </Button>
      </div>
    </div>
  );
}
type AutoInputProps = {
  value: string;
  onSave: (value: string) => Promise<void>;
  multiline?: boolean;
  disabled?: boolean;
  label: string;
  placeholder?: string;
  type?: string;
  maxLength?: number;
};
export function AutoInput(props: AutoInputProps) {
  const { session, teamId } = useStore();
  const storageKey = draftPrefix(session.user.id, teamId) + props.label;
  return <AutoInputInner key={storageKey} {...props} storageKey={storageKey} />;
}
function AutoInputInner({
  value,
  onSave,
  multiline = false,
  disabled,
  label,
  placeholder,
  type = "text",
  maxLength = 10000,
  storageKey,
}: AutoInputProps & { storageKey: string }) {
  const existing = useRef(readDraft(storageKey));
  const [draft, setDraft] = useState(existing.current?.value ?? value);
  const [error, setError] = useState("");
  const [localConflict, setLocalConflict] = useState(
    !!existing.current && existing.current.base !== value,
  );
  const saved = useRef(existing.current?.base ?? value);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const saveRef = useRef(onSave);
  saveRef.current = onSave;
  const saveAtEdit = useRef(onSave);
  const draftRef = useRef(draft);
  draftRef.current = draft;
  const dirty = useRef(!!existing.current);
  useEffect(() => {
    if (!dirty.current) {
      setDraft(value);
      draftRef.current = value;
      saved.current = value;
    }
  }, [value]);
  const commit = async () => {
    clearTimeout(timer.current);
    if (disabled || localConflict) return;
    if (!dirty.current || draftRef.current === saved.current) {
      dirty.current = false;
      removeDraft(storageKey);
      return;
    }
    const next = draftRef.current;
    try {
      await saveAtEdit.current(next);
      saved.current = next;
      dirty.current = draftRef.current !== next;
      if (!dirty.current) removeDraft(storageKey);
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  };
  const commitRef = useRef(commit);
  commitRef.current = commit;
  useEffect(() => {
    if (existing.current && !localConflict && !disabled)
      timer.current = setTimeout(() => void commitRef.current(), 650);
  }, []);
  useEffect(
    () => () => {
      clearTimeout(timer.current);
      if (dirty.current) void commitRef.current();
    },
    [],
  );
  useEffect(() => {
    const before = (e: BeforeUnloadEvent) => {
      if (dirty.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", before);
    return () => window.removeEventListener("beforeunload", before);
  }, []);
  const props = {
    value: draft,
    disabled,
    "aria-label": label,
    placeholder,
    maxLength,
    onBlur: () => void commit(),
    onChange: (
      e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    ) => {
      const next = e.target.value;
      if (!dirty.current) {
        saved.current = value;
        saveAtEdit.current = saveRef.current;
      }
      try {
        writeDraft(storageKey, {
          value: next,
          base: saved.current,
          route: location.hash.slice(1) || "/",
          label,
        });
      } catch {
        setError(
          "Der Browser kann den Entwurf nicht sichern. Bitte den Browserspeicher prüfen.",
        );
        return;
      }
      draftRef.current = next;
      setDraft(next);
      dirty.current = true;
      clearTimeout(timer.current);
      timer.current = setTimeout(() => void commitRef.current(), 650);
    },
  };
  return (
    <div className="auto-field">
      {multiline ? (
        <textarea rows={3} {...props} />
      ) : (
        <input type={type} {...props} />
      )}
      <div className="print-only">{draft}</div>
      {localConflict && (
        <div className="draft-conflict">
          <small>
            Ein lokaler Entwurf weicht vom Server ab. Serverfassung:{" "}
            {value || "(leer)"}
          </small>
          <button
            onClick={() => {
              removeDraft(storageKey);
              dirty.current = false;
              setLocalConflict(false);
              setDraft(value);
              draftRef.current = value;
              saved.current = value;
            }}
          >
            Serverfassung übernehmen
          </button>
          <button
            disabled={disabled}
            onClick={() => {
              saveAtEdit.current = saveRef.current;
              setLocalConflict(false);
              setTimeout(() => void commitRef.current(), 0);
            }}
          >
            Meinen Entwurf anwenden
          </button>
        </div>
      )}
      {error && (
        <small className="error-text" role="alert">
          {error}
        </small>
      )}
    </div>
  );
}
