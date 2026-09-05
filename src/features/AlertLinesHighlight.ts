import { Plugin } from "obsidian";

import { RangeSetBuilder } from "@codemirror/state";
import {
  Decoration,
  DecorationSet,
  EditorView,
  PluginValue,
  ViewPlugin,
  ViewUpdate,
} from "@codemirror/view";

import { Feature } from "./Feature";

import { isAlertLine } from "../utils/alertRe";

const ALERT_LINE_CLASS = "outliner-plugin-alert-line";

const alertLineDecoration = Decoration.line({ class: ALERT_LINE_CLASS });

class AlertLinesPluginValue implements PluginValue {
  decorations: DecorationSet;

  constructor(view: EditorView) {
    this.decorations = this.buildDecorations(view);
  }

  update(update: ViewUpdate) {
    if (update.docChanged || update.viewportChanged) {
      this.decorations = this.buildDecorations(update.view);
    }
  }

  private buildDecorations(view: EditorView): DecorationSet {
    const builder = new RangeSetBuilder<Decoration>();

    for (const { from, to } of view.visibleRanges) {
      let pos = from;

      while (pos <= to) {
        const line = view.state.doc.lineAt(pos);

        if (isAlertLine(line.text)) {
          builder.add(line.from, line.from, alertLineDecoration);
        }

        pos = line.to + 1;
      }
    }

    return builder.finish();
  }
}

/**
 * The text of the item itself, without the items nested under it, so that a
 * "!" on a child doesn't mark its parent.
 */
function getOwnText(li: HTMLElement): string {
  let text = "";

  const collect = (node: Node) => {
    for (const child of Array.from(node.childNodes)) {
      const tagName = (child as HTMLElement).tagName;

      if (tagName === "UL" || tagName === "OL") {
        continue;
      }

      if (child.nodeType === Node.TEXT_NODE) {
        text += child.textContent;
      } else {
        collect(child);
      }
    }
  };

  collect(li);

  return text.trim();
}

/**
 * Adds the `outliner-plugin-alert-line` class to the list items whose text
 * starts with a "!", both in Live Preview and in Reading View, so that CSS can
 * highlight them.
 */
export class AlertLinesHighlight implements Feature {
  constructor(private plugin: Plugin) {}

  async load() {
    this.plugin.registerEditorExtension(
      ViewPlugin.fromClass(AlertLinesPluginValue, {
        decorations: (v) => v.decorations,
      }),
    );

    this.plugin.registerMarkdownPostProcessor((el) => {
      for (const li of Array.from(el.querySelectorAll("li"))) {
        if (/^!(\s|$)/.test(getOwnText(li))) {
          li.classList.add(ALERT_LINE_CLASS);
        }
      }
    });
  }

  async unload() {}
}
