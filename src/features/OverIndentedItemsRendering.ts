import { Plugin } from "obsidian";

import { syntaxTree } from "@codemirror/language";
import { EditorState, RangeSetBuilder } from "@codemirror/state";
import {
  Decoration,
  DecorationSet,
  EditorView,
  PluginValue,
  ViewPlugin,
  ViewUpdate,
  WidgetType,
} from "@codemirror/view";

import { Feature } from "./Feature";

const LINE_CLASS = "outliner-plugin-over-indented-line";

// indent, bullet, space after the bullet, optional checkbox with its char
const listItemRe = /^([ \t]+)([-*+]|\d+\.)([ \t])(?:\[([^[\]])\][ \t])?/;

/**
 * The checkbox Obsidian itself draws in Live Preview, so that the themes
 * style it the same way. Clicking it toggles the character between the
 * brackets.
 */
class CheckboxWidget extends WidgetType {
  constructor(private char: string) {
    super();
  }

  eq(other: CheckboxWidget) {
    return other.char === this.char;
  }

  toDOM(view: EditorView) {
    const label = document.createElement("label");
    label.className = "task-list-label";

    const input = document.createElement("input");
    input.type = "checkbox";
    input.className = "task-list-item-checkbox";
    input.setAttribute("data-task", this.char);
    input.checked = this.char !== " ";

    label.addEventListener("mousedown", (e) => e.preventDefault());
    input.addEventListener("input", () => {
      const line = view.state.doc.lineAt(view.posAtDOM(input));
      const i = line.text.search(/\[.\]/);

      if (i === -1) {
        return;
      }

      const from = line.from + i + 1;
      const char = line.text.charAt(i + 1);

      view.dispatch({
        changes: { from, to: from + 1, insert: char === " " ? "x" : " " },
      });
    });

    label.appendChild(input);

    return label;
  }

  ignoreEvent() {
    return true;
  }
}

function markOf(cls: string) {
  return Decoration.mark({ class: cls });
}

const ulFormatting = markOf(
  "cm-formatting cm-formatting-list cm-formatting-list-ul",
);
const olFormatting = markOf(
  "cm-formatting cm-formatting-list cm-formatting-list-ol",
);
const taskFormatting = markOf("cm-formatting cm-formatting-task");
const bullet = markOf("list-bullet");
const listIndent = markOf("cm-hmd-list-indent");
const indentUnit = markOf("cm-indent");
const indentSpacing = markOf("cm-indent-spacing");

// Obsidian's Markdown mode always parses with a tab size of 4.
const OBSIDIAN_TAB_SIZE = 4;

/**
 * Splits the indent the way Obsidian does: a tab or four spaces make one
 * list level, the remaining spaces are plain spacing.
 */
function getIndentUnits(indent: string): { len: number; unit: boolean }[] {
  const units: { len: number; unit: boolean }[] = [];
  let i = 0;

  while (i < indent.length) {
    let len = 1;

    if (indent[i] === " ") {
      while (len < OBSIDIAN_TAB_SIZE && indent[i + len] === " ") {
        len++;
      }
    }

    units.push({ len, unit: indent[i] === "\t" || len === OBSIDIAN_TAB_SIZE });
    i += len;
  }

  return units;
}

/**
 * Whether Obsidian already renders the list marker at the given position, in
 * which case there is nothing for us to do.
 */
function hasToken(state: EditorState, pos: number, token: string) {
  const node = syntaxTree(state).resolveInner(pos, 1);

  return node.name.split("_").includes(token);
}

function isLineSelected(state: EditorState, from: number, to: number) {
  return state.selection.ranges.some((r) => r.from <= to && r.to >= from);
}

class OverIndentedItemsPluginValue implements PluginValue {
  decorations: DecorationSet;

  constructor(view: EditorView) {
    this.decorations = this.buildDecorations(view);
  }

  update(update: ViewUpdate) {
    if (
      update.docChanged ||
      update.viewportChanged ||
      update.selectionSet ||
      syntaxTree(update.state) !== syntaxTree(update.startState)
    ) {
      this.decorations = this.buildDecorations(update.view);
    }
  }

  private buildDecorations(view: EditorView): DecorationSet {
    const builder = new RangeSetBuilder<Decoration>();
    const { state } = view;

    for (const { from, to } of view.visibleRanges) {
      let pos = from;

      while (pos <= to) {
        const line = state.doc.lineAt(pos);
        pos = line.to + 1;

        const matches = listItemRe.exec(line.text);

        if (!matches) {
          continue;
        }

        const [, indent, bulletSign, , checkboxChar] = matches;
        const bulletFrom = line.from + indent.length;
        const bulletTo = bulletFrom + bulletSign.length;
        const contentFrom = bulletTo + 1;

        if (hasToken(state, bulletFrom, "formatting-list")) {
          continue;
        }

        const isTask = checkboxChar !== undefined;
        const isOrdered = /\d/.test(bulletSign);
        // Like Obsidian, show the raw markup on the line being edited.
        const selected = isLineSelected(state, line.from, line.to);

        builder.add(
          line.from,
          line.from,
          Decoration.line({
            class: isTask ? `${LINE_CLASS} HyperMD-task-line` : LINE_CLASS,
            attributes: isTask ? { "data-task": checkboxChar } : undefined,
          }),
        );

        // Inside a list Obsidian already lays the indent out in list levels.
        // Elsewhere (an indented item with nothing above it) do it ourselves,
        // so that the item lines up with the regular items of that depth.
        if (!hasToken(state, line.from, "hmd-list-indent")) {
          builder.add(line.from, bulletFrom, listIndent);
          let unitFrom = line.from;
          for (const { len, unit } of getIndentUnits(indent)) {
            builder.add(
              unitFrom,
              unitFrom + len,
              unit ? indentUnit : indentSpacing,
            );
            unitFrom += len;
          }
        }

        if (isTask && !selected) {
          // The checkbox replaces "- [ ]", the space after it stays.
          builder.add(
            bulletFrom,
            contentFrom + 3,
            Decoration.replace({ widget: new CheckboxWidget(checkboxChar) }),
          );
          continue;
        }

        builder.add(
          bulletFrom,
          contentFrom,
          isOrdered ? olFormatting : ulFormatting,
        );

        if (isTask) {
          builder.add(contentFrom, contentFrom + 3, taskFormatting);
        } else if (!isOrdered && !selected) {
          builder.add(bulletFrom, bulletTo, bullet);
        }
      }
    }

    return builder.finish();
  }
}

/**
 * Markdown only nests a list item when it's indented at most three columns
 * past the content of the item above it. IndentList allows indenting further
 * than that, and Obsidian then renders the line as plain text (or as a code
 * block when there is nothing above it) instead of a bullet.
 *
 * This feature draws the bullet or the checkbox on such lines in Live
 * Preview, the way Obsidian draws them for regular items.
 */
export class OverIndentedItemsRendering implements Feature {
  constructor(private plugin: Plugin) {}

  async load() {
    this.plugin.registerEditorExtension(
      ViewPlugin.fromClass(OverIndentedItemsPluginValue, {
        decorations: (v) => v.decorations,
      }),
    );
  }

  async unload() {}
}
