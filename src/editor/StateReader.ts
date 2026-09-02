import { foldedRanges } from "@codemirror/language";
import { EditorSelection, EditorState } from "@codemirror/state";

import { MyEditorPosition, MyEditorSelection } from "./index";

import { Range } from "../root";
import { Reader } from "../services/Parser";

/**
 * A Parser-compatible reader backed by a plain EditorState rather than an
 * Obsidian Editor. Useful inside CodeMirror transaction filters, where the
 * transaction's resulting state is available but has not been applied to the
 * view yet.
 */
export class StateReader implements Reader {
  constructor(private state: EditorState) {}

  getCursor(): MyEditorPosition {
    return this.offsetToPos(this.state.selection.main.head);
  }

  getLine(n: number): string {
    return this.state.doc.line(n + 1).text;
  }

  lastLine(): number {
    return this.state.doc.lines - 1;
  }

  listSelections(): MyEditorSelection[] {
    return this.state.selection.ranges.map((r) => ({
      anchor: this.offsetToPos(r.anchor),
      head: this.offsetToPos(r.head),
    }));
  }

  getAllFoldedLines(): number[] {
    const c = foldedRanges(this.state).iter();
    const res: number[] = [];
    while (c.value) {
      res.push(this.offsetToPos(c.from).line);
      c.next();
    }
    return res;
  }

  toEditorSelection(ranges: Range[]): EditorSelection {
    return EditorSelection.create(
      ranges.map((r) =>
        EditorSelection.range(
          this.posToOffset(r.anchor),
          this.posToOffset(r.head),
        ),
      ),
    );
  }

  offsetToPos(offset: number): MyEditorPosition {
    const line = this.state.doc.lineAt(offset);
    return { line: line.number - 1, ch: offset - line.from };
  }

  posToOffset(pos: MyEditorPosition): number {
    const line = this.state.doc.line(pos.line + 1);
    return line.from + Math.min(pos.ch, line.length);
  }
}
