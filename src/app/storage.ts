/** localStorage session autosave. Stores exactly the permalink query string. */

const KEY = "langtons-ant/autosave/v1";

export function saveAutosave(encoded: string): void {
  try {
    localStorage.setItem(KEY, encoded);
  } catch {
    // Private mode / quota errors: autosave is best-effort.
  }
}

export function loadAutosave(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function hasAutosave(): boolean {
  return loadAutosave() !== null;
}
