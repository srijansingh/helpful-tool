import { useEffect, useState } from "react";
import { createStore, get, del, entries } from "idb-keyval";
import { useNavigate } from "react-router-dom";
import { validateFiles } from "../lib/importFiles";
import { useDocumentStore } from "../store/useDocumentStore";
import { useMergeStore } from "../store/useMergeStore";
const store = createStore("localpdf-share", "incoming");
const jobs = new Map<string, Promise<File[]>>();
function receive(id: string) {
  let job = jobs.get(id);
  if (!job) {
    job = (async () => {
      for (const [key, value] of await entries<string, { createdAt: number }>(
        store,
      ))
        if (value.createdAt < Date.now() - 3600000) await del(key, store);
      const incoming = await get<{ files: File[]; createdAt: number }>(
        id,
        store,
      );
      if (!incoming)
        throw new Error(
          "This share has already been opened. Share it again or use Import.",
        );
      try {
        return await validateFiles(incoming.files, "application/pdf,image/*");
      } finally {
        await del(id, store);
      }
    })();
    jobs.set(id, job);
  }
  return job;
}
export default function SharePage() {
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  useEffect(() => {
    let active = true;
    const id = new URLSearchParams(location.search).get("id");
    (async () => {
      try {
        if (!id)
          throw new Error(
            "Choose LocalPDF from your phone's Share menu, or import a file from Home.",
          );
        const valid = await receive(id);
        if (active) setFiles(valid);
      } catch (e) {
        if (active) setError((e as Error).message);
      }
    })();
    return () => {
      active = false;
    };
  }, []);
  return (
    <section>
      <h1 className="text-2xl font-bold">Shared with LocalPDF</h1>
      <p className="mt-2 text-muted">
        Choose a file to open. Save it in My files if you want to keep it on
        this device.
      </p>
      {error && (
        <p role="alert" className="mt-3">
          {error}
        </p>
      )}
      <div className="space-y-3 mt-4">
        {files.map((file, i) => (
          <button
            key={i}
            className="panel w-full text-left"
            onClick={() => {
              useDocumentStore.getState().setCurrent(file);
              navigate("/document");
            }}
          >
            {file.name}
          </button>
        ))}
      </div>
      {files.length > 1 && (
        <button
          className="btn mt-4"
          onClick={() => {
            useMergeStore.getState().setFiles(files);
            navigate("/merge");
          }}
        >
          Combine shared files
        </button>
      )}
    </section>
  );
}
