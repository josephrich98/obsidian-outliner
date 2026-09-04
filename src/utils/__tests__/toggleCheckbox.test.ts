import { makeEditor } from "../../__mocks__";
import { toggleCheckbox } from "../toggleCheckbox";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getText = (editor: unknown) => (editor as any).getValue();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getCursor = (editor: unknown) => (editor as any).getCursor();

test("should add a checkbox to the item under the cursor", () => {
  const editor = makeEditor({
    text: "- one\n- two\n",
    cursor: { line: 0, ch: 5 },
  });

  expect(toggleCheckbox(editor)).toBe(true);
  expect(getText(editor)).toBe("- [ ] one\n- two\n");
  expect(getCursor(editor)).toEqual({ line: 0, ch: 9 });
});

test("should remove an unchecked checkbox together with the bullet", () => {
  const editor = makeEditor({
    text: "- [ ] one\n",
    cursor: { line: 0, ch: 9 },
  });

  expect(toggleCheckbox(editor)).toBe(true);
  expect(getText(editor)).toBe("one\n");
  expect(getCursor(editor)).toEqual({ line: 0, ch: 3 });
});

test("should remove a checked checkbox together with the bullet", () => {
  const editor = makeEditor({
    text: "- [x] one\n",
    cursor: { line: 0, ch: 6 },
  });

  expect(toggleCheckbox(editor)).toBe(true);
  expect(getText(editor)).toBe("one\n");
  expect(getCursor(editor)).toEqual({ line: 0, ch: 0 });
});

test("should keep the indent of a removed nested item", () => {
  const editor = makeEditor({
    text: "- [ ] one\n\t- [x] two\n",
    cursor: { line: 1, ch: 10 },
  });
  editor.setSelections([
    { anchor: { line: 1, ch: 10 }, head: { line: 1, ch: 10 } },
  ]);

  expect(toggleCheckbox(editor)).toBe(true);
  expect(getText(editor)).toBe("- [ ] one\n\ttwo\n");
  expect(getCursor(editor)).toEqual({ line: 1, ch: 4 });
});

test("should turn a checkbox item back into a plain line and back again", () => {
  const editor = makeEditor({
    text: "milk\n",
    cursor: { line: 0, ch: 4 },
  });

  expect(toggleCheckbox(editor)).toBe(true);
  expect(getText(editor)).toBe("- [ ] milk\n");

  expect(toggleCheckbox(editor)).toBe(true);
  expect(getText(editor)).toBe("milk\n");
  expect(getCursor(editor)).toEqual({ line: 0, ch: 4 });
});

test("should work with tab indented items", () => {
  const editor = makeEditor({
    text: "- one\n\t- two\n",
    cursor: { line: 1, ch: 6 },
  });

  expect(toggleCheckbox(editor)).toBe(true);
  expect(getText(editor)).toBe("- one\n\t- [ ] two\n");
  expect(getCursor(editor)).toEqual({ line: 1, ch: 10 });
});

test("should work with numbered items", () => {
  const editor = makeEditor({
    text: "1. one\n",
    cursor: { line: 0, ch: 6 },
  });

  expect(toggleCheckbox(editor)).toBe(true);
  expect(getText(editor)).toBe("1. [ ] one\n");
});

test("should work with items inside a quote", () => {
  const editor = makeEditor({
    text: "> - one\n",
    cursor: { line: 0, ch: 7 },
  });

  expect(toggleCheckbox(editor)).toBe(true);
  expect(getText(editor)).toBe("> - [ ] one\n");

  expect(toggleCheckbox(editor)).toBe(true);
  expect(getText(editor)).toBe("> one\n");
});

test("should work with inconsistently indented items", () => {
  const editor = makeEditor({
    text: "- one\n\t- two\n      - three\n",
    cursor: { line: 2, ch: 13 },
  });

  expect(toggleCheckbox(editor)).toBe(true);
  expect(getText(editor)).toBe("- one\n\t- two\n      - [ ] three\n");
});

test("should turn a line that is not a list item into a checkbox item", () => {
  const editor = makeEditor({
    text: "one\n",
    cursor: { line: 0, ch: 3 },
  });

  expect(toggleCheckbox(editor)).toBe(true);
  expect(getText(editor)).toBe("- [ ] one\n");
  expect(getCursor(editor)).toEqual({ line: 0, ch: 9 });
});

