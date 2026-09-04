import { MyEditor, MyEditorPosition } from "../editor";

const bulletSignRe = `(?:[-*+]|\\d+\\.)`;
const optionalCheckboxRe = `(?:\\[[^\\[\\]]\\][ \t]?)?`;

const listItemRe = new RegExp(
  `^([ \t]*)(${bulletSignRe})([ \t])(${optionalCheckboxRe})(.*)$`,
);

interface ParsedListItem {
  line: number;
  lineText: string;
  indent: string;
  checkbox: string;
  content: string;
  contentStartCh: number;
}

function getCursor(editor: MyEditor): MyEditorPosition | null {
  const selections = editor.listSelections();

  if (selections.length !== 1) {
    return null;
  }

  const { anchor, head } = selections[0];

  if (anchor.line !== head.line || anchor.ch !== head.ch) {
    return null;
  }

  return head;
}

function parseListItemUnderCursor(
  editor: MyEditor,
  cursor: MyEditorPosition,
): ParsedListItem | null {
  const { line } = cursor;
  const lineText = editor.getLine(line);
  const matches = listItemRe.exec(lineText);

  if (!matches) {
    return null;
  }

  const [, indent, bullet, spaceAfterBullet, checkbox, content] = matches;
  const contentStartCh =
    indent.length + bullet.length + spaceAfterBullet.length;

  // The cursor is somewhere before the bullet, backspace should work as usual.
  if (cursor.ch < contentStartCh) {
    return null;
  }

  return { line, lineText, indent, checkbox, content, contentStartCh };
}

// Erasing the bullet of an item that has children or notes would detach them
// from the list, so such items are left to the regular backspace behaviour.
function hasChildrenOrNotes(editor: MyEditor, item: ParsedListItem) {
  if (item.line >= editor.lastLine()) {
    return false;
  }

  const nextLineText = editor.getLine(item.line + 1);

  return (
    nextLineText.trim().length > 0 &&
    /^[ \t]*/.exec(nextLineText)[0].length > item.indent.length
  );
}

function eraseTill(editor: MyEditor, line: number, ch: number) {
  editor.replaceRange("", { line, ch: 0 }, { line, ch });
  editor.setSelections([{ anchor: { line, ch: 0 }, head: { line, ch: 0 } }]);
}

/**
 * Erases the bullet (and the checkbox, if any) of the empty list item under the
 * cursor, turning the line into an empty line instead of merging it with the
 * previous list item.
 *
 * Returns true if the line was erased.
 */
export function eraseEmptyListItem(editor: MyEditor): boolean {
  const cursor = getCursor(editor);

  if (!cursor) {
    return false;
  }

  const item = parseListItemUnderCursor(editor, cursor);

  if (
    !item ||
    item.content.trim().length > 0 ||
    hasChildrenOrNotes(editor, item)
  ) {
    return false;
  }

  eraseTill(editor, item.line, item.lineText.length);

  return true;
}

/**
 * Erases everything before the cursor on a list item line, including the
 * checkbox and the bullet. With the cursor at the end of the line it turns the
 * whole item into an empty line.
 *
 * Returns true if something was erased.
 */
export function eraseListItemTillCursor(editor: MyEditor): boolean {
  const cursor = getCursor(editor);

  if (!cursor) {
    return false;
  }

  const item = parseListItemUnderCursor(editor, cursor);

  if (!item || hasChildrenOrNotes(editor, item)) {
    return false;
  }

  // The cursor is inside the checkbox marker itself, erasing till the cursor
  // would leave a dangling checkbox behind.
  if (cursor.ch < item.contentStartCh + item.checkbox.length) {
    return false;
  }

  eraseTill(editor, item.line, cursor.ch);

  return true;
}
