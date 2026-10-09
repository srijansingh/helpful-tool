import { runPdfJob } from "../pdfJobs";
import type { mergePdfs as merge } from "./merge";
import type { imagesToPdf as images } from "./imagesToPdf";
import type { extractPages as extract, splitEveryPage as split } from "./split";
import type { buildOrganizedPdf as organize } from "./organize";
import type { applyWatermark as watermark } from "./watermark";
import type { applyPageNumbers as numbers } from "./pageNumbers";
import type { editPdf as edit } from "./edit";
import type { buildBooklet as booklet } from "./booklet";
export const mergePdfs = (...args: Parameters<typeof merge>) =>
  runPdfJob<Awaited<ReturnType<typeof merge>>>("merge", args);
export const imagesToPdf = (...args: Parameters<typeof images>) =>
  runPdfJob<Awaited<ReturnType<typeof images>>>("images", args);
export const extractPages = (...args: Parameters<typeof extract>) =>
  runPdfJob<Awaited<ReturnType<typeof extract>>>("extract", args);
export const splitEveryPage = (...args: Parameters<typeof split>) =>
  runPdfJob<Awaited<ReturnType<typeof split>>>("split", args);
export const buildOrganizedPdf = (...args: Parameters<typeof organize>) =>
  runPdfJob<Awaited<ReturnType<typeof organize>>>("organize", args);
export const applyWatermark = (...args: Parameters<typeof watermark>) =>
  runPdfJob<Awaited<ReturnType<typeof watermark>>>("watermark", args);
export const applyPageNumbers = (...args: Parameters<typeof numbers>) =>
  runPdfJob<Awaited<ReturnType<typeof numbers>>>("numbers", args);
export const editPdf = (...args: Parameters<typeof edit>) =>
  runPdfJob<Awaited<ReturnType<typeof edit>>>("edit", args);
export const buildBooklet = (...args: Parameters<typeof booklet>) =>
  runPdfJob<Awaited<ReturnType<typeof booklet>>>("booklet", args);
