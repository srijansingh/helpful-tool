import { useCallback, useState, type SetStateAction } from "react";
// Temporary draft values live only in memory. Never use this hook for passwords.
const drafts = new Map<string, unknown>();
export function hasSessionDrafts() {
  return drafts.size > 0;
}
export function useSessionState<T>(
  scope: string,
  key: string,
  initial: T | (() => T),
): [T, (next: SetStateAction<T>) => void] {
  const id = `${scope}:${key}`;
  const [value, setValue] = useState<T>(() =>
    drafts.has(id)
      ? (drafts.get(id) as T)
      : typeof initial === "function"
        ? (initial as () => T)()
        : initial,
  );
  const update = useCallback(
    (next: SetStateAction<T>) => {
      setValue((previous) => {
        const v =
          typeof next === "function" ? (next as (p: T) => T)(previous) : next;
        drafts.set(id, v);
        return v;
      });
    },
    [id],
  );
  return [value, update];
}
