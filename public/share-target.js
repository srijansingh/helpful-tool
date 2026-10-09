// Shared files are staged locally, then removed when the recipient screen opens.
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "POST" || url.pathname !== "/share") return;
  event.respondWith(
    (async () => {
      try {
        const form = await event.request.formData();
        const files = form.getAll("files").filter((f) => f instanceof File);
        if (
          !files.length ||
          files.length > 100 ||
          files.reduce((n, f) => n + f.size, 0) > 50 * 1024 * 1024
        )
          return new Response("Share up to 100 files or 50 MB at a time.", {
            status: 400,
          });
        const db = await new Promise((resolve, reject) => {
          const req = indexedDB.open("localpdf-share", 1);
          req.onupgradeneeded = () => req.result.createObjectStore("incoming");
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => reject(req.error);
        });
        const id = crypto.randomUUID();
        await new Promise((resolve, reject) => {
          const tx = db.transaction("incoming", "readwrite");
          tx.objectStore("incoming").put({ files, createdAt: Date.now() }, id);
          tx.oncomplete = resolve;
          tx.onerror = () => reject(tx.error);
        });
        db.close();
        return Response.redirect(
          new URL("/share?id=" + id, url.origin).href,
          303,
        );
      } catch {
        return new Response(
          "Could not receive these files. Open LocalPDF and import them instead.",
          { status: 500 },
        );
      }
    })(),
  );
});
