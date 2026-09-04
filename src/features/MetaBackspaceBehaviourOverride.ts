import { Plugin } from "obsidian";

import { keymap } from "@codemirror/view";

import { Feature } from "./Feature";

import { MyEditor } from "../editor";
import { DeleteTillCurrentLineContentStart } from "../operations/DeleteTillCurrentLineContentStart";
import { DeleteTillPreviousLineContentEnd } from "../operations/DeleteTillPreviousLineContentEnd";
import { IMEDetector } from "../services/IMEDetector";
import { OperationPerformer } from "../services/OperationPerformer";
import { Settings } from "../services/Settings";
import { createKeymapRunCallback } from "../utils/createKeymapRunCallback";
import {
  eraseCheckboxItemTillCursor,
  eraseEmptyListItem,
} from "../utils/eraseListItem";

export class MetaBackspaceBehaviourOverride implements Feature {
  constructor(
    private plugin: Plugin,
    private settings: Settings,
    private imeDetector: IMEDetector,
    private operationPerformer: OperationPerformer,
  ) {}

  async load() {
    this.plugin.registerEditorExtension(
      keymap.of([
        {
          mac: "m-Backspace",
          run: createKeymapRunCallback({
            check: this.check,
            run: this.run,
          }),
        },
      ]),
    );
  }

  async unload() {}

  private check = () => {
    return (
      this.settings.keepCursorWithinContent !== "never" &&
      !this.imeDetector.isOpened()
    );
  };

  private run = (editor: MyEditor) => {
    // An empty list item is erased instead of being merged with the previous
    // one, leaving an empty line behind.
    if (eraseEmptyListItem(editor)) {
      return { shouldUpdate: true, shouldStopPropagation: true };
    }

    // On a checkbox item the checkbox and the bullet are erased together with
    // the content, leaving an empty line.
    if (eraseCheckboxItemTillCursor(editor)) {
      return { shouldUpdate: true, shouldStopPropagation: true };
    }

    const res = this.operationPerformer.perform(
      (root) => new DeleteTillCurrentLineContentStart(root),
      editor,
    );

    if (res.shouldUpdate || res.shouldStopPropagation) {
      return res;
    }

    // The cursor is already at the content start, so behave like Backspace:
    // merge with the previous line or let Obsidian remove the bullet.
    return this.operationPerformer.perform(
      (root) => new DeleteTillPreviousLineContentEnd(root),
      editor,
    );
  };
}
