import { makeEditor, makeLogger } from "../../__mocks__";
import { MyEditor } from "../../editor";
import { ChangesApplicator } from "../../services/ChangesApplicator";
import { OperationPerformer } from "../../services/OperationPerformer";
import { Parser } from "../../services/Parser";
import { BackspaceBehaviourOverride } from "../BackspaceBehaviourOverride";
import { MetaBackspaceBehaviourOverride } from "../MetaBackspaceBehaviourOverride";

/* eslint-disable @typescript-eslint/no-explicit-any */
jest.mock("obsidian", () => ({}), { virtual: true });

const settings: any = {
  keepCursorWithinContent: "bullet-and-checkbox",
  stickCursor: "bullet-and-checkbox",
};

function pressBackspace(editor: MyEditor, meta: boolean): void {
  const plugin: any = { registerEditorExtension: (): void => undefined };
  const imeDetector: any = { isOpened: (): boolean => false };
  const operationPerformer = new OperationPerformer(
    new Parser(makeLogger(), settings),
    new ChangesApplicator(),
  );

  const feature: any = meta
    ? new MetaBackspaceBehaviourOverride(
        plugin,
        settings,
        imeDetector,
        operationPerformer,
      )
    : new BackspaceBehaviourOverride(
        plugin,
        settings,
        imeDetector,
        operationPerformer,
      );

  expect(feature.check()).toBe(true);

  feature.run(editor);
}

const getText = (editor: unknown) => (editor as any).getValue();
const getCursor = (editor: unknown) => (editor as any).getCursor();

describe.each([
  ["backspace", false],
  ["cmd+backspace", true],
])("%s", (_name, meta: boolean) => {
  test("erases an empty bullet, leaving an empty line", () => {
    const editor = makeEditor({
      text: "- one\n- \n- three\n",
      cursor: { line: 1, ch: 2 },
    });

    pressBackspace(editor, meta);

    expect(getText(editor)).toBe("- one\n\n- three\n");
    expect(getCursor(editor)).toEqual({ line: 1, ch: 0 });
  });

  test("erases the only empty bullet, leaving an empty line", () => {
    const editor = makeEditor({ text: "- \n", cursor: { line: 0, ch: 2 } });

    pressBackspace(editor, meta);

    expect(getText(editor)).toBe("\n");
  });

  test("erases a nested empty bullet, leaving an empty line", () => {
    const editor = makeEditor({
      text: "- one\n    - \n",
      cursor: { line: 1, ch: 6 },
    });

    pressBackspace(editor, meta);

    expect(getText(editor)).toBe("- one\n\n");
  });

  test("erases an empty checkbox, leaving an empty line", () => {
    const editor = makeEditor({
      text: "- one\n- [ ] \n",
      cursor: { line: 1, ch: 6 },
    });

    pressBackspace(editor, meta);

    expect(getText(editor)).toBe("- one\n\n");
  });
});

test("cmd+backspace erases a checkbox with text, leaving an empty line", () => {
  const editor = makeEditor({
    text: "- one\n- [ ] two\n",
    cursor: { line: 1, ch: 9 },
  });

  pressBackspace(editor, true);

  expect(getText(editor)).toBe("- one\n\n");
  expect(getCursor(editor)).toEqual({ line: 1, ch: 0 });
});

test("cmd+backspace on a bullet with text keeps the bullet", () => {
  const editor = makeEditor({
    text: "- one\n- two\n",
    cursor: { line: 1, ch: 5 },
  });

  pressBackspace(editor, true);

  expect(getText(editor)).toBe("- one\n- \n");
});

test("backspace on a bullet with text still merges with the item above", () => {
  const editor = makeEditor({
    text: "- one\n- two\n",
    cursor: { line: 1, ch: 2 },
  });

  pressBackspace(editor, false);

  expect(getText(editor)).toBe("- onetwo\n");
});
