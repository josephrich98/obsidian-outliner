/* eslint-disable @typescript-eslint/no-explicit-any */
import { MyEditor } from "./editor";
import { Logger } from "./services/Logger";
import { Parser } from "./services/Parser";
import { Settings } from "./services/Settings";

export interface EditorMockParams {
  text: string;
  cursor: { line: number; ch: number };
  getAllFoldedLines?: () => number[];
}

export function makeEditor(params: EditorMockParams): MyEditor {
  let text = params.text;
  let cursor = { ...params.cursor };
  let selections = [{ anchor: { ...cursor }, head: { ...cursor } }];

  const editor: any = {
    getCursor: () => cursor,
    listSelections: () => selections,
    setSelections: (newSelections: any[]) => {
      selections = newSelections.map((s) => ({
        anchor: { ...s.anchor },
        head: { ...s.head },
      }));
      cursor = { ...selections[selections.length - 1].head };
    },
    getLine: (l: number) => text.split("\n")[l],
    getValue: () => text,
    posToOffset: (pos: { line: number; ch: number }) => {
      const lines = text.split("\n");
      let offset = 0;
      for (let i = 0; i < pos.line; i++) {
        offset += lines[i].length + 1;
      }
      return offset + pos.ch;
    },
    replaceRange: (
      replacement: string,
      from: { line: number; ch: number },
      to: { line: number; ch: number },
    ) => {
      const fromOffset = editor.posToOffset(from);
      const toOffset = editor.posToOffset(to);
      text = text.slice(0, fromOffset) + replacement + text.slice(toOffset);
    },
    getRange: (
      from: { line: number; ch: number },
      to: { line: number; ch: number },
    ) => text.slice(editor.posToOffset(from), editor.posToOffset(to)),
    transaction: (tx: any) => {
      const changes = [...tx.changes].sort(
        (a, b) => editor.posToOffset(b.from) - editor.posToOffset(a.from),
      );
      for (const change of changes) {
        editor.replaceRange(change.text, change.from, change.to || change.from);
      }
      if (tx.selections) {
        editor.setSelections(tx.selections);
      }
    },
    lastLine: () => text.split("\n").length - 1,
    lineCount: () => text.split("\n").length,
    getAllFoldedLines: params.getAllFoldedLines || (() => []),
    fold: (): void => undefined,
    unfold: (): void => undefined,
  };

  return editor;
}

export function makeLogger(): Logger {
  const log = jest.fn();

  const logger: any = {
    log,
    bind: jest
      .fn()
      .mockImplementation((method: string) => log.bind(null, method)),
  };

  return logger;
}

export function makeSettings(): Settings {
  const settings: any = {
    stickCursor: "bullet-and-checkbox",
    freeIndentation: true,
  };
  return settings;
}

export function makeRoot(options: {
  editor: MyEditor;
  settings?: Settings;
  logger?: Logger;
}) {
  const { logger, editor, settings } = {
    logger: makeLogger(),
    settings: makeSettings(),
    ...options,
  };

  return new Parser(logger, settings).parse(editor);
}
