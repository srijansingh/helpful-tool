import { readFileSync, readdirSync } from "node:fs";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    {
      name: "pdfjs-local-assets",
      generateBundle() {
        for (const directory of ["cmaps", "standard_fonts", "wasm"]) {
          const base = `node_modules/pdfjs-dist/${directory}`;
          for (const entry of readdirSync(base, { withFileTypes: true })) {
            if (!entry.isFile() || entry.name.startsWith("._")) continue;
            this.emitFile({
              type: "asset",
              fileName: `pdfjs/${directory}/${entry.name}`,
              source: readFileSync(`${base}/${entry.name}`),
            });
          }
        }
      },
      configureServer(server) {
        server.middlewares.use("/pdfjs", async (req, res, next) => {
          const path = req.url?.split("?")[0];
          if (
            !path ||
            !/^\/(cmaps|standard_fonts|wasm)\/[a-zA-Z0-9_.-]+$/.test(path)
          )
            return next();
          const { readFile } = await import("node:fs/promises");
          try {
            const data = await readFile(`node_modules/pdfjs-dist${path}`);
            res.setHeader("Content-Type", "application/octet-stream");
            res.end(data);
          } catch {
            next();
          }
        });
      },
    },
    tailwindcss(),
    VitePWA({
      registerType: "prompt",
      includeAssets: [
        "favicon.svg",
        "fonts/*.ttf",
        "fonts/OFL.txt",
        "share-target.js",
      ],
      manifest: {
        name: "LocalPDF — Merge, Split, Convert PDFs",
        short_name: "LocalPDF",
        description:
          "Merge, split and convert PDFs entirely in your browser. No upload, no login.",
        theme_color: "#f8f9fc",
        background_color: "#f8f9fc",
        display: "standalone",
        start_url: "/",
        share_target: {
          action: "/share",
          method: "POST",
          enctype: "multipart/form-data",
          params: {
            files: [{ name: "files", accept: ["application/pdf", "image/*"] }],
          },
        },
        icons: [
          { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
          {
            src: "/icons/icon-512-maskable.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        // pdf.js's worker + wasm-ish assets are large; cache them so the
        // tools keep working offline after the first visit.
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        // pdf.js ships its worker as .mjs, not .js — without it here the
        // service worker silently skips caching it and PDF -> Images
        // breaks offline after the first visit.
        globPatterns: [
          "**/*.{js,mjs,css,html,svg,png,ico,woff2,ttf,wasm,bcmap,pfb}",
        ],
        importScripts: ["share-target.js"],
        globIgnores: ["**/ocr/**", "**/._*"],
        runtimeCaching: [
          {
            urlPattern: /\/ocr\//,
            handler: "CacheFirst",
            options: {
              cacheName: "localpdf-ocr-assets",
              cacheableResponse: { statuses: [200] },
            },
          },
        ],
      },
    }),
  ],
});
