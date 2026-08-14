import type { OrderWizardState } from "../types";

// Versioned key so a future shape change can be detected and safely
// discarded instead of crashing on old, incompatible localStorage data.
const STORAGE_KEY = "nimia:order-wizard:v1";

/** Everything in OrderWizardState EXCEPT `files` — File objects aren't
 * JSON-serializable and, per the brief, don't need to survive a reload yet
 * (Cloudinary/real upload storage is a later phase). This is also what
 * makes the "redirected to /login, then back to Review" flow work: the
 * rest of the order (category/service/package/config/brief/step) survives
 * that full-page navigation, only re-attaching files is needed again. */
type PersistedState = Omit<OrderWizardState, "files">;

export function loadOrderState(): PersistedState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    return parsed as PersistedState;
  } catch {
    return null;
  }
}

export function saveOrderState(state: OrderWizardState): void {
  if (typeof window === "undefined") return;
  try {
    const { files: _files, ...persisted } = state;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(persisted));
  } catch {
    // Storage can fail (quota, private browsing) — losing persistence isn't
    // fatal, the wizard still works for the current page session.
  }
}

export function clearOrderState(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
