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

import { ObsidianSettings } from "../services/ObsidianSettings";
import { Settings } from "../services/Settings";

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

class OverIndentedItemsPluginValue implements PluginValue {
  decorations: DecorationSet;
  // The checkboxes, so that the cursor never lands inside the hidden markup.
  atomicRanges: DecorationSet = Decoration.none;
  private settingsChanged = false;

  constructor(
    private settings: Settings,
    private obsidianSettings: ObsidianSettings,
    private view: EditorView,
  ) {
    this.decorations = this.buildDecorations(view);
    this.settings.onChange(this.onSettingsChange);
  }

  destroy() {
    this.settings.removeCallback(this.onSettingsChange);
  }

  private onSettingsChange = () => {
    // An empty transaction is enough to get update() called.
    this.settingsChanged = true;
    this.view.dispatch({});
  };

  update(update: ViewUpdate) {
    if (
      this.settingsChanged ||
      update.docChanged ||
      update.viewportChanged ||
      syntaxTree(update.state) !== syntaxTree(update.startState)
    ) {
      this.settingsChanged = false;
      this.decorations = this.buildDecorations(update.view);
    }
  }

  private buildDecorations(view: EditorView): DecorationSet {
    const builder = new RangeSetBuilder<Decoration>();
    const atomicBuilder = new RangeSetBuilder<Decoration>();
    const { state } = view;

    this.atomicRanges = Decoration.none;

    if (!this.settings.freeIndentation) {
      return builder.finish();
    }
    // With the guides off Obsidian leaves the indent as raw whitespace, and
    // the list levels are simply as wide as the tabs or spaces are.
    const layOutIndent = this.obsidianSettings.isIndentGuideShown();

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
        if (layOutIndent && !hasToken(state, line.from, "hmd-list-indent")) {
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

        if (isTask) {
          // The checkbox replaces "- [ ]", the space after it stays.
          const checkbox = Decoration.replace({
            widget: new CheckboxWidget(checkboxChar),
          });
          builder.add(bulletFrom, contentFrom + 3, checkbox);
          atomicBuilder.add(bulletFrom, contentFrom + 3, checkbox);
          continue;
        }

        builder.add(
          bulletFrom,
          contentFrom,
          isOrdered ? olFormatting : ulFormatting,
        );

        if (!isOrdered) {
          builder.add(bulletFrom, bulletTo, bullet);
        }
      }
    }

    this.atomicRanges = atomicBuilder.finish();

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
  constructor(
    private plugin: Plugin,
    private settings: Settings,
    private obsidianSettings: ObsidianSettings,
  ) {}

  async load() {
    this.plugin.registerEditorExtension(
      ViewPlugin.define(
        (view) =>
          new OverIndentedItemsPluginValue(
            this.settings,
            this.obsidianSettings,
            view,
          ),
        {
          decorations: (v) => v.decorations,
          provide: (plugin) =>
            EditorView.atomicRanges.of(
              (view) => view.plugin(plugin)?.atomicRanges ?? Decoration.none,
            ),
        },
      ),
    );
  }

  async unload() {}
}
