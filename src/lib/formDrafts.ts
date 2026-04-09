/**
 * Draft persistence utility for admin forms
 * Saves form data to localStorage so it persists across navigation
 */

export function getDraft<T>(key: string): Partial<T> | null {
  try {
    const stored = localStorage.getItem(key);
    if (!stored) return null;
    return JSON.parse(stored) as Partial<T>;
  } catch {
    return null;
  }
}

export function setDraft<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore localStorage errors (quota exceeded, etc.)
  }
}

export function clearDraft(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // Ignore errors
  }
}

export function getDraftKey(formType: string, id?: string): string {
  return id ? `${formType}:${id}` : `${formType}:new`;
}
