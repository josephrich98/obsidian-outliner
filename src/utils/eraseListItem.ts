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

function eraseRange(
  editor: MyEditor,
  line: number,
  fromCh: number,
  tillCh: number,
) {
  editor.replaceRange("", { line, ch: fromCh }, { line, ch: tillCh });
  editor.setSelections([
    { anchor: { line, ch: fromCh }, head: { line, ch: fromCh } },
  ]);
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

  eraseRange(editor, item.line, 0, item.lineText.length);

  return true;
}

/**
 * Erases everything before the cursor on a list item line. The bullet and the
 * checkbox are erased as well, so with the cursor at the end of the line the
 * whole item turns into an empty line. With `keepMarker` the erasing stops at
 * the bullet and the checkbox, clearing the content only.
 *
 * Returns true if something was erased.
 */
export function eraseListItemTillCursor(
  editor: MyEditor,
  keepMarker = false,
): boolean {
  const cursor = getCursor(editor);

  if (!cursor) {
    return false;
  }

  const item = parseListItemUnderCursor(editor, cursor);

  if (!item) {
    return false;
  }

  const markerEndCh = item.contentStartCh + item.checkbox.length;

  // The cursor is inside the checkbox marker itself, erasing till the cursor
  // would leave a dangling checkbox behind.
  if (cursor.ch < markerEndCh) {
    return false;
  }

  // The marker is kept, so children and notes of the item stay attached to it.
  if (!keepMarker && hasChildrenOrNotes(editor, item)) {
    return false;
  }

  const eraseFromCh = keepMarker ? markerEndCh : 0;

  if (cursor.ch <= eraseFromCh) {
    return false;
  }

  eraseRange(editor, item.line, eraseFromCh, cursor.ch);

  return true;
}
