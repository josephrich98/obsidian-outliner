import { Editor, Plugin } from "obsidian";

import { Feature } from "./Feature";

import { MyEditor } from "../editor";
import { toggleCheckbox } from "../utils/toggleCheckbox";

export class ListsCheckboxCommands implements Feature {
  constructor(private plugin: Plugin) {}

  async load() {
    this.plugin.addCommand({
      id: "toggle-checkbox",
      icon: "check-square",
      name: "Toggle checkbox",
      editorCallback: (editor: Editor) => {
        toggleCheckbox(new MyEditor(editor));
      },
      hotkeys: [],
    });
  }

  async unload() {}
}
