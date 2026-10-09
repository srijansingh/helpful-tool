import { PDFDocument, degrees } from "pdf-lib";
export function bookletOrder(
  pageCount: number,
  rightBinding = false,
): Array<[number | null, number | null]> {
  if (!Number.isInteger(pageCount) || pageCount < 1)
    throw new Error("Choose a PDF with at least one page.");
  const total = Math.ceil(pageCount / 4) * 4;
  const sides: Array<[number | null, number | null]> = [];
  for (let sheet = 0; sheet < total / 4; sheet++) {
    const front: [number | null, number | null] = [
        total - 1 - sheet * 2,
        sheet * 2,
      ],
      back: [number | null, number | null] = [
        sheet * 2 + 1,
        total - 2 - sheet * 2,
      ];
    for (const side of [front, back]) {
      const values = side.map((n) => (n! >= pageCount ? null : n)) as [
        number | null,
        number | null,
      ];
      sides.push(rightBinding ? [values[1], values[0]] : values);
    }
  }
  return sides;
}
export async function buildBooklet(
  bytes: Uint8Array,
  paper: "a4" | "letter",
  rightBinding = false,
) {
  const source = await PDFDocument.load(bytes);
  const fields = source.getForm();
  if (fields.getFields().length)
    fields.flatten({ updateFieldAppearances: false });
  const out = await PDFDocument.create();
  const [width, height] = paper === "a4" ? [841.89, 595.28] : [792, 612];
  for (const pair of bookletOrder(source.getPageCount(), rightBinding)) {
    const sheet = out.addPage([width, height]);
    for (let side = 0; side < 2; side++) {
      const index = pair[side];
      if (index === null) continue;
      const page = source.getPage(index);
      const box = page.getCropBox();
      const image = await out.embedPage(page, {
        left: box.x,
        bottom: box.y,
        right: box.x + box.width,
        top: box.y + box.height,
      });
      const rotation = ((page.getRotation().angle % 360) + 360) % 360;
      const viewW = rotation % 180 ? image.height : image.width,
        viewH = rotation % 180 ? image.width : image.height;
      const scale = Math.min((width / 2 - 24) / viewW, (height - 24) / viewH);
      const dw = viewW * scale,
        dh = viewH * scale;
      let x = (side * width) / 2 + (width / 2 - dw) / 2,
        y = (height - dh) / 2;
      if (rotation === 90) y += dh;
      else if (rotation === 180) {
        x += dw;
        y += dh;
      } else if (rotation === 270) x += dw;
      sheet.drawPage(image, {
        x,
        y,
        width: image.width * scale,
        height: image.height * scale,
        rotate: degrees(-rotation),
      });
    }
  }
  return out.save();
}
