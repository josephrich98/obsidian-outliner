import { Operation } from "./Operation";

import { List, Root, recalculateNumericBullets } from "../root";
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
    const indentChars = this.freeIndentation
      ? getIndentChars(list, parent, prev, this.defaultIndentChars)
      : this.getOriginalIndentChars(list, parent, prev);

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

  // The indent detection as it was before the free indentation, kept as is
  // for the strict outliner behaviour.
  private getOriginalIndentChars(list: List, parent: List, prev: List) {
    let indentChars = "";

    if (indentChars === "" && !prev.isEmpty()) {
      indentChars = prev
        .getChildren()[0]
        .getFirstLineIndent()
        .slice(prev.getFirstLineIndent().length);
    }

    if (indentChars === "") {
      indentChars = list
        .getFirstLineIndent()
        .slice(parent.getFirstLineIndent().length);
    }

    if (indentChars === "" && !list.isEmpty()) {
      indentChars = list.getChildren()[0].getFirstLineIndent();
    }

    if (indentChars === "") {
      indentChars = this.defaultIndentChars;
    }

    return indentChars;
  }
}
