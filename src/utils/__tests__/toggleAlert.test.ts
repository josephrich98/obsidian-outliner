import { makeEditor } from "../../__mocks__";
import { isAlertLine } from "../alertRe";
import { toggleAlert } from "../toggleAlert";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getText = (editor: unknown) => (editor as any).getValue();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getCursor = (editor: unknown) => (editor as any).getCursor();

test("should add the alert marker to a checkbox item", () => {
  const editor = makeEditor({
    text: "- [ ] pay the rent\n",
    cursor: { line: 0, ch: 6 },
  });

  expect(toggleAlert(editor)).toBe(true);
  expect(getText(editor)).toBe("- [ ] ! pay the rent\n");
  expect(getCursor(editor)).toEqual({ line: 0, ch: 8 });
});

test("should remove the alert marker from a checkbox item", () => {
  const editor = makeEditor({
    text: "- [ ] ! pay the rent\n",
    cursor: { line: 0, ch: 8 },
  });

  expect(toggleAlert(editor)).toBe(true);
  expect(getText(editor)).toBe("- [ ] pay the rent\n");
  expect(getCursor(editor)).toEqual({ line: 0, ch: 6 });
});

test("should keep the checked state", () => {
  const editor = makeEditor({
    text: "- [x] pay the rent\n",
    cursor: { line: 0, ch: 18 },
  });

  expect(toggleAlert(editor)).toBe(true);
  expect(getText(editor)).toBe("- [x] ! pay the rent\n");
});

test("should work on a list item without a checkbox", () => {
  const editor = makeEditor({
    text: "  - nested\n",
    cursor: { line: 0, ch: 4 },
  });

  expect(toggleAlert(editor)).toBe(true);
  expect(getText(editor)).toBe("  - ! nested\n");
});

test("should do nothing on a line that isn't a list item", () => {
  const editor = makeEditor({
    text: "just a paragraph\n",
    cursor: { line: 0, ch: 0 },
  });

  expect(toggleAlert(editor)).toBe(false);
  expect(getText(editor)).toBe("just a paragraph\n");
});

test("should add the marker to every selected item unless all of them have it", () => {
  const editor = makeEditor({
    text: "- [ ] ! one\n- [ ] two\n- [ ] three\n",
    cursor: { line: 0, ch: 0 },
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (editor as any).setSelections([
    { anchor: { line: 0, ch: 0 }, head: { line: 2, ch: 11 } },
  ]);

  expect(toggleAlert(editor)).toBe(true);
  expect(getText(editor)).toBe("- [ ] ! one\n- [ ] ! two\n- [ ] ! three\n");

  expect(toggleAlert(editor)).toBe(true);
  expect(getText(editor)).toBe("- [ ] one\n- [ ] two\n- [ ] three\n");
});

test("should recognise alert lines", () => {
  expect(isAlertLine("- [ ] ! pay the rent")).toBe(true);
  expect(isAlertLine("- ! pay the rent")).toBe(true);
  expect(isAlertLine("> - [ ] ! quoted")).toBe(true);
  expect(isAlertLine("1. ! numbered")).toBe(true);
  expect(isAlertLine("- !")).toBe(true);
  expect(isAlertLine("- [ ] pay the rent")).toBe(false);
  expect(isAlertLine("- ![[image.png]]")).toBe(false);
  expect(isAlertLine("- [ ] pay the rent!")).toBe(false);
  expect(isAlertLine("! not a list item")).toBe(false);
});
