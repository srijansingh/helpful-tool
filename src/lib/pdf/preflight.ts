import { pdfRenderingOptions } from "./renderOptions";
import {
  getDocument,
  GlobalWorkerOptions,
  PermissionFlag,
  PasswordResponses,
} from "pdfjs-dist";
import workerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { PDFDocument, PDFName } from "pdf-lib";
import { qpdfJob } from "./qpdfJob";
import { requestImportPrompt } from "../../store/useImportPrompt";
GlobalWorkerOptions.workerSrc = workerSrc;
const preparedPaths = new WeakMap<File, Set<string>>();
const originals = new WeakMap<File, File>();
const copyAllowed = new WeakMap<File, boolean>();
export function canCopyText(file: File) {
  return copyAllowed.get(file) !== false;
}
export function originalFile(file: File) {
  return originals.get(file) || file;
}
const taskPermissions: Record<string, number[]> = {
  "/merge": [PermissionFlag.ASSEMBLE, PermissionFlag.COPY],
  "/split": [PermissionFlag.ASSEMBLE, PermissionFlag.COPY],
  "/organize": [PermissionFlag.ASSEMBLE, PermissionFlag.COPY],
  "/booklet": [PermissionFlag.ASSEMBLE, PermissionFlag.COPY],
  "/watermark": [PermissionFlag.MODIFY_CONTENTS],
  "/page-numbers": [PermissionFlag.MODIFY_CONTENTS],
  "/ocr": [PermissionFlag.COPY],
  "/pdf-to-images": [PermissionFlag.COPY],
  "/compress": [PermissionFlag.COPY],
  "/edit": [
    PermissionFlag.MODIFY_CONTENTS,
    PermissionFlag.FILL_INTERACTIVE_FORMS,
    PermissionFlag.MODIFY_ANNOTATIONS,
  ],
  "/redact": [PermissionFlag.MODIFY_CONTENTS, PermissionFlag.COPY],
  "/security": [PermissionFlag.MODIFY_CONTENTS],
};
const copyTools = new Set(["/merge", "/split", "/organize"]);
export async function preparePdf(
  file: File,
  path: string,
  signal: AbortSignal,
  knownPassword = "",
): Promise<File> {
  if (preparedPaths.get(file)?.has(path)) return file;
  file = originalFile(file);
  signal.throwIfAborted();
  const required = taskPermissions[path] ?? [];
  const modifying = required.length > 0;
  if (file.size > 50 * 1024 * 1024)
    throw new Error(
      `${file.name}: use a PDF smaller than 50 MB for reliable on-device processing.`,
    );
  const task = getDocument({
    ...pdfRenderingOptions,
    data: new Uint8Array(await file.arrayBuffer()),
    stopAtErrors: true,
    password: knownPassword,
  });
  let password = knownPassword;
  let encrypted = false;
  let cancelled = false;
  const abort = () => {
    cancelled = true;
    void task.destroy();
  };
  signal.addEventListener("abort", abort, { once: true });
  task.onPassword = (update: (password: string) => void, reason: number) => {
    encrypted = true;
    void requestImportPrompt(
      file.name,
      "password",
      reason === PasswordResponses.INCORRECT_PASSWORD
        ? "That password did not open the PDF. Try again; you do not need to upload it again."
        : "Enter the password to open this PDF and continue your task.",
      signal,
    )
      .then((value) => {
        password = value;
        update(value);
      })
      .catch(abort);
  };
  try {
    const pdf = await task.promise;
    signal.throwIfAborted();
    if (!pdf.numPages)
      throw new Error(
        "This PDF has no pages. Choose a document with at least one page.",
      );
    if (pdf.numPages > 2000)
      throw new Error(
        "This PDF has over 2,000 pages. Use a smaller document for reliable on-device processing.",
      );
    const permissions = await pdf.getPermissions();
    let ready = file;
    // Owner authentication is checked by QPDF, not inferred from decryption or PDF.js permission flags.
    if (
      modifying &&
      permissions &&
      required.some((flag) => !permissions.includes(flag))
    ) {
      let authorized = (
        await qpdfJob(file, "inspect", password, signal, () => {})
      ).ownerPassword;
      let attempt = 0;
      while (!authorized) {
        password = await requestImportPrompt(
          file.name,
          "permission",
          `${attempt++ ? "That password did not authorize changes. Try again. " : ""}This document restricts changes. Enter its owner password to authorize this task, or cancel and keep the original.`,
          signal,
        );
        try {
          authorized = (
            await qpdfJob(file, "inspect", password, signal, () => {})
          ).ownerPassword;
        } catch {
          signal.throwIfAborted();
        }
      }
      encrypted = true;
    }
    // Detect encryption without an open-password prompt (including owner-only protection).
    try {
      await PDFDocument.load(await file.arrayBuffer());
    } catch (e) {
      if (/encrypted/i.test((e as Error).message)) encrypted = true;
      else throw e;
    }
    if (encrypted) {
      const unlocked = await qpdfJob(
        file,
        "unlock",
        password,
        signal,
        () => {},
      );
      if (unlocked.warning)
        throw new Error(
          "This PDF needs recovery. Open and resave it in your PDF reader before making changes.",
        );
      ready = new File([new Uint8Array(unlocked.bytes)], file.name, {
        type: "application/pdf",
        lastModified: file.lastModified,
      });
      originals.set(ready, originalFile(file));
    }
    if (copyTools.has(path)) {
      const doc = await PDFDocument.load(await ready.arrayBuffer());
      const fields = doc.getForm().getFields();
      const special =
        fields.length ||
        doc.catalog.has(PDFName.of("Names")) ||
        doc.catalog.has(PDFName.of("Outlines"));
      if (special) {
        await requestImportPrompt(
          file.name,
          "fidelity",
          "This page-copy task keeps visible page content. Interactive forms will become fixed text; document attachments, bookmarks and document metadata are not copied. Keep your original if you need them. Cancel to choose another task.",
          signal,
        );
        if (fields.length) doc.getForm().flatten();
        ready = new File([new Uint8Array(await doc.save())], file.name, {
          type: "application/pdf",
          lastModified: file.lastModified,
        });
        originals.set(ready, originalFile(file));
      }
    }
    signal.throwIfAborted();
    preparedPaths.set(ready, new Set([path]));
    copyAllowed.set(
      ready,
      !permissions || permissions.includes(PermissionFlag.COPY),
    );
    return ready;
  } catch (e) {
    signal.throwIfAborted();
    if (cancelled)
      throw new DOMException(
        "Import cancelled. Your existing work is unchanged.",
        "AbortError",
      );
    if ((e as Error).name === "PasswordException")
      throw new Error(
        "This PDF uses unsupported password protection. Open and resave an authorized copy in your PDF reader.",
      );
    throw e;
  } finally {
    password = "";
    signal.removeEventListener("abort", abort);
    await task.destroy();
  }
}
