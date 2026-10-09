import { create } from "zustand";
export interface ImportPrompt {
  id: string;
  filename: string;
  kind: "password" | "permission" | "fidelity";
  message: string;
  accept: (value: string) => void;
  cancel: () => void;
}
export const useImportPrompt = create<{ prompt: ImportPrompt | null }>(() => ({
  prompt: null,
}));
export function requestImportPrompt(
  filename: string,
  kind: ImportPrompt["kind"],
  message: string,
  signal: AbortSignal,
): Promise<string> {
  signal.throwIfAborted();
  return new Promise((resolve, reject) => {
    const id = crypto.randomUUID();
    const finish = () => {
      signal.removeEventListener("abort", cancel);
      if (useImportPrompt.getState().prompt?.id === id)
        useImportPrompt.setState({ prompt: null });
    };
    const cancel = () => {
      finish();
      reject(
        new DOMException(
          "Import cancelled. Your existing work is unchanged.",
          "AbortError",
        ),
      );
    };
    useImportPrompt.getState().prompt?.cancel();
    signal.addEventListener("abort", cancel, { once: true });
    useImportPrompt.setState({
      prompt: {
        id,
        filename,
        kind,
        message,
        accept: (value) => {
          finish();
          resolve(value);
        },
        cancel,
      },
    });
  });
}
