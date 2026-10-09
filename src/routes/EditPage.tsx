import { runPdfJob } from "../lib/pdfJobs";
import { moveMark, resizeMark } from "../lib/markGeometry";
import { prepareImage } from "../lib/imageBudget";
import { ToolSettings } from "../components/ToolSettings";
import {
  MousePointer2,
  Type,
  PenLine,
  Highlighter,
  Square,
  ImageIcon,
} from "lucide-react";
import { editPdf } from "../lib/pdf/workerOperations";
import { useEffect, useRef, useState, type PointerEvent } from "react";
import { useDocumentStore } from "../store/useDocumentStore";
import { Dropzone } from "../components/Dropzone";
import { PdfReader } from "../components/PdfReader";
import {
  readForms,
  type Mark,
  type MarkKind,
  type FormValue,
} from "../lib/pdf/edit";
import { downloadBytes } from "../lib/download";
import { friendlyError } from "../lib/importFiles";
const drafts = new WeakMap<
  File,
  { history: Mark[][]; cursor: number; fields: FormValue[] }
>();
export default function EditPage() {
  const file = useDocumentStore((s) => s.current);
  const [bytes, setBytes] = useState<Uint8Array | null>(null);
  const [formPreview, setFormPreview] = useState<Uint8Array | null>(null);
  const [formUpdating, setFormUpdating] = useState(false);
  const [page, setPage] = useState(1);
  const [size, setSize] = useState({ width: 595, height: 842 });
  const [history, setHistory] = useState<Mark[][]>([[]]);
  const [cursor, setCursor] = useState(0);
  const [fields, setFields] = useState<FormValue[]>([]);
  const [flatten, setFlatten] = useState(false);
  const [mode, setMode] = useState<MarkKind | "select">("select");
  const [text, setText] = useState("");
  const [fontSize, setFontSize] = useState(20);
  const [color, setColor] = useState("#202b47");
  const [selected, setSelected] = useState<string | null>(null);
  const [image, setImage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const loadedFile = useRef<File | null>(null);
  const svg = useRef<SVGSVGElement>(null);
  const gesture = useRef<{
    start: [number, number];
    mark: Mark;
    original: Mark[];
    move: boolean;
  } | null>(null);
  const marks = history[cursor] || [];
  useEffect(() => {
    loadedFile.current = null;
    setBytes(null);
    setPage(1);
    setError("");
    if (!file || file.type !== "application/pdf") return;
    let active = true;
    (async () => {
      try {
        const data = new Uint8Array(await file.arrayBuffer());
        const d = drafts.get(file);
        const f = d?.fields || (await readForms(data));
        if (active) {
          loadedFile.current = file;
          setBytes(data);
          setFields(f);
          setHistory(d?.history || [[]]);
          setCursor(d?.cursor || 0);
        }
      } catch (e) {
        if (active) setError(friendlyError(e));
      }
    })();
    return () => {
      active = false;
    };
  }, [file]);
  useEffect(() => {
    if (file && bytes && loadedFile.current === file)
      drafts.set(file, { history, cursor, fields });
  }, [file, bytes, history, cursor, fields]);
  useEffect(() => {
    setFormPreview(null);
    if (!bytes || !fields.some((f) => f.kind !== "unsupported")) return;
    const controller = new AbortController();
    setFormUpdating(true);
    const timer = setTimeout(() => {
      void runPdfJob<Uint8Array>(
        "edit",
        [bytes, [], fields, false],
        controller.signal,
        false,
      )
        .then((value) => {
          if (!controller.signal.aborted) setFormPreview(value);
        })
        .catch((e) => {
          if (!controller.signal.aborted) setError(friendlyError(e));
        })
        .finally(() => {
          if (!controller.signal.aborted) setFormUpdating(false);
        });
    }, 400);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [bytes, fields]);
  const commit = (next: Mark[]) => {
    setHistory((h) => [...h.slice(0, cursor + 1), next]);
    setCursor(cursor + 1);
  };
  const point = (e: PointerEvent<SVGSVGElement>): [number, number] => {
    const r = e.currentTarget.getBoundingClientRect();
    return [
      Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)),
      Math.max(0, Math.min(1, (e.clientY - r.top) / r.height)),
    ];
  };
  const down = (e: PointerEvent<SVGSVGElement>) => {
    if (busy) return;
    const p = point(e);
    e.currentTarget.setPointerCapture(e.pointerId);
    const id = (e.target as Element)
      .closest("[data-mark]")
      ?.getAttribute("data-mark");
    const old = marks.find((m) => m.id === id);
    if (mode === "select") {
      setSelected(old?.id || null);
      if (old)
        gesture.current = { start: p, mark: old, original: marks, move: true };
      return;
    }
    if (mode === "text" && !text.trim()) {
      setError("Enter your text or typed signature first.");
      return;
    }
    if (mode === "image" && !image) {
      setError("Import an image or signature first.");
      return;
    }
    const m: Mark = {
      id: crypto.randomUUID(),
      page,
      kind: mode,
      x: p[0],
      y: p[1],
      w: mode === "image" ? 0.25 : 0,
      h: mode === "image" ? 0.12 : 0,
      text,
      size: fontSize,
      color,
      data: image,
      points: [p],
    };
    gesture.current = { start: p, mark: m, original: marks, move: false };
    setSelected(m.id);
    setError("");
  };
  const move = (e: PointerEvent<SVGSVGElement>) => {
    const g = gesture.current;
    if (!g) return;
    const p = point(e);
    let m = { ...g.mark };
    if (g.move) m = moveMark(m, p[0] - g.start[0], p[1] - g.start[1]);
    else if (m.kind === "pen") {
      m.points = [...(g.mark.points || []), p];
      g.mark = m;
    } else if (m.kind !== "text" && m.kind !== "image") {
      m.x = Math.min(g.start[0], p[0]);
      m.y = Math.min(g.start[1], p[1]);
      m.w = Math.abs(p[0] - g.start[0]);
      m.h = Math.abs(p[1] - g.start[1]);
    }
    setHistory((h) =>
      h.map((v, i) =>
        i === cursor
          ? g.move
            ? g.original.map((a) => (a.id === m.id ? m : a))
            : [...g.original, m]
          : v,
      ),
    );
  };
  const up = (e: PointerEvent<SVGSVGElement>) => {
    const g = gesture.current;
    if (!g) return;
    const p = point(e);
    let next = marks;
    if (!next.some((m) => m.id === g.mark.id)) next = [...g.original, g.mark];
    const added = next.find((m) => m.id === g.mark.id);
    if (!g.move && added) {
      if (
        (added.kind === "pen" && (added.points?.length || 0) < 2) ||
        ((added.kind === "highlight" || added.kind === "rectangle") &&
          (!added.w || !added.h))
      ) {
        setHistory((h) => h.map((v, i) => (i === cursor ? g.original : v)));
        gesture.current = null;
        setError("Drag on the page to draw this mark.");
        return;
      }
      if (added.kind === "pen") {
        const pts = added.points!;
        const xs = pts.map((p) => p[0]),
          ys = pts.map((p) => p[1]);
        next = next.map((m) =>
          m.id === added.id
            ? {
                ...m,
                x: Math.min(...xs),
                y: Math.min(...ys),
                w: Math.max(...xs) - Math.min(...xs),
                h: Math.max(...ys) - Math.min(...ys),
              }
            : m,
        );
      }
    }
    if (g.move && p[0] === g.start[0] && p[1] === g.start[1]) {
      gesture.current = null;
      return;
    }
    setHistory((h) => [...h.slice(0, cursor).concat([g.original]), next]);
    setCursor(cursor + 1);
    gesture.current = null;
  };
  const save = async () => {
    if (!bytes || busy) return;
    setBusy(true);
    setError("");
    try {
      downloadBytes(
        await editPdf(bytes, marks, fields, flatten),
        (file?.name.replace(/\.pdf$/i, "") || "document") + "-edited.pdf",
        "application/pdf",
      );
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  };
  const active = marks.find((m) => m.id === selected);
  return (
    <section className="editor">
      <h1 className="text-2xl font-bold">Edit, sign & fill</h1>
      <p className="text-muted mt-2">
        Add text, drawings and visual signatures. Original text stays in place.
        Drafts stay in this session until exported.
      </p>
      <details className="panel mt-4" open={!bytes}>
        <summary>{bytes ? `Change PDF · ${file?.name}` : "Open a PDF"}</summary>
        <Dropzone
          disabled={busy}
          accept="application/pdf"
          label="Open a PDF to edit"
          hint={file?.name || "Choose a PDF"}
          onFiles={(files) => useDocumentStore.getState().setCurrent(files[0])}
        />
      </details>
      {bytes && (
        <>
          <div
            className="editor-toolbar"
            role="toolbar"
            aria-label="Annotation tools"
          >
            {(
              [
                "select",
                "text",
                "pen",
                "highlight",
                "rectangle",
                "image",
              ] as const
            ).map((t) => (
              <button
                key={t}
                title={
                  t === "image"
                    ? "Image / signature"
                    : t === "pen"
                      ? "Draw signature"
                      : t
                }
                aria-label={
                  t === "image"
                    ? "Image / signature"
                    : t === "pen"
                      ? "Draw signature"
                      : t
                }
                className={mode === t ? "btn" : "btn-secondary"}
                aria-pressed={mode === t}
                onClick={() => setMode(t)}
              >
                {(() => {
                  const Icon = {
                    select: MousePointer2,
                    text: Type,
                    pen: PenLine,
                    highlight: Highlighter,
                    rectangle: Square,
                    image: ImageIcon,
                  }[t];
                  return <Icon size={20} aria-hidden="true" />;
                })()}
              </button>
            ))}
            <button
              className="btn-secondary"
              disabled={cursor === 0}
              onClick={() => {
                setCursor(cursor - 1);
                setSelected(null);
              }}
            >
              Undo
            </button>
            <button
              className="btn-secondary"
              disabled={cursor === history.length - 1}
              onClick={() => {
                setCursor(cursor + 1);
                setSelected(null);
              }}
            >
              Redo
            </button>
          </div>

          <p className="text-sm text-muted mt-2">
            Tap or draw on the page. Use Select to move a mark. Signatures are
            visual marks, not certificate signatures.
          </p>
          <div className="editor-workspace">
            <div className="editor-document mt-3">
              {formUpdating && (
                <p role="status" className="text-sm text-muted">
                  Updating filled-form preview…
                </p>
              )}
              <PdfReader
                bytes={formPreview ?? bytes}
                page={page}
                onPage={setPage}
                onSize={setSize}
                overlay={
                  <svg
                    ref={svg}
                    className="pdf-overlay"
                    viewBox="0 0 1000 1000"
                    preserveAspectRatio="none"
                    aria-label="Annotation canvas"
                    onPointerDown={down}
                    onPointerMove={move}
                    onPointerUp={up}
                    onPointerCancel={() => {
                      const g = gesture.current;
                      if (g)
                        setHistory((h) =>
                          h.map((v, i) => (i === cursor ? g.original : v)),
                        );
                      gesture.current = null;
                    }}
                  >
                    {marks
                      .filter((m) => m.page === page)
                      .map((m) => (
                        <g
                          key={m.id}
                          data-mark={m.id}
                          style={{
                            cursor: mode === "select" ? "move" : "crosshair",
                          }}
                        >
                          {m.kind === "text" ? (
                            <text
                              x={m.x * 1000}
                              y={m.y * 1000}
                              fill={m.color}
                              fontSize={(m.size * 1000) / size.height}
                              transform={`translate(${m.x * 1000},${m.y * 1000}) scale(${size.height / size.width},1) translate(${-m.x * 1000},${-m.y * 1000})`}
                            >
                              {m.text}
                            </text>
                          ) : m.kind === "image" ? (
                            <image
                              href={m.data}
                              x={m.x * 1000}
                              y={m.y * 1000}
                              width={m.w * 1000}
                              height={m.h * 1000}
                              preserveAspectRatio="none"
                            />
                          ) : m.kind === "pen" ? (
                            <polyline
                              points={m.points
                                ?.map((p) => `${p[0] * 1000},${p[1] * 1000}`)
                                .join(" ")}
                              fill="none"
                              stroke={m.color}
                              strokeWidth="3"
                              vectorEffect="non-scaling-stroke"
                            />
                          ) : (
                            <rect
                              x={m.x * 1000}
                              y={m.y * 1000}
                              width={m.w * 1000}
                              height={m.h * 1000}
                              fill={
                                m.kind === "highlight" ? m.color : "transparent"
                              }
                              fillOpacity={0.3}
                              stroke={m.kind === "rectangle" ? m.color : "none"}
                              strokeWidth="2"
                              vectorEffect="non-scaling-stroke"
                            />
                          )}
                          {selected === m.id && (
                            <rect
                              x={m.x * 1000 - 4}
                              y={
                                m.y * 1000 -
                                (m.kind === "text"
                                  ? (m.size * 1000) / size.height
                                  : 4)
                              }
                              width={Math.max(m.w * 1000, 80)}
                              height={Math.max(
                                m.h * 1000,
                                (m.size * 1000) / size.height,
                              )}
                              fill="none"
                              stroke="#2563eb"
                              strokeDasharray="5 4"
                              pointerEvents="none"
                            />
                          )}
                        </g>
                      ))}
                  </svg>
                }
              />
            </div>
            <ToolSettings enabled title="Edit settings">
              <div className="editor-options">
                <label className="field-label">
                  Text or typed signature
                  <input
                    className="field"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                  />
                </label>
                <label className="field-label">
                  Text size
                  <input
                    className="field"
                    type="number"
                    min="6"
                    max="120"
                    value={fontSize}
                    onChange={(e) =>
                      setFontSize(
                        Math.max(
                          6,
                          Math.min(120, Number(e.target.value) || 20),
                        ),
                      )
                    }
                  />
                </label>
                <label>
                  Ink color
                  <input
                    aria-label="Ink color"
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                  />
                </label>
                <label className="btn-secondary">
                  Import image / signature
                  <input
                    type="file"
                    accept="image/png,image/jpeg"
                    className="sr-only"
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      try {
                        await prepareImage(f);
                        const b = await createImageBitmap(f);
                        const c = document.createElement("canvas");
                        const scale = Math.min(
                          1,
                          1200 / Math.max(b.width, b.height),
                        );
                        c.width = Math.max(1, Math.round(b.width * scale));
                        c.height = Math.max(1, Math.round(b.height * scale));
                        c.getContext("2d")!.drawImage(
                          b,
                          0,
                          0,
                          c.width,
                          c.height,
                        );
                        b.close();
                        setImage(c.toDataURL("image/png"));
                        setMode("image");
                      } catch (e) {
                        setError(friendlyError(e));
                      }
                    }}
                  />
                </label>
              </div>
              {marks.length > 0 && (
                <details className="panel mt-3">
                  <summary>Annotations ({marks.length})</summary>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {marks.map((m, i) => (
                      <button
                        key={m.id}
                        className={selected === m.id ? "btn" : "btn-secondary"}
                        aria-pressed={selected === m.id}
                        onClick={() => {
                          setPage(m.page);
                          setSelected(m.id);
                          setMode("select");
                        }}
                      >
                        {i + 1}. {m.kind} · page {m.page}
                      </button>
                    ))}
                  </div>
                </details>
              )}
              {active && (
                <div className="panel mt-3">
                  <p>Selected {active.kind}</p>
                  {active.kind === "text" ? (
                    <label>
                      Annotation text
                      <input
                        className="field"
                        value={active.text}
                        onChange={(e) =>
                          commit(
                            marks.map((m) =>
                              m.id === active.id
                                ? { ...m, text: e.target.value }
                                : m,
                            ),
                          )
                        }
                      />
                    </label>
                  ) : null}
                  <div
                    className="flex flex-wrap gap-2"
                    aria-label="Annotation size"
                  >
                    <button
                      className="btn-secondary"
                      onClick={() =>
                        commit(
                          marks.map((m) =>
                            m.id === active.id ? resizeMark(m, 0.9) : m,
                          ),
                        )
                      }
                    >
                      Smaller
                    </button>
                    <button
                      className="btn-secondary"
                      onClick={() =>
                        commit(
                          marks.map((m) =>
                            m.id === active.id ? resizeMark(m, 1.1) : m,
                          ),
                        )
                      }
                    >
                      Larger
                    </button>
                  </div>
                  <div
                    className="flex flex-wrap gap-2"
                    aria-label="Move annotation"
                  >
                    {(
                      [
                        ["Left", -0.01, 0],
                        ["Right", 0.01, 0],
                        ["Up", 0, -0.01],
                        ["Down", 0, 0.01],
                      ] as const
                    ).map(([label, dx, dy]) => (
                      <button
                        key={label}
                        className="btn-secondary"
                        onClick={() =>
                          commit(
                            marks.map((m) =>
                              m.id === active.id ? moveMark(m, dx, dy) : m,
                            ),
                          )
                        }
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <button
                    className="btn-secondary"
                    onClick={() => {
                      commit(marks.filter((m) => m.id !== active.id));
                      setSelected(null);
                    }}
                  >
                    Delete annotation
                  </button>
                </div>
              )}
              <details className="panel mt-4">
                <summary>Fill PDF form ({fields.length} fields)</summary>
                {!fields.length ? (
                  <p className="mt-3">
                    No interactive fields found. Use the Text tool to fill a
                    scanned form.
                  </p>
                ) : (
                  fields.map((f, i) => (
                    <label className="field-label mt-3" key={f.name}>
                      {f.name}
                      {f.readOnly ? " (read only)" : ""}
                      {f.kind === "unsupported" ? (
                        <span className="text-muted">
                          This field type is preserved but cannot be edited
                          here.
                        </span>
                      ) : f.kind === "list" ? (
                        <select
                          multiple
                          className="field"
                          disabled={busy || f.readOnly}
                          value={Array.isArray(f.value) ? f.value : []}
                          onChange={(e) =>
                            setFields(
                              fields.map((a, j) =>
                                j === i
                                  ? {
                                      ...a,
                                      value: Array.from(
                                        e.target.selectedOptions,
                                        (o) => o.value,
                                      ),
                                    }
                                  : a,
                              ),
                            )
                          }
                        >
                          {f.options?.map((o) => (
                            <option key={o}>{o}</option>
                          ))}
                        </select>
                      ) : f.kind === "checkbox" ? (
                        <input
                          type="checkbox"
                          disabled={busy || f.readOnly}
                          checked={Boolean(f.value)}
                          onChange={(e) =>
                            setFields(
                              fields.map((a, j) =>
                                j === i ? { ...a, value: e.target.checked } : a,
                              ),
                            )
                          }
                        />
                      ) : f.kind === "choice" ? (
                        <select
                          className="field"
                          disabled={busy || f.readOnly}
                          value={String(f.value)}
                          onChange={(e) =>
                            setFields(
                              fields.map((a, j) =>
                                j === i ? { ...a, value: e.target.value } : a,
                              ),
                            )
                          }
                        >
                          <option value="">Choose</option>
                          {f.options?.map((o) => (
                            <option key={o}>{o}</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          className="field"
                          disabled={busy || f.readOnly}
                          value={String(f.value)}
                          onChange={(e) =>
                            setFields(
                              fields.map((a, j) =>
                                j === i ? { ...a, value: e.target.value } : a,
                              ),
                            )
                          }
                        />
                      )}
                    </label>
                  ))
                )}
                <label className="flex gap-2 mt-3">
                  <input
                    type="checkbox"
                    checked={flatten}
                    onChange={(e) => setFlatten(e.target.checked)}
                  />
                  Flatten filled form fields when exporting
                </label>
              </details>
            </ToolSettings>
          </div>
          <button
            className="btn mt-4"
            data-primary-action
            disabled={busy}
            onClick={() => void save()}
          >
            {busy ? "Exporting…" : "Export edited PDF"}
          </button>
        </>
      )}
      {error && (
        <p role="alert" className="text-bad mt-3">
          {error}
        </p>
      )}
    </section>
  );
}
