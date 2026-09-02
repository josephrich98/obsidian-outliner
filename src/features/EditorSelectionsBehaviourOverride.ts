import { Plugin } from "obsidian";

import { EditorState, Transaction, TransactionSpec } from "@codemirror/state";

import { Feature } from "./Feature";

import { StateReader } from "../editor/StateReader";
import { KeepCursorOutsideFoldedLines } from "../operations/KeepCursorOutsideFoldedLines";
import { KeepCursorWithinListContent } from "../operations/KeepCursorWithinListContent";
import { Parser } from "../services/Parser";
import { Settings } from "../services/Settings";

export class EditorSelectionsBehaviourOverride implements Feature {
  constructor(
    private plugin: Plugin,
    private settings: Settings,
    private parser: Parser,
  ) {}

  async load() {
    this.plugin.registerEditorExtension(
      EditorState.transactionFilter.of(this.transactionFilter),
    );
  }

  async unload() {}

  // Adjusting the selection inside a transaction filter means the corrected
  // cursor position is part of the very same transaction, so the editor never
  // renders the intermediate (pre-correction) position. Doing it afterwards
  // in a separate transaction causes a visible flash of the cursor at the
  // uncorrected position.
  private transactionFilter = (
    tr: Transaction,
  ): TransactionSpec | readonly TransactionSpec[] => {
    if (this.settings.keepCursorWithinContent === "never" || !tr.selection) {
      return tr;
    }

    const reader = new StateReader(tr.state);
    const root = this.parser.parse(reader);

    if (!root) {
      return tr;
    }

    // Filters are not re-applied to the spec a filter returns, so both
    // corrections have to happen in this single pass.
    const operations = [
      new KeepCursorOutsideFoldedLines(root),
      new KeepCursorWithinListContent(root),
    ];

    let updated = false;
    for (const op of operations) {
      op.perform();
      updated = updated || op.shouldUpdate();
    }

    if (!updated) {
      return tr;
    }

    return [
      tr,
      {
        selection: reader.toEditorSelection(root.getSelections()),
        sequential: true,
      },
    ];
  };
}
