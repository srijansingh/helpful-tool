import { useRef } from "react";
import { PdfReader } from "./PdfReader";
import { useDialogFocus } from "../hooks/useDialogFocus";
export function PdfPreview({bytes,onClose}:{bytes:Uint8Array;onClose:()=>void}){const ref=useRef<HTMLDivElement>(null);useDialogFocus(ref,true,onClose);return <div className="fixed inset-0 z-50 flex bg-bg/95 p-3 sm:p-6" role="dialog" aria-modal="true" aria-label="PDF preview"><div ref={ref} className="mx-auto w-full max-w-3xl overflow-y-auto rounded-2xl bg-surface p-3"><div className="flex items-center justify-between mb-3"><h2 className="font-bold">PDF preview</h2><button className="btn-secondary" onClick={onClose}>Close preview</button></div><PdfReader bytes={bytes}/></div></div>}
