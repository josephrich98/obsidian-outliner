import { makeEditor } from "../../__mocks__";
import {
  eraseCheckboxItemTillCursor,
  eraseEmptyListItem,
} from "../eraseListItem";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getText = (editor: unknown) => (editor as any).getValue();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getCursor = (editor: unknown) => (editor as any).getCursor();

test("should erase the bullet of an empty list item", () => {
  const editor = makeEditor({
    text: "- one\n- \n- three\n",
    cursor: { line: 1, ch: 2 },
  });

  expect(eraseEmptyListItem(editor)).toBe(true);
  expect(getText(editor)).toBe("- one\n\n- three\n");
  expect(getCursor(editor)).toEqual({ line: 1, ch: 0 });
});

test("should erase the bullet of the only empty list item", () => {
  const editor = makeEditor({
    text: "- \n",
    cursor: { line: 0, ch: 2 },
  });

  expect(eraseEmptyListItem(editor)).toBe(true);
  expect(getText(editor)).toBe("\n");
  expect(getCursor(editor)).toEqual({ line: 0, ch: 0 });
});

test("should erase the checkbox of an empty checkbox item", () => {
  const editor = makeEditor({
    text: "- one\n- [ ] \n",
    cursor: { line: 1, ch: 6 },
  });

  expect(eraseEmptyListItem(editor)).toBe(true);
  expect(getText(editor)).toBe("- one\n\n");
  expect(getCursor(editor)).toEqual({ line: 1, ch: 0 });
});

test("should erase the checkbox when the cursor is right after the bullet", () => {
  const editor = makeEditor({
    text: "- one\n- [ ] \n",
    cursor: { line: 1, ch: 2 },
  });

  expect(eraseEmptyListItem(editor)).toBe(true);
  expect(getText(editor)).toBe("- one\n\n");
});

test("should erase the checkbox of an empty checked item", () => {
  const editor = makeEditor({
    text: "- [x] \n",
    cursor: { line: 0, ch: 6 },
  });

  expect(eraseEmptyListItem(editor)).toBe(true);
  expect(getText(editor)).toBe("\n");
});

test("should erase the bullet and the indentation of a nested empty item", () => {
  const editor = makeEditor({
    text: "- one\n    - \n",
    cursor: { line: 1, ch: 6 },
  });

  expect(eraseEmptyListItem(editor)).toBe(true);
  expect(getText(editor)).toBe("- one\n\n");
  expect(getCursor(editor)).toEqual({ line: 1, ch: 0 });
});

test("should erase the bullet of an empty numbered item", () => {
  const editor = makeEditor({
    text: "1. one\n2. \n",
    cursor: { line: 1, ch: 3 },
  });

  expect(eraseEmptyListItem(editor)).toBe(true);
  expect(getText(editor)).toBe("1. one\n\n");
});

test("should do nothing if the item isn't empty", () => {
  const editor = makeEditor({
    text: "- one\n- two\n",
    cursor: { line: 1, ch: 2 },
  });

  expect(eraseEmptyListItem(editor)).toBe(false);
  expect(getText(editor)).toBe("- one\n- two\n");
});

test("should do nothing if the checkbox isn't empty", () => {
  const editor = makeEditor({
    text: "- [ ] one\n",
    cursor: { line: 0, ch: 6 },
  });

  expect(eraseEmptyListItem(editor)).toBe(false);
});

test("should do nothing if the empty item has children", () => {
  const editor = makeEditor({
    text: "- \n    - two\n",
    cursor: { line: 0, ch: 2 },
  });

  expect(eraseEmptyListItem(editor)).toBe(false);
  expect(getText(editor)).toBe("- \n    - two\n");
});

test("should do nothing if the empty item has notes", () => {
  const editor = makeEditor({
    text: "- \n  note\n",
    cursor: { line: 0, ch: 2 },
  });

  expect(eraseEmptyListItem(editor)).toBe(false);
});

test("should do nothing on an empty note line", () => {
  const editor = makeEditor({
    text: "- one\n  \n",
    cursor: { line: 1, ch: 2 },
  });

  expect(eraseEmptyListItem(editor)).toBe(false);
});

test("should do nothing if the cursor is before the bullet", () => {
  const editor = makeEditor({
    text: "- one\n    - \n",
    cursor: { line: 1, ch: 2 },
  });

  expect(eraseEmptyListItem(editor)).toBe(false);
});

test("should do nothing if there is a selection", () => {
  const editor = makeEditor({
    text: "- one\n- \n",
    cursor: { line: 1, ch: 2 },
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (editor as any).setSelections([
    { anchor: { line: 0, ch: 2 }, head: { line: 1, ch: 2 } },
  ]);

  expect(eraseEmptyListItem(editor)).toBe(false);
});

test("should erase the whole line of a checkbox item with text", () => {
  const editor = makeEditor({
    text: "- one\n- [ ] two\n",
    cursor: { line: 1, ch: 9 },
  });

  expect(eraseCheckboxItemTillCursor(editor)).toBe(true);
  expect(getText(editor)).toBe("- one\n\n");
  expect(getCursor(editor)).toEqual({ line: 1, ch: 0 });
});

test("should erase the whole line of a checked item with text", () => {
  const editor = makeEditor({
    text: "- [x] two\n",
    cursor: { line: 0, ch: 9 },
  });

  expect(eraseCheckboxItemTillCursor(editor)).toBe(true);
  expect(getText(editor)).toBe("\n");
});

test("should erase the whole line of a nested checkbox item with text", () => {
  const editor = makeEditor({
    text: "- one\n    - [ ] two\n",
    cursor: { line: 1, ch: 13 },
  });

  expect(eraseCheckboxItemTillCursor(editor)).toBe(true);
  expect(getText(editor)).toBe("- one\n\n");
});

test("should erase only till the cursor on a checkbox item", () => {
  const editor = makeEditor({
    text: "- [ ] two three\n",
    cursor: { line: 0, ch: 9 },
  });

  expect(eraseCheckboxItemTillCursor(editor)).toBe(true);
  expect(getText(editor)).toBe(" three\n");
});

test("should not erase the line of a checkbox item with children", () => {
  const editor = makeEditor({
    text: "- [ ] two\n    - three\n",
    cursor: { line: 0, ch: 9 },
  });

  expect(eraseCheckboxItemTillCursor(editor)).toBe(false);
  expect(getText(editor)).toBe("- [ ] two\n    - three\n");
});

test("should not erase the line of an item without a checkbox", () => {
  const editor = makeEditor({
    text: "- two\n",
    cursor: { line: 0, ch: 5 },
  });

  expect(eraseCheckboxItemTillCursor(editor)).toBe(false);
});

test("should not erase the line of a note line", () => {
  const editor = makeEditor({
    text: "- one\n  note\n",
    cursor: { line: 1, ch: 6 },
  });

  expect(eraseCheckboxItemTillCursor(editor)).toBe(false);
});

test("should not erase the line if the cursor is inside the checkbox marker", () => {
  const editor = makeEditor({
    text: "- [ ] two\n",
    cursor: { line: 0, ch: 2 },
  });

  expect(eraseCheckboxItemTillCursor(editor)).toBe(false);
  expect(getText(editor)).toBe("- [ ] two\n");
});
