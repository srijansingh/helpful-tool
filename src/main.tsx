import { StrictMode, lazy } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { initializePwa } from "./lib/pwa";
import "./index.css";
import App from "./App";

// Route-level code splitting: pdf.js's worker alone is 1MB+ and is only
// needed on /pdf-to-images, so there's no reason every visitor downloads
// it up front. The Suspense boundary for these lives inside App, around
// just the <Outlet/>, so the header/nav don't flicker away on transitions.
const SharePage = lazy(() => import("./routes/SharePage"));
const OcrPage = lazy(() => import("./routes/OcrPage"));
const ImagePage = lazy(() => import("./routes/ImagePage"));
const CompressPage = lazy(() => import("./routes/CompressPage"));
const EditPage = lazy(() => import("./routes/EditPage"));
const ToolsPage = lazy(() => import("./routes/ToolsPage"));
const SettingsPage = lazy(() => import("./routes/SettingsPage"));
const FilesPage = lazy(() => import("./routes/FilesPage"));
const DocumentPage = lazy(() => import("./routes/DocumentPage"));
const HomePage = lazy(() => import("./routes/HomePage"));
const ScanPage = lazy(() => import("./routes/ScanPage"));
const ScanLibraryPage = lazy(() => import("./routes/ScanLibraryPage"));
const MergePage = lazy(() => import("./routes/MergePage"));
const SplitPage = lazy(() => import("./routes/SplitPage"));
const OrganizePage = lazy(() => import("./routes/OrganizePage"));
const ImagesToPdfPage = lazy(() => import("./routes/ImagesToPdfPage"));
const PdfToImagesPage = lazy(() => import("./routes/PdfToImagesPage"));
const WatermarkPage = lazy(() => import("./routes/WatermarkPage"));
const PageNumbersPage = lazy(() => import("./routes/PageNumbersPage"));

initializePwa();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route element={<App />}>
          <Route index element={<HomePage />} />
          <Route path="share" element={<SharePage />} />
          <Route path="ocr" element={<OcrPage />} />
          <Route path="image" element={<ImagePage />} />
          <Route path="compress" element={<CompressPage />} />
          <Route path="edit" element={<EditPage />} />
          <Route path="tools" element={<ToolsPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="files" element={<FilesPage />} />
          <Route path="document" element={<DocumentPage />} />
          <Route path="*" element={<HomePage />} />
          <Route path="scan" element={<ScanPage />} />
          <Route path="scans" element={<ScanLibraryPage />} />
          <Route path="merge" element={<MergePage />} />
          <Route path="split" element={<SplitPage />} />
          <Route path="organize" element={<OrganizePage />} />
          <Route path="images-to-pdf" element={<ImagesToPdfPage />} />
          <Route path="pdf-to-images" element={<PdfToImagesPage />} />
          <Route path="watermark" element={<WatermarkPage />} />
          <Route path="page-numbers" element={<PageNumbersPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </StrictMode>,
);
