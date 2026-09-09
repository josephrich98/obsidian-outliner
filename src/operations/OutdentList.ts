import { Operation } from "./Operation";

import { List, Root, recalculateNumericBullets } from "../root";
import { getIndentChars } from "../utils/getIndentChars";

export class OutdentList implements Operation {
  private stopPropagation = false;
  private updated = false;

  constructor(
    private root: Root,
    private defaultIndentChars = "",
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
    const grandParent = parent.getParent();

    // An item indented deeper than one step below its parent (see IndentList)
    // is pulled back one step at a time instead of jumping to the parent level
    // at once.
    const outdentStep = this.getOutdentStep(list, parent);

    if (outdentStep !== null) {
      this.updated = true;

      const indentRmTill = list.getFirstLineIndent().length;
      const indentRmFrom = indentRmTill - outdentStep.length;

      list.unindentContent(indentRmFrom, indentRmTill);

      const cursor = root.getCursor();
      root.replaceCursor({
        line: cursor.line,
        ch: cursor.ch - outdentStep.length,
      });

      recalculateNumericBullets(root);

      return;
    }

    // A top level item has nowhere to move up to, but it can still carry an
    // indent of its own (see IndentList), which is removed instead.
    if (!grandParent) {
      const indentRmTill = list.getFirstLineIndent().length;

      if (indentRmTill === 0) {
        return;
      }

      this.updated = true;

      list.unindentContent(0, indentRmTill);

      const cursor = root.getCursor();
      root.replaceCursor({
        line: cursor.line,
        ch: cursor.ch - indentRmTill,
      });

      recalculateNumericBullets(root);

      return;
    }

    this.updated = true;

    const listStartLineBefore = root.getContentLinesRangeOf(list)[0];
    const indentRmFrom = parent.getFirstLineIndent().length;
    const indentRmTill = list.getFirstLineIndent().length;

    parent.removeChild(list);
    grandParent.addAfter(parent, list);
    list.unindentContent(indentRmFrom, indentRmTill);

    const listStartLineAfter = root.getContentLinesRangeOf(list)[0];
    const lineDiff = listStartLineAfter - listStartLineBefore;
    const chDiff = indentRmTill - indentRmFrom;

    const cursor = root.getCursor();
    root.replaceCursor({
      line: cursor.line + lineDiff,
      ch: cursor.ch - chDiff,
    });

    recalculateNumericBullets(root);
  }

  /**
   * Returns the indent chars to remove when the list is indented deeper than
   * one step below its parent, or null when it sits exactly one step below it
   * and should be moved up the tree instead.
   */
  private getOutdentStep(list: List, parent: List): string | null {
    const parentIndentLength = parent.getFirstLineIndent().length;
    const listIndent = list.getFirstLineIndent();
    const step = getIndentChars(list, parent, null, this.defaultIndentChars);

    if (step === "" || listIndent.length - step.length <= parentIndentLength) {
      return null;
    }

    return listIndent.slice(listIndent.length - step.length);
  }
}
