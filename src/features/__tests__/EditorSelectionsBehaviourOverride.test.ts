import { codeFolding, foldEffect } from "@codemirror/language";
import { EditorState, Extension } from "@codemirror/state";

import { makeLogger } from "../../__mocks__";
import { Parser } from "../../services/Parser";
import { EditorSelectionsBehaviourOverride } from "../EditorSelectionsBehaviourOverride";

/* eslint-disable @typescript-eslint/no-explicit-any */
jest.mock("obsidian", () => ({}), { virtual: true });

function makeState(
  doc: string,
  cursor: number,
  settings: any = { keepCursorWithinContent: "bullet-and-checkbox" },
) {
  const extensions: Extension[] = [codeFolding()];
  const plugin: any = {
    registerEditorExtension: (ext: Extension) => extensions.push(ext),
  };

  const feature = new EditorSelectionsBehaviourOverride(
    plugin,
    settings,
    new Parser(makeLogger(), settings),
  );
  feature.load();

  return EditorState.create({ doc, selection: { anchor: cursor }, extensions });
}

test("should correct the cursor within the same transaction", () => {
  const state = makeState("- one\n- two", 5);

  const tr = state.update({ selection: { anchor: 6 } });

  expect(tr.selection.main.head).toBe(8);
  expect(tr.state.selection.main.head).toBe(8);
});

test("should correct the cursor after a document change", () => {
  const state = makeState("- one\n", 6);

  const tr = state.update({
    changes: { from: 6, insert: "- two" },
    selection: { anchor: 6 },
  });

  expect(tr.state.doc.toString()).toBe("- one\n- two");
  expect(tr.state.selection.main.head).toBe(8);
});

test("should not change a valid cursor position", () => {
  const state = makeState("- one\n- two", 2);

  const tr = state.update({ selection: { anchor: 9 } });

  expect(tr.state.selection.main.head).toBe(9);
});

test("should skip the correction when the setting is never", () => {
  const settings: any = { keepCursorWithinContent: "never" };
  const state = makeState("- one\n- two", 5, settings);

  const tr = state.update({ selection: { anchor: 6 } });

  expect(tr.state.selection.main.head).toBe(6);
});

test("should move the cursor out of folded lines", () => {
  // "- one" is folded; ArrowRight from the end of "- one" lands at the end of
  // the folded range, which is the end of the hidden "  - two" line.
  const state = makeState("- one\n  - two\n- three", 5).update({
    effects: foldEffect.of({ from: 5, to: 13 }),
  }).state;

  const tr = state.update({ selection: { anchor: 13 } });

  expect(tr.state.selection.main.head).toBe(5);
});
