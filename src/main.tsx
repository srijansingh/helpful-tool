import { StrictMode, lazy } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { registerSW } from "virtual:pwa-register";
import "./index.css";
import App from "./App";

// Route-level code splitting: pdf.js's worker alone is 1MB+ and is only
// needed on /pdf-to-images, so there's no reason every visitor downloads
// it up front. The Suspense boundary for these lives inside App, around
// just the <Outlet/>, so the header/nav don't flicker away on transitions.
const HomePage = lazy(() => import("./routes/HomePage"));
const ScanPage = lazy(() => import("./routes/ScanPage"));
const ScanLibraryPage = lazy(() => import("./routes/ScanLibraryPage"));
const MergePage = lazy(() => import("./routes/MergePage"));
const SplitPage = lazy(() => import("./routes/SplitPage"));
const OrganizePage = lazy(() => import("./routes/OrganizePage"));
const ImagesToPdfPage = lazy(() => import("./routes/ImagesToPdfPage"));
const PdfToImagesPage = lazy(() => import("./routes/PdfToImagesPage"));

registerSW({ immediate: true });

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route element={<App />}>
          <Route index element={<HomePage />} />
          <Route path="scan" element={<ScanPage />} />
          <Route path="scans" element={<ScanLibraryPage />} />
          <Route path="merge" element={<MergePage />} />
          <Route path="split" element={<SplitPage />} />
          <Route path="organize" element={<OrganizePage />} />
          <Route path="images-to-pdf" element={<ImagesToPdfPage />} />
          <Route path="pdf-to-images" element={<PdfToImagesPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </StrictMode>
);