test("should turn an empty line under the cursor into a checkbox item", () => {
  const editor = makeEditor({
    text: "\n",
    cursor: { line: 0, ch: 0 },
  });

  expect(toggleCheckbox(editor)).toBe(true);
  expect(getText(editor)).toBe("- [ ] \n");
  expect(getCursor(editor)).toEqual({ line: 0, ch: 6 });
});

test("should keep the cursor in place when it's inside the bullet", () => {
  const editor = makeEditor({
    text: "  - one\n",
    cursor: { line: 0, ch: 1 },
  });

  expect(toggleCheckbox(editor)).toBe(true);
  expect(getText(editor)).toBe("  - [ ] one\n");
  expect(getCursor(editor)).toEqual({ line: 0, ch: 1 });
});

test("should add checkboxes to every selected item", () => {
  const editor = makeEditor({
    text: "- one\n- two\n- three\n",
    cursor: { line: 0, ch: 0 },
  });
  editor.setSelections([
    { anchor: { line: 0, ch: 2 }, head: { line: 1, ch: 5 } },
  ]);

  expect(toggleCheckbox(editor)).toBe(true);
  expect(getText(editor)).toBe("- [ ] one\n- [ ] two\n- three\n");
  expect(editor.listSelections()).toEqual([
    { anchor: { line: 0, ch: 6 }, head: { line: 1, ch: 9 } },
  ]);
});

test("should add checkboxes to the items that don't have one", () => {
  const editor = makeEditor({
    text: "- [x] one\n- two\n",
    cursor: { line: 0, ch: 0 },
  });
  editor.setSelections([
    { anchor: { line: 0, ch: 0 }, head: { line: 1, ch: 5 } },
  ]);

  expect(toggleCheckbox(editor)).toBe(true);
  expect(getText(editor)).toBe("- [x] one\n- [ ] two\n");
});

test("should remove the checkboxes when every selected item has one", () => {
  const editor = makeEditor({
    text: "- [ ] one\n- [x] two\n",
    cursor: { line: 0, ch: 0 },
  });
  editor.setSelections([
    { anchor: { line: 0, ch: 0 }, head: { line: 1, ch: 9 } },
  ]);

  expect(toggleCheckbox(editor)).toBe(true);
  expect(getText(editor)).toBe("one\ntwo\n");
});

test("should skip the blank lines of a bigger selection", () => {
  const editor = makeEditor({
    text: "- one\n\n- two\n",
    cursor: { line: 0, ch: 0 },
  });
  editor.setSelections([
    { anchor: { line: 0, ch: 0 }, head: { line: 2, ch: 5 } },
  ]);

  expect(toggleCheckbox(editor)).toBe(true);
  expect(getText(editor)).toBe("- [ ] one\n\n- [ ] two\n");
});

test("should ignore the last line of the selection if nothing is selected on it", () => {
  const editor = makeEditor({
    text: "- one\n- two\n",
    cursor: { line: 0, ch: 0 },
  });
  editor.setSelections([
    { anchor: { line: 0, ch: 0 }, head: { line: 1, ch: 0 } },
  ]);

  expect(toggleCheckbox(editor)).toBe(true);
  expect(getText(editor)).toBe("- [ ] one\n- two\n");
});

test("should work with multiple cursors", () => {
  const editor = makeEditor({
    text: "- one\n- two\n- three\n",
    cursor: { line: 0, ch: 0 },
  });
  editor.setSelections([
    { anchor: { line: 0, ch: 5 }, head: { line: 0, ch: 5 } },
    { anchor: { line: 2, ch: 7 }, head: { line: 2, ch: 7 } },
  ]);

  expect(toggleCheckbox(editor)).toBe(true);
  expect(getText(editor)).toBe("- [ ] one\n- two\n- [ ] three\n");
  expect(editor.listSelections()).toEqual([
    { anchor: { line: 0, ch: 9 }, head: { line: 0, ch: 9 } },
    { anchor: { line: 2, ch: 11 }, head: { line: 2, ch: 11 } },
  ]);
});
