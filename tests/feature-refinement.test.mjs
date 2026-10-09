import test from "node:test";
import assert from "node:assert/strict";
import { PDFDocument } from "pdf-lib";
import { readForms, editPdf } from "../src/lib/pdf/edit.ts";
import { moveMark, resizeMark } from "../src/lib/markGeometry.ts";
test("form export clears dropdown and radio, fills option lists and preserves read-only values", async () => {
  const doc = await PDFDocument.create();
  const page = doc.addPage();
  const form = doc.getForm();
  const dropdown = form.createDropdown("Choice");
  dropdown.addOptions(["One", "Two"]);
  dropdown.select("One");
  dropdown.addToPage(page, { x: 10, y: 100, width: 120, height: 30 });
  const radio = form.createRadioGroup("Radio");
  radio.addOptionToPage("Yes", page, { x: 10, y: 150, width: 20, height: 20 });
  radio.select("Yes");
  const list = form.createOptionList("List");
  list.addOptions(["Alpha", "Beta"]);
  list.enableMultiselect();
  list.select("Alpha");
  list.addToPage(page, { x: 10, y: 200, width: 150, height: 60 });
  const locked = form.createTextField("Locked");
  locked.setText("Retained");
  locked.enableReadOnly();
  locked.addToPage(page, { x: 10, y: 300, width: 120, height: 30 });
  const bytes = await doc.save();
  const fields = await readForms(bytes);
  for (const f of fields)
    f.value =
      f.name === "List"
        ? ["Alpha", "Beta"]
        : f.name === "Locked"
          ? "Attempted overwrite"
          : "";
  const output = await PDFDocument.load(
    await editPdf(bytes, [], fields, false),
  );
  assert.deepEqual(output.getForm().getDropdown("Choice").getSelected(), []);
  assert.equal(
    output.getForm().getRadioGroup("Radio").getSelected(),
    undefined,
  );
  assert.deepEqual(output.getForm().getOptionList("List").getSelected(), [
    "Alpha",
    "Beta",
  ]);
  assert.equal(output.getForm().getTextField("Locked").getText(), "Retained");
});
test("moving and resizing pen marks keeps every point within displayed page bounds", () => {
  const mark = {
    id: "pen",
    page: 1,
    kind: "pen",
    x: 0.2,
    y: 0.3,
    w: 0.3,
    h: 0.2,
    text: "",
    size: 20,
    color: "#000000",
    points: [
      [0.2, 0.3],
      [0.5, 0.5],
    ],
  };
  const moved = moveMark(mark, 2, -2);
  assert.equal(moved.x, 0.7);
  assert.equal(moved.y, 0);
  for (const [x, y] of moved.points)
    assert.ok(x >= 0 && x <= 1 && y >= 0 && y <= 1);
  const larger = resizeMark(moved, 2);
  for (const [x, y] of larger.points)
    assert.ok(x >= 0 && x <= 1 && y >= 0 && y <= 1);
  assert.equal(larger.w, 1 - larger.x);
});
