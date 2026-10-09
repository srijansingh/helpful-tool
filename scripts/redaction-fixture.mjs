import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import fs from "node:fs/promises";
const doc = await PDFDocument.create();
const page = doc.addPage([400, 600]);
const font = await doc.embedFont(StandardFonts.Helvetica);
page.drawText("VISIBLE_SECRET_7391", { x: 20, y: 540, size: 20, font });
page.drawText("PUBLIC_TEXT_REMAINS", { x: 20, y: 200, size: 20, font });
page.drawRectangle({
  x: 20,
  y: 50,
  width: 100,
  height: 50,
  color: rgb(0, 0.7, 0),
});
doc.setAuthor("METADATA_SECRET_7391");
doc.setSubject("SUBJECT_SECRET_7391");
await doc.attach(
  new TextEncoder().encode("ATTACHMENT_SECRET_7391"),
  "secret.txt",
);
const field = doc.getForm().createTextField("FORM_SECRET_7391");
field.setText("FIELD_VALUE_SECRET_7391");
field.addToPage(page, { x: 20, y: 460, width: 250, height: 30 });
await fs.writeFile(
  process.argv[2] || "/private/tmp/localpdf-redaction-fixture.pdf",
  await doc.save(),
);
