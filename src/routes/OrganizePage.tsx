import { useRef, useState } from "react";
import { PDFDocument } from "pdf-lib";
import { Eye, FileCheck2, RotateCcw, RotateCw, Trash2, X } from "lucide-react";
import { Dropzone } from "../components/Dropzone";
import { PageGrid } from "../components/organize/PageGrid";
import { FilenameInput } from "../components/FilenameInput";
import { StatusMessage, type Status } from "../components/StatusMessage";
import { RecentActivity } from "../components/RecentActivity";
import { Card } from "../components/Card";
import { PdfPreview } from "../components/PdfPreview";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { useSeo } from "../hooks/useSeo";
import { useRecentActivity } from "../hooks/useRecentActivity";
import { useOrganizeStore } from "../store/useOrganizeStore";
import { useToastStore } from "../store/useToastStore";
import { loadOrganizeSource, buildOrganizedPdf } from "../lib/pdf/organize";
import { renderAllPageThumbnails } from "../lib/pdf/pageThumbnails";
import { downloadBytes } from "../lib/download";
import { formatSize } from "../lib/formatSize";

export default function OrganizePage() {
  useSeo(
    "Organize PDF Online Free — Reorder, Delete, Rotate Pages | LocalPDF",
    "Drag pages into a new order, delete the ones you don't need, and rotate pages — right in your browser, no upload."
  );

  const fileName = useOrganizeStore((s) => s.fileName);
  const bytes = useOrganizeStore((s) => s.bytes);
  const rotations = useOrganizeStore((s) => s.rotations);
  const thumbs = useOrganizeStore((s) => s.thumbs);
  const pages = useOrganizeStore((s) => s.pages);
  const outputName = useOrganizeStore((s) => s.outputName);
  const setLoaded = useOrganizeStore((s) => s.setLoaded);
  const setPages = useOrganizeStore((s) => s.setPages);
  const rotatePage = useOrganizeStore((s) => s.rotatePage);
  const rotateMany = useOrganizeStore((s) => s.rotateMany);
  const removePage = useOrganizeStore((s) => s.removePage);
  const removeMany = useOrganizeStore((s) => s.removeMany);
  const insertPageAt = useOrganizeStore((s) => s.insertPageAt);
  const setOutputName = useOrganizeStore((s) => s.setOutputName);
  const resetStore = useOrganizeStore((s) => s.reset);
  const pushToast = useToastStore((s) => s.push);

  const [crop,setCrop]=useState(5);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [loading, setLoading] = useState(false);
  const [previewBytes, setPreviewBytes] = useState<Uint8Array | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [confirmStartOver, setConfirmStartOver] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const lastSelectedIndex = useRef<number | null>(null);
  const { entries, logActivity } = useRecentActivity();

  const handleFile = async (files: File[]) => {
    const file = files[0];
    setLoading(true);
    setStatus({ kind: "idle" });
    try {
      const [{ bytes: pdfBytes, rotations: pageRotations }, pageThumbs] = await Promise.all([
        loadOrganizeSource(file),
        renderAllPageThumbnails(file),
      ]);
      setLoaded(file.name, pdfBytes, pageRotations, pageThumbs);
    } catch (e) {
      setStatus({ kind: "error", message: `Couldn't read that PDF: ${(e as Error).message}` });
    } finally {
      setLoading(false);
    }
  };

  const insertFile=async(file?:File,replace=false,resize?:"a4"|"letter")=>{if(!bytes||loading)return;setLoading(true);setStatus({kind:"working",message:"Updating pages…"});const previous={bytes,rotations,thumbs,pages,fileName,outputName};try{const built=await buildOrganizedPdf(bytes,rotations,pages);const doc=await PDFDocument.load(built);const selected=pages.map((p,i)=>selectedIds.has(p.id)?i:-1).filter(i=>i!==-1);if(resize){const out=await PDFDocument.create();const embedded=await out.embedPages(doc.getPages());for(let i=0;i<embedded.length;i++){if(selected.length&&!selected.includes(i)){const [copy]=await out.copyPages(doc,[i]);out.addPage(copy);continue;}const image=embedded[i];const [w,h]=resize==="a4"?[595.28,841.89]:[612,792];const scale=Math.min(w/image.width,h/image.height);out.addPage([w,h]).drawPage(image,{x:(w-image.width*scale)/2,y:(h-image.height*scale)/2,width:image.width*scale,height:image.height*scale});}await handleFile([new File([new Uint8Array(await out.save())],fileName||"organized.pdf",{type:"application/pdf"})]);}else{const at=selected.length?selected[0]:doc.getPageCount();if(file){const source=await PDFDocument.load(await file.arrayBuffer());const copied=await doc.copyPages(source,source.getPageIndices());if(replace){if(selected.length!==1)throw new Error("Select exactly one page to replace.");doc.removePage(at);}copied.forEach((page,i)=>doc.insertPage(at+i,page));}else doc.insertPage(at,[595.28,841.89]);await handleFile([new File([new Uint8Array(await doc.save())],fileName||"organized.pdf",{type:"application/pdf"})]);}setOutputName(outputName);clearSelection();setStatus({kind:"idle"});pushToast({message:"Pages updated",actionLabel:"Undo",onAction:()=>{setLoaded(previous.fileName||"organized.pdf",previous.bytes,previous.rotations,previous.thumbs);setPages(previous.pages);setOutputName(previous.outputName);}});}catch(e){setStatus({kind:"error",message:(e as Error).message});}finally{setLoading(false);}};

  const handleToggleSelect = (id: string, index: number, shiftKey: boolean) => {
    // Capture the anchor before updating the ref — setSelectedIds's
    // updater runs after this function returns (React defers it to the
    // reconciliation phase), so reading lastSelectedIndex.current *inside*
    // the updater would see the index we're about to write below, not the
    // previous selection's anchor. A plain local variable isn't subject to
    // that timing.
    const anchor = lastSelectedIndex.current;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (shiftKey && anchor !== null) {
        const [from, to] = [anchor, index].sort((a, b) => a - b);
        for (let i = from; i <= to; i++) next.add(pages[i].id);
      } else if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
    lastSelectedIndex.current = index;
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
    lastSelectedIndex.current = null;
  };

  const handleBulkRotate = () => rotateMany(selectedIds);

  const handleBulkDelete = () => {
    removeMany(selectedIds);
    pushToast({ message: `${selectedIds.size} page${selectedIds.size === 1 ? "" : "s"} removed` });
    clearSelection();
    setConfirmBulkDelete(false);
  };

  const handleRemovePage = (id: string) => {
    const index = pages.findIndex((p) => p.id === id);
    if (index === -1) return;
    const removed = pages[index];
    removePage(id);
    pushToast({
      message: "Page removed",
      actionLabel: "Undo",
      onAction: () => insertPageAt(index, removed),
    });
  };

  const build = () => {
    if (!bytes || pages.length === 0) return null;
    return buildOrganizedPdf(bytes, rotations, pages);
  };

  const handlePreview = async () => {
    if (previewing) return;
    setPreviewing(true);
    try {
      const built = await build();
      if (built) setPreviewBytes(built);
    } catch (e) {
      setStatus({ kind: "error", message: `Couldn't build preview: ${(e as Error).message}` });
    } finally {
      setPreviewing(false);
    }
  };

  const handleExport = async () => {
    if (status.kind === "working") return;
    if (pages.length === 0) {
      setStatus({ kind: "error", message: "At least one page needs to stay in the document." });
      return;
    }
    setStatus({ kind: "working", message: "Building PDF…" });
    try {
      const out = await build();
      if (!out) return;
      const filename = `${outputName.trim() || "organized"}.pdf`;
      downloadBytes(out, filename, "application/pdf");
      setStatus({
        kind: "done",
        message: `Done — ${filename} (${formatSize(out.length)}) ready — download started, processed entirely on this device.`,
      });
      logActivity({ tool: "organize", label: `Organized ${fileName} into ${filename}` });
    } catch (e) {
      setStatus({ kind: "error", message: `Couldn't build PDF: ${(e as Error).message}` });
    }
  };

  return (
    <section>
      <h1 className="font-display text-2xl font-bold sm:text-3xl">Organize PDF</h1>
      <p className="mt-1 text-muted">Drag pages into order, delete the ones you don't need, rotate the rest.</p>

      <Card className="mt-6">
        {!bytes && (
          <Dropzone
            accept="application/pdf"
            label={loading ? "Reading PDF…" : "Drop a PDF here or click to browse"}
            hint="One file at a time"
            onFiles={handleFile}
          />
        )}

        {bytes && (
          <>
            <div className="flex items-center justify-between">
              <h2 className="truncate font-display text-sm font-semibold text-muted">
                {fileName} — {pages.length} page{pages.length === 1 ? "" : "s"}
              </h2>
              <button
                type="button"
                onClick={() => setConfirmStartOver(true)}
                className="flex shrink-0 items-center gap-1 text-xs font-semibold text-muted hover:text-fg focus-visible:ring-2 focus-visible:ring-accent"
              >
                <RotateCcw className="h-3 w-3" aria-hidden="true" />
                Start Over
              </button>
            </div>

            {pages.length === 0 ? (
              <p className="mt-4 rounded-xl border border-dashed border-border bg-surface-2/50 p-6 text-center text-sm text-muted">
                Every page has been removed. Start over to load a PDF again.
              </p>
            ) : (
              <>
                {selectedIds.size > 0 && (
                  <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-accent/40 bg-accent/10 px-3 py-2">
                    <span className="font-display text-sm font-semibold text-fg">
                      {selectedIds.size} page{selectedIds.size === 1 ? "" : "s"} selected
                    </span>
                    <span className="flex-1" />
                    <button
                      type="button"
                      onClick={handleBulkRotate}
                      className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 font-display text-xs font-semibold text-fg focus-visible:ring-2 focus-visible:ring-accent"
                    >
                      <RotateCw className="h-3.5 w-3.5" aria-hidden="true" />
                      Rotate
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmBulkDelete(true)}
                      className="flex items-center gap-1.5 rounded-lg border border-bad/40 bg-surface px-3 py-1.5 font-display text-xs font-semibold text-bad focus-visible:ring-2 focus-visible:ring-accent"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      Delete
                    </button>
                    <button
                      type="button"
                      aria-label="Clear selection"
                      onClick={clearSelection}
                      className="rounded-lg p-1.5 text-muted hover:text-fg focus-visible:ring-2 focus-visible:ring-accent"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}

                <div className="mt-3">
                  <PageGrid
                    pages={pages}
                    thumbs={thumbs}
                    onReorder={setPages}
                    onRotate={rotatePage}
                    onRemove={handleRemovePage}
                    selected={selectedIds}
                    onToggleSelect={handleToggleSelect}
                  />
                </div>

                <div className="panel mt-4"><h3 className="font-bold">Page actions</h3><p className="text-sm text-muted">Select pages for duplicate and crop. Insert before the first selected page, or append when none is selected. Crop hides edges; it does not remove hidden content.</p><div className="editor-options"><button className="btn-secondary" disabled={loading||!selectedIds.size} onClick={()=>{const next=pages.flatMap(p=>selectedIds.has(p.id)?[p,{...p,id:crypto.randomUUID()}]:[p]);setPages(next);pushToast({message:"Pages duplicated",actionLabel:"Undo",onAction:()=>setPages(pages)});}}>Duplicate selected</button><button className="btn-secondary" disabled={loading} onClick={()=>void insertFile()}>Insert blank page</button><label className="btn-secondary">Insert PDF<input className="sr-only" type="file" accept="application/pdf" disabled={loading} onChange={e=>{const f=e.target.files?.[0];if(f)void insertFile(f);e.target.value="";}}/></label><label className="btn-secondary">Replace selected page<input className="sr-only" type="file" accept="application/pdf" disabled={loading||selectedIds.size!==1} onChange={e=>{const f=e.target.files?.[0];if(f)void insertFile(f,true);e.target.value="";}}/></label><label className="field-label">Crop each edge (%)<input className="field" type="number" min="0" max="40" value={crop} onChange={e=>setCrop(Math.max(0,Math.min(40,Number(e.target.value))))}/></label><button className="btn-secondary" disabled={!selectedIds.size||loading} onClick={()=>{setPages(pages.map(p=>selectedIds.has(p.id)?{...p,crop}:p));pushToast({message:"Crop set for export",actionLabel:"Undo",onAction:()=>setPages(pages)});}}>Crop selected</button><button className="btn-secondary" disabled={loading} onClick={()=>void insertFile(undefined,false,"a4")}>Fit to A4</button><button className="btn-secondary" disabled={loading} onClick={()=>void insertFile(undefined,false,"letter")}>Fit to Letter</button></div><p className="text-sm text-muted">Paper fitting flattens page content and does not retain interactive forms, links or annotations. Selection applies to paper fitting; with no selection, all pages are fitted.</p></div>
                <div className="mt-5 sm:max-w-xs">
                  <FilenameInput value={outputName} onChange={setOutputName} extension="pdf" />
                </div>

                <button
                  type="button"
                  onClick={handlePreview}
                  disabled={previewing}
                  className="mt-4 flex items-center gap-1.5 font-display text-sm font-semibold text-accent disabled:opacity-50"
                >
                  <Eye className="h-4 w-4" aria-hidden="true" />
                  {previewing ? "Building preview…" : "Preview PDF"}
                </button>

                <button
                  type="button"
                  data-primary-action="true"
                  disabled={status.kind === "working" || !bytes || pages.length === 0}
                  onClick={handleExport}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-5 py-3 font-display text-base font-bold text-bg transition-transform active:scale-[0.99] sm:w-auto"
                >
                  <FileCheck2 className="h-5 w-5" aria-hidden="true" />
                  Export PDF
                </button>

                <StatusMessage status={status} />
              </>
            )}
          </>
        )}
      </Card>

      <RecentActivity entries={entries.filter((e) => e.tool === "organize")} />

      {previewBytes && <PdfPreview bytes={previewBytes} onClose={() => setPreviewBytes(null)} />}

      <ConfirmDialog
        open={confirmStartOver}
        title="Start over?"
        description={`This discards every change you've made to ${fileName ?? "this PDF"} — reordering, deleted pages, and rotations. The original file on your computer is untouched.`}
        confirmLabel="Start Over"
        onConfirm={() => {
          resetStore();
          setStatus({ kind: "idle" });
          setConfirmStartOver(false);
          clearSelection();
        }}
        onCancel={() => setConfirmStartOver(false)}
      />

      <ConfirmDialog
        open={confirmBulkDelete}
        title={`Delete ${selectedIds.size} page${selectedIds.size === 1 ? "" : "s"}?`}
        description="These pages are removed from the document you're building. The original file on your computer is untouched."
        confirmLabel="Delete"
        onConfirm={handleBulkDelete}
        onCancel={() => setConfirmBulkDelete(false)}
      />
    </section>
  );
}
