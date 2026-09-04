import { MyEditor, MyEditorPosition } from "../editor";

const bulletSignRe = `(?:[-*+]|\\d+\\.)`;
const optionalCheckboxRe = `(?:\\[[^\\[\\]]\\][ \t]?)?`;

// The indent, including the blockquote and the callout markers, so that items
// inside a quote are toggled as well.
const prefixRe = `([ \t]*(?:>[ \t]*)*)`;
const listItemRe = new RegExp(
  `^${prefixRe}(${bulletSignRe}[ \t]+)(${optionalCheckboxRe})`,
);
const anyLineRe = new RegExp(`^${prefixRe}`);

const uncheckedCheckbox = `[ ] `;
const defaultBullet = `- `;

interface ParsedLine {
  line: number;
  // The position where the bullet starts, right after the indent and the
  // blockquote markers.
  bulletCh: number;
  // The position where the checkbox starts or would be inserted.
  ch: number;
  bullet: string;
  checkbox: string;
  isBlank: boolean;
}

interface LineChange {
  line: number;
  ch: number;
  removedLength: number;
  insertedText: string;
}

function parseLine(editor: MyEditor, line: number): ParsedLine {
  const lineText = editor.getLine(line);
  const listItemMatches = listItemRe.exec(lineText);

  if (listItemMatches) {
    const [, prefix, bullet, checkbox] = listItemMatches;

    return {
      line,
      bulletCh: prefix.length,
      ch: prefix.length + bullet.length,
      bullet,
      checkbox,
      isBlank: false,
    };
  }

  const [prefix] = anyLineRe.exec(lineText);

  return {
    line,
    bulletCh: prefix.length,
    ch: prefix.length,
    bullet: "",
    checkbox: "",
    isBlank: lineText.trim().length === 0,
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
    const isMultilineSelection = lastLine > from.line;

    for (let line = from.line; line <= lastLine; line++) {
      if (lines.some((l) => l.line === line)) {
        continue;
      }

      const parsedLine = parseLine(editor, line);

      // Blank lines within a bigger selection are skipped, but a cursor on a
      // blank line still turns it into a checkbox item.
      if (parsedLine.isBlank && isMultilineSelection) {
        continue;
      }

      lines.push(parsedLine);
    }
  }

  return lines;
}

function calculateChanges(lines: ParsedLine[]): LineChange[] {
  const changes: LineChange[] = [];

  // The checkboxes are removed only when every affected item has one,
  // otherwise the missing ones are added, like the built-in list toggles do.
  const shouldRemove = lines.every((l) => l.checkbox.length > 0);

  for (const { line, bulletCh, ch, bullet, checkbox } of lines) {
    if (shouldRemove) {
      // The bullet goes away together with the checkbox, so the item toggles
      // between a checkbox and a plain line.
      changes.push({
        line,
        ch: bulletCh,
        removedLength: bullet.length + checkbox.length,
        insertedText: "",
      });
    } else if (!checkbox) {
      changes.push({
        line,
        ch,
        removedLength: 0,
        insertedText: bullet
          ? uncheckedCheckbox
          : defaultBullet + uncheckedCheckbox,
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
 * Turns every line under the selections into a checkbox item, or back into a
 * plain line if every one of them is a checkbox item already. The bullet is
 * added and removed together with the checkbox.
 *
 * Returns true if something was changed.
 */
export function toggleCheckbox(editor: MyEditor): boolean {
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
