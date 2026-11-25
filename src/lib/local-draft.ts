export function writeLocalDraft(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // This browser refused storage.
  }
}

export function clearLocalDraft(key: string) {
  try {
    localStorage.removeItem(key);
  } catch {
    // This browser refused storage.
  }
}
