import { Editor, Plugin } from "obsidian";

import { Feature } from "./Feature";

import { MyEditor } from "../editor";
import { toggleAlert } from "../utils/toggleAlert";

export class ListsAlertCommands implements Feature {
  constructor(private plugin: Plugin) {}

  async load() {
    this.plugin.addCommand({
      id: "toggle-alert",
      icon: "alert-triangle",
      name: "Toggle alert",
      editorCallback: (editor: Editor) => {
        toggleAlert(new MyEditor(editor));
      },
      hotkeys: [],
    });
  }

  async unload() {}
}
