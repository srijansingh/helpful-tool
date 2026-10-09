import { useRef, useState } from "react";
import { LockKeyhole, AlertTriangle } from "lucide-react";
import {
  useImportPrompt,
  type ImportPrompt as Prompt,
} from "../store/useImportPrompt";
import { useDialogFocus } from "../hooks/useDialogFocus";
function PromptDialog({ prompt }: { prompt: Prompt }) {
  const ref = useRef<HTMLDivElement>(null);
  const [value, setValue] = useState("");
  useDialogFocus(ref, true, prompt.cancel);
  const password = prompt.kind !== "fidelity";
  return (
    <div className="sheet-overlay">
      <div
        ref={ref}
        className="bottom-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="import-title"
        aria-describedby="import-help"
      >
        {password ? (
          <LockKeyhole aria-hidden="true" className="text-accent mb-3" />
        ) : (
          <AlertTriangle aria-hidden="true" className="mb-3" />
        )}
        <h2 id="import-title" className="text-xl font-bold">
          {password
            ? prompt.kind === "permission"
              ? "Editing permission required"
              : "Open protected PDF"
            : "Review document changes"}
        </h2>
        <p className="mt-2 break-words font-semibold">{prompt.filename}</p>
        <p id="import-help" className="text-muted mt-2">
          {prompt.message}
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const secret = value;
            setValue("");
            prompt.accept(secret);
          }}
        >
          {password && (
            <label className="field-label mt-4">
              {prompt.kind === "permission"
                ? "Owner password"
                : "Document password"}
              <input
                className="field"
                type="password"
                autoComplete="off"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                required
                aria-describedby="password-privacy"
              />
            </label>
          )}
          {password && (
            <p id="password-privacy" className="text-sm text-muted mt-2">
              Used only for this import. Never saved or logged.
            </p>
          )}
          <div className="flex gap-3 mt-5">
            <button
              type="button"
              className="btn-secondary"
              onClick={prompt.cancel}
            >
              Cancel import
            </button>
            <button type="submit" className="btn" disabled={password && !value}>
              {password ? "Continue" : "Continue with page content"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
export function ImportPrompt() {
  const prompt = useImportPrompt((s) => s.prompt);
  return prompt ? <PromptDialog key={prompt.id} prompt={prompt} /> : null;
}
