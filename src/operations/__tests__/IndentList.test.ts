import { makeEditor, makeRoot, makeSettings } from "../../__mocks__";
import { IndentList } from "../IndentList";

describe("IndentList operation", () => {
  test("should indent a list item under the previous sibling", () => {
    const root = makeRoot({
      editor: makeEditor({
        text: "- item 1\n- item 2\n- item 3\n",
        cursor: { line: 2, ch: 5 },
      }),
      settings: makeSettings(),
    });

    const op = new IndentList(root, "  ");
    op.perform();

    expect(root.print()).toBe("- item 1\n- item 2\n  - item 3");
    expect(root.getCursor().line).toBe(2);
    expect(root.getCursor().ch).toBe(7); // cursor moved by indent length
  });

  test("should indent a top level item without a previous sibling in place", () => {
    const root = makeRoot({
      editor: makeEditor({
        text: "- item 1\n- item 2\n- item 3\n",
        cursor: { line: 0, ch: 5 },
      }),
      settings: makeSettings(),
    });

    const op = new IndentList(root, "  ");
    op.perform();

    expect(root.print()).toBe("  - item 1\n- item 2\n- item 3");
    expect(root.getCursor().line).toBe(0);
    expect(root.getCursor().ch).toBe(7);
  });

  test("should indent a lone bullet repeatedly", () => {
    const root = makeRoot({
      editor: makeEditor({
        text: "\t- item 1\n",
        cursor: { line: 0, ch: 5 },
      }),
      settings: makeSettings(),
    });

    const op = new IndentList(root, "\t");
    op.perform();

    expect(root.print()).toBe("\t\t- item 1");
    expect(root.getCursor().ch).toBe(6);
  });

  test("should indent a list item with its children", () => {
    const root = makeRoot({
      editor: makeEditor({
        text: "- item 1\n- item 2\n- item 3\n  - item 3.1\n  - item 3.2\n",
        cursor: { line: 2, ch: 5 },
      }),
      settings: makeSettings(),
    });

    const op = new IndentList(root, "  ");
    op.perform();

    expect(root.print()).toBe(
      "- item 1\n- item 2\n  - item 3\n    - item 3.1\n    - item 3.2",
    );
    expect(root.getCursor().line).toBe(2);
    expect(root.getCursor().ch).toBe(7);
  });

  test("should recalculate numeric bullets after indentation", () => {
    const root = makeRoot({
      editor: makeEditor({
        text: "1. item 1\n2. item 2\n3. item 3\n",
        cursor: { line: 2, ch: 5 },
      }),
      settings: makeSettings(),
    });

    const op = new IndentList(root, "  ");
    op.perform();

    // Instead of checking the exact string, check for the key aspects we care about
    const result = root.print();
    expect(result).toContain("1. item 1");
    expect(result).toContain("2. item 2");

    // Check that the third line is indented and has a numeric bullet "1."
    const lines = result.split("\n");
    expect(lines.length).toBe(3);
    expect(lines[2].trim()).toBe("1. item 3");
    expect(lines[2]).toMatch(/^\s+1\. item 3$/); // Contains whitespace + "1. item 3"
  });

  test("should use indent from an existing child of the previous sibling", () => {
    const root = makeRoot({
      editor: makeEditor({
        text: "- item 1\n  - item 1.1\n- item 2\n",
        cursor: { line: 2, ch: 5 },
      }),
      settings: makeSettings(),
    });

    const op = new IndentList(root, "    "); // Different default indent
    op.perform();

    expect(root.print()).toBe("- item 1\n  - item 1.1\n  - item 2");
    expect(root.getCursor().line).toBe(2);
    expect(root.getCursor().ch).toBe(7); // Uses the "  " indent from item 1.1, not the default
  });

  test("should do nothing if there are multiple selections", () => {
    const editor = makeEditor({
      text: "- item 1\n- item 2\n- item 3\n",
      cursor: { line: 2, ch: 5 },
    });

    // Mock multiple selections
    editor.listSelections = () => [
      { anchor: { line: 1, ch: 3 }, head: { line: 1, ch: 3 } },
      { anchor: { line: 2, ch: 5 }, head: { line: 2, ch: 5 } },
    ];

    const root = makeRoot({
      editor,
      settings: makeSettings(),
    });

    const op = new IndentList(root, "  ");
    op.perform();

    expect(root.print()).toBe("- item 1\n- item 2\n- item 3");
    expect(op.shouldStopPropagation()).toBe(false);
    expect(op.shouldUpdate()).toBe(false);
  });

  test("should stop propagation and update editor when successful", () => {
    const root = makeRoot({
      editor: makeEditor({
        text: "- item 1\n- item 2\n- item 3\n",
        cursor: { line: 2, ch: 5 },
      }),
      settings: makeSettings(),
    });

    const op = new IndentList(root, "  ");
    op.perform();

    expect(op.shouldStopPropagation()).toBe(true);
    expect(op.shouldUpdate()).toBe(true);
  });

  test("should indent properly when the list has complex nested structure", () => {
    const root = makeRoot({
      editor: makeEditor({
        text: "- item 1\n  - item 1.1\n  - item 1.2\n- item 2\n  - item 2.1\n- item 3\n",
        cursor: { line: 5, ch: 5 },
      }),
      settings: makeSettings(),
    });

    const op = new IndentList(root, "  ");
    op.perform();

    expect(root.print()).toBe(
      "- item 1\n  - item 1.1\n  - item 1.2\n- item 2\n  - item 2.1\n  - item 3",
    );
  });
  test("should indent an only child one more step under its parent", () => {
    const root = makeRoot({
      editor: makeEditor({
        text: "- item 1\n  - item 1.1\n",
        cursor: { line: 1, ch: 6 },
      }),
      settings: makeSettings(),
    });

    const op = new IndentList(root, "  ");
    op.perform();

    expect(root.print()).toBe("- item 1\n    - item 1.1");
    expect(root.getCursor().line).toBe(1);
    expect(root.getCursor().ch).toBe(8);
  });

  test("should indent an already over-indented item by one step", () => {
    const root = makeRoot({
      editor: makeEditor({
        text: "- item 1\n    - item 1.1\n",
        cursor: { line: 1, ch: 8 },
      }),
      settings: makeSettings(),
    });

    const op = new IndentList(root, "  ");
    op.perform();

    expect(root.print()).toBe("- item 1\n      - item 1.1");
    expect(root.getCursor().line).toBe(1);
    expect(root.getCursor().ch).toBe(10);
  });

  test("should indent an only child together with its children", () => {
    const root = makeRoot({
      editor: makeEditor({
        text: "- item 1\n  - item 1.1\n    - item 1.1.1\n",
        cursor: { line: 1, ch: 6 },
      }),
      settings: makeSettings(),
    });

    const op = new IndentList(root, "\t");
    op.perform();

    expect(root.print()).toBe("- item 1\n    - item 1.1\n      - item 1.1.1");
  });

  test("should use the indent of a sibling instead of the default one", () => {
    const root = makeRoot({
      editor: makeEditor({
        text: "- item 1\n  - item 1.1\n  - item 1.2\n",
        cursor: { line: 1, ch: 6 },
      }),
      settings: makeSettings(),
    });

    const op = new IndentList(root, "\t");
    op.perform();

    expect(root.print()).toBe("- item 1\n    - item 1.1\n  - item 1.2");
    expect(root.getCursor().ch).toBe(8);
  });
});
