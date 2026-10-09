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
  const read = (): T =>
    drafts.has(id)
      ? (drafts.get(id) as T)
      : typeof initial === "function"
        ? (initial as () => T)()
        : initial;
  const [state, setState] = useState(() => ({ id, value: read() }));
  const value = state.id === id ? state.value : read();
  const update = useCallback(
    (next: SetStateAction<T>) => {
      setState((previous) => {
        const current = previous.id === id ? previous.value : read();
        const value =
          typeof next === "function" ? (next as (p: T) => T)(current) : next;
        drafts.set(id, value);
        return { id, value };
      });
    },
    [id],
  );
  return [value, update];
}
