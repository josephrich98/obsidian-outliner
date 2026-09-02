import { Operation } from "./Operation";

import { Root } from "../root";

export class DeleteTillCurrentLineContentStart implements Operation {
  private stopPropagation = false;
  private updated = false;

  constructor(private root: Root) {}

  shouldStopPropagation() {
    return this.stopPropagation;
  }

  shouldUpdate() {
    return this.updated;
  }

  perform() {
    const { root } = this;

    if (!root.hasSingleCursor()) {
      return;
    }

    const cursor = root.getCursor();
    const list = root.getListUnderCursor();
    const lines = list.getLinesInfo();
    const lineNo = lines.findIndex((l) => l.from.line === cursor.line);

    if (cursor.ch <= lines[lineNo].from.ch) {
      // There is nothing to delete on the current line, let the caller decide
      // what to do next.
      return;
    }

    this.stopPropagation = true;
    this.updated = true;

    lines[lineNo].text = lines[lineNo].text.slice(
      cursor.ch - lines[lineNo].from.ch,
    );

    list.replaceLines(lines.map((l) => l.text));
    root.replaceCursor(lines[lineNo].from);
  }
}
