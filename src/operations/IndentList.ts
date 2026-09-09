import { Operation } from "./Operation";

import { Root, recalculateNumericBullets } from "../root";
import { getIndentChars } from "../utils/getIndentChars";

export class IndentList implements Operation {
  private stopPropagation = false;
  private updated = false;

  constructor(
    private root: Root,
    private defaultIndentChars: string,
    private freeIndentation = true,
  ) {}

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

    this.stopPropagation = true;

    const list = root.getListUnderCursor();
    const parent = list.getParent();
    const prev = parent.getPrevSiblingOf(list);

    // Without a previous sibling there is nothing to become a child of, but
    // the item can still be indented one more step in place, the way a plain
    // Markdown list indents, unless the user wants the strict outliner
    // behaviour.
    if (!prev && !this.freeIndentation) {
      return;
    }

    this.updated = true;

    const listStartLineBefore = root.getContentLinesRangeOf(list)[0];

    const indentPos = list.getFirstLineIndent().length;
    const indentChars = getIndentChars(
      list,
      parent,
      prev,
      this.defaultIndentChars,
    );

    if (prev) {
      parent.removeChild(list);
      prev.addAfterAll(list);
    }

    list.indentContent(indentPos, indentChars);

    const listStartLineAfter = root.getContentLinesRangeOf(list)[0];
    const lineDiff = listStartLineAfter - listStartLineBefore;

    const cursor = root.getCursor();
    root.replaceCursor({
      line: cursor.line + lineDiff,
      ch: cursor.ch + indentChars.length,
    });

    recalculateNumericBullets(root);
  }
}
