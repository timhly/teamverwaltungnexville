import type { Role } from "../lib/types";
export function RolePicker({
  roles,
  selected,
  onChange,
  disabled = false,
}: {
  roles: Role[];
  selected?: string[];
  onChange?: (ids: string[]) => void;
  disabled?: boolean;
}) {
  return (
    <div className="role-picker">
      {(
        [
          {
            kind: "rank",
            title: "Ränge",
            hint: "Nach der Nexville-Rangfolge sortiert.",
          },
          {
            kind: "extra",
            title: "Zusatzrollen",
            hint: "Unabhängig vom Rang zuweisbar.",
          },
          {
            kind: "legacy",
            title: "Weitere bestehende Zuständigkeiten",
            hint: "Vorhandene Zuweisungen aus der bisherigen Verwaltung.",
          },
        ] as const
      ).map((group) => {
        const options = roles.filter(
          (r) =>
            r.kind === group.kind &&
            (group.kind !== "legacy" || selected?.includes(r.id)),
        );
        if (!options.length) return null;
        return (
          <div className="role-picker-group" key={group.kind}>
            <div>
              <strong>{group.title}</strong>
              <small>{group.hint}</small>
            </div>
            <div className="checkbox-grid">
              {options.map((r) => (
                <label key={r.id}>
                  <input
                    type="checkbox"
                    name="roles"
                    value={r.id}
                    disabled={disabled}
                    {...(selected
                      ? {
                          checked: selected.includes(r.id),
                          onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
                            onChange?.(
                              e.target.checked
                                ? [...selected, r.id]
                                : selected.filter((id) => id !== r.id),
                            ),
                        }
                      : {})}
                  />
                  <span>{r.name}</span>
                </label>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
