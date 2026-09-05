import { alertListItemRe, alertMarker } from "./alertRe";

import { MyEditor, MyEditorPosition } from "../editor";

interface ParsedLine {
  line: number;
  // The position where the "!" starts or would be inserted, right after the
  // bullet and the optional checkbox.
  ch: number;
  // The "!" together with the whitespace after it, empty when the item is not
  // an alert yet.
  marker: string;
}

interface LineChange {
  line: number;
  ch: number;
  removedLength: number;
  insertedText: string;
}

function parseLine(editor: MyEditor, line: number): ParsedLine | null {
  const matches = alertListItemRe.exec(editor.getLine(line));

  // Lines that aren't list items are left alone.
  if (!matches) {
    return null;
  }

  const [, prefix, bullet, marker] = matches;

  return {
    line,
    ch: prefix.length + bullet.length,
    marker: marker || "",
  };
}

function getLinesUnderSelections(editor: MyEditor): ParsedLine[] {
  const lines: ParsedLine[] = [];

  for (const { anchor, head } of editor.listSelections()) {
    const from = anchor.line < head.line ? anchor : head;
    const to = anchor.line < head.line ? head : anchor;

    // The last line is not really selected if the selection ends at its very
    // beginning.
    const lastLine = to.line > from.line && to.ch === 0 ? to.line - 1 : to.line;

    for (let line = from.line; line <= lastLine; line++) {
      if (lines.some((l) => l.line === line)) {
        continue;
      }

      const parsedLine = parseLine(editor, line);

      if (parsedLine) {
        lines.push(parsedLine);
      }
    }
  }

  return lines;
}

function calculateChanges(lines: ParsedLine[]): LineChange[] {
  if (lines.length === 0) {
    return [];
  }

  // The marker is removed only when every affected item has one, otherwise the
  // missing ones are added, like the checkbox toggle does.
  const shouldRemove = lines.every((l) => l.marker.length > 0);

  const changes: LineChange[] = [];

  for (const { line, ch, marker } of lines) {
    if (shouldRemove) {
      changes.push({
        line,
        ch,
        removedLength: marker.length,
        insertedText: "",
      });
    } else if (!marker) {
      changes.push({
        line,
        ch,
        removedLength: 0,
        insertedText: alertMarker,
      });
    }
  }

  return changes;
}

function movePosition(
  position: MyEditorPosition,
  changes: LineChange[],
): MyEditorPosition {
  const change = changes.find((c) => c.line === position.line);

  if (!change || position.ch < change.ch) {
    return position;
  }

  const delta = change.insertedText.length - change.removedLength;

  return {
    line: position.line,
    ch: Math.max(change.ch, position.ch + delta),
  };
}

/**
 * Marks every list item under the selections as an alert by putting a "!" in
 * front of its text, or removes the "!" again if every one of them has it.
 *
 * Returns true if something was changed.
 */
export function toggleAlert(editor: MyEditor): boolean {
  const changes = calculateChanges(getLinesUnderSelections(editor));

  if (changes.length === 0) {
    return false;
  }

  editor.transaction({
    changes: changes.map(({ line, ch, removedLength, insertedText }) => ({
      from: { line, ch },
      to: { line, ch: ch + removedLength },
      text: insertedText,
    })),
    selections: editor.listSelections().map(({ anchor, head }) => ({
      anchor: movePosition(anchor, changes),
      head: movePosition(head, changes),
    })),
  });

  return true;
}
