import { mergePdfs } from "./merge.js";
import { loadPdfInfo, extractPages, splitEveryPage } from "./split.js";
import { imagesToPdf } from "./imagesToPdf.js";
import { renderPdfToImages } from "./pdfToImages.js";
import { downloadBytes, downloadBlob } from "./download.js";
import { toZipBlob } from "./zip.js";

// ---------- Tabs ----------
const tabButtons = document.querySelectorAll(".tab-btn");
const panels = document.querySelectorAll(".tool-panel");

tabButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    tabButtons.forEach((b) => b.classList.remove("active"));
    panels.forEach((p) => p.hidden = true);
    btn.classList.add("active");
    document.getElementById(btn.dataset.target).hidden = false;
  });
});

// ---------- Shared: reorderable file list ----------
function renderFileList(container, files, onChange) {
  container.innerHTML = "";
  if (files.length === 0) {
    container.innerHTML = '<p class="empty-hint">No files added yet.</p>';
    return;
  }
  const ol = document.createElement("ol");
  ol.className = "file-list";
  files.forEach((file, i) => {
    const li = document.createElement("li");
    li.innerHTML = `
      <span class="file-name">${file.name}</span>
      <span class="file-actions">
        <button type="button" data-action="up" ${i === 0 ? "disabled" : ""}>↑</button>
        <button type="button" data-action="down" ${i === files.length - 1 ? "disabled" : ""}>↓</button>
        <button type="button" data-action="remove">Remove</button>
      </span>
    `;
    li.querySelector('[data-action="up"]').addEventListener("click", () => {
      [files[i - 1], files[i]] = [files[i], files[i - 1]];
      onChange();
    });
    li.querySelector('[data-action="down"]').addEventListener("click", () => {
      [files[i + 1], files[i]] = [files[i], files[i + 1]];
      onChange();
    });
    li.querySelector('[data-action="remove"]').addEventListener("click", () => {
      files.splice(i, 1);
      onChange();
    });
    ol.appendChild(li);
  });
  container.appendChild(ol);
}

function setStatus(el, message, isError = false) {
  el.textContent = message;
  el.className = isError ? "status error" : "status";
}

// ---------- Merge ----------
(() => {
  const input = document.getElementById("merge-input");
  const listEl = document.getElementById("merge-list");
  const btn = document.getElementById("merge-btn");
  const status = document.getElementById("merge-status");
  let files = [];

  const refresh = () => renderFileList(listEl, files, refresh);

  input.addEventListener("change", () => {
    files.push(...input.files);
    input.value = "";
    refresh();
  });

  btn.addEventListener("click", async () => {
    if (files.length < 2) {
      setStatus(status, "Add at least two PDFs to merge.", true);
      return;
    }
    setStatus(status, "Merging…");
    try {
      const bytes = await mergePdfs(files);
      downloadBytes(bytes, "merged.pdf", "application/pdf");
      setStatus(status, "Done — merged.pdf downloaded.");
    } catch (e) {
      setStatus(status, `Couldn't merge: ${e.message}`, true);
    }
  });

  refresh();
})();

// ---------- Split ----------
(() => {
  const input = document.getElementById("split-input");
  const info = document.getElementById("split-info");
  const rangeInput = document.getElementById("split-range");
  const extractBtn = document.getElementById("split-extract-btn");
  const everyPageBtn = document.getElementById("split-every-btn");
  const status = document.getElementById("split-status");
  let current = null; // { bytes, pageCount, name }

  input.addEventListener("change", async () => {
    const file = input.files[0];
    if (!file) return;
    setStatus(status, "Reading PDF…");
    try {
      const { bytes, pageCount } = await loadPdfInfo(file);
      current = { bytes, pageCount, name: file.name.replace(/\.pdf$/i, "") };
      info.textContent = `${file.name} — ${pageCount} page${pageCount === 1 ? "" : "s"}`;
      rangeInput.disabled = false;
      extractBtn.disabled = false;
      everyPageBtn.disabled = false;
      setStatus(status, "");
    } catch (e) {
      setStatus(status, `Couldn't read that PDF: ${e.message}`, true);
    }
  });

  extractBtn.addEventListener("click", async () => {
    if (!current) return;
    setStatus(status, "Extracting…");
    try {
      const out = await extractPages(current.bytes, rangeInput.value, current.pageCount);
      downloadBytes(out, `${current.name}-pages.pdf`, "application/pdf");
      setStatus(status, "Done — extracted pages downloaded.");
    } catch (e) {
      setStatus(status, e.message, true);
    }
  });

  everyPageBtn.addEventListener("click", async () => {
    if (!current) return;
    setStatus(status, "Splitting every page…");
    try {
      const pages = await splitEveryPage(current.bytes, current.pageCount);
      downloadBlob(toZipBlob(pages), `${current.name}-pages.zip`);
      setStatus(status, `Done — ${pages.length} pages zipped and downloaded.`);
    } catch (e) {
      setStatus(status, e.message, true);
    }
  });
})();

// ---------- Images to PDF ----------
(() => {
  const input = document.getElementById("img2pdf-input");
  const listEl = document.getElementById("img2pdf-list");
  const btn = document.getElementById("img2pdf-btn");
  const status = document.getElementById("img2pdf-status");
  let files = [];

  const refresh = () => renderFileList(listEl, files, refresh);

  input.addEventListener("change", () => {
    files.push(...input.files);
    input.value = "";
    refresh();
  });

  btn.addEventListener("click", async () => {
    if (files.length === 0) {
      setStatus(status, "Add at least one image.", true);
      return;
    }
    setStatus(status, "Converting…");
    try {
      const bytes = await imagesToPdf(files);
      downloadBytes(bytes, "images.pdf", "application/pdf");
      setStatus(status, "Done — images.pdf downloaded.");
    } catch (e) {
      setStatus(status, `Couldn't convert: ${e.message}`, true);
    }
  });

  refresh();
})();

// ---------- PDF to Images ----------
(() => {
  const input = document.getElementById("pdf2img-input");
  const formatSelect = document.getElementById("pdf2img-format");
  const btn = document.getElementById("pdf2img-btn");
  const status = document.getElementById("pdf2img-status");

  btn.addEventListener("click", async () => {
    const file = input.files[0];
    if (!file) {
      setStatus(status, "Choose a PDF first.", true);
      return;
    }
    setStatus(status, "Rendering pages…");
    try {
      const format = formatSelect.value;
      const images = await renderPdfToImages(file, { format });
      const base = file.name.replace(/\.pdf$/i, "");
      if (images.length === 1) {
        downloadBlob(new Blob([images[0].bytes], { type: format }), images[0].name);
      } else {
        downloadBlob(toZipBlob(images), `${base}-images.zip`);
      }
      setStatus(status, `Done — ${images.length} page${images.length === 1 ? "" : "s"} exported.`);
    } catch (e) {
      setStatus(status, `Couldn't render that PDF: ${e.message}`, true);
    }
  });
})();
