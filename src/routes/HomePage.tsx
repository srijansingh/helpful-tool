import { Link, useNavigate } from "react-router-dom";
import { ScanLine, FolderOpen, ArrowRight, ShieldCheck } from "lucide-react";
import { TOOLS } from "../lib/tools";
import { useDocumentStore } from "../store/useDocumentStore";
import { Dropzone } from "../components/Dropzone";
import { RecentActivity } from "../components/RecentActivity";
import { useRecentActivity } from "../hooks/useRecentActivity";
import { useSeo } from "../hooks/useSeo";

export default function HomePage() {
  useSeo(
    "LocalPDF — your everyday document app",
    "Scan, edit, organize and share documents privately on your device.",
  );
  const current = useDocumentStore((s) => s.current);
  const navigate = useNavigate();
  const { entries } = useRecentActivity();

  return (
    <section>
      <p className="eyebrow">YOUR EVERYDAY DOCUMENTS</p>
      <h1 className="text-3xl font-bold">What would you like to do?</h1>
      <p className="mt-2 text-muted">Scan, edit and share. All on your device.</p>

      <div className="quick-actions">
        <Link to="/scan" className="primary-tile">
          <ScanLine size={28} />
          <strong>Scan a document</strong>
          <span>Camera or photos</span>
        </Link>
        <Link to="/files" className="secondary-tile">
          <FolderOpen size={28} />
          <strong>My files</strong>
          <span>Saved on this device</span>
        </Link>
      </div>

      {current && (
        <Link to="/document" className="session-card">
          <span className="min-w-0">
            <small>CONTINUE YOUR DOCUMENT</small>
            <strong className="block truncate">{current.name}</strong>
          </span>
          <ArrowRight />
        </Link>
      )}

      <h2 className="mt-6 text-lg font-bold">Quick tools</h2>
      <div className="tool-grid compact">
        {TOOLS.filter((t) =>
          ["/merge", "/split", "/images-to-pdf", "/watermark"].includes(t.to),
        ).map(({ to, label, icon: Icon }) => (
          <Link className="tool-tile" to={to} key={to}>
            <Icon className="text-accent" />
            <strong>{label}</strong>
          </Link>
        ))}
      </div>

      <div className="mt-6">
        <Dropzone
          accept="application/pdf,image/*"
          label="Open a file"
          hint="Choose a PDF or photo to start"
          multiple={false}
          onFiles={(files) => {
            useDocumentStore.getState().setCurrent(files[0]);
            navigate("/document");
          }}
        />
      </div>

      <p className="mt-5 flex items-center gap-2 text-sm text-muted">
        <ShieldCheck size={18} />
        Your files stay on your device.
      </p>

      <RecentActivity entries={entries} className="mt-6" />
    </section>
  );
}
