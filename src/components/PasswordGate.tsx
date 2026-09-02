import { useState, type FormEvent, type ReactNode } from "react";

const STORAGE_KEY = "jeffco-explorer-gate";
const EXPECTED = "Jeffco";

function isUnlocked() {
  try {
    return sessionStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function PasswordGate({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(isUnlocked);
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);

  function submit(event: FormEvent) {
    event.preventDefault();
    if (password === EXPECTED) {
      try {
        sessionStorage.setItem(STORAGE_KEY, "1");
      } catch {
        /* ignore quota / private mode */
      }
      setOpen(true);
      setError(false);
      return;
    }
    setError(true);
  }

  if (open) return children;

  return (
    <div className="password-gate">
      <form className="password-gate-card" onSubmit={submit}>
        <p className="eyebrow">Jeffco Facilities Explorer</p>
        <h1>Enter the password to continue</h1>
        <label className="field">
          <span className="field-label">Password</span>
          <input
            type="password"
            name="password"
            autoComplete="current-password"
            autoFocus
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              setError(false);
            }}
            aria-invalid={error}
          />
        </label>
        {error ? <p className="password-gate-error">That password is not correct.</p> : null}
        <button className="btn btn-primary" type="submit">
          Continue
        </button>
      </form>
    </div>
  );
}
