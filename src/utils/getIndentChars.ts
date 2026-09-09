import { List } from "../root";

/**
 * Detects the indent chars of a single indentation step around the given list.
 *
 * The document itself is the best source of truth: the indent used by the
 * item's siblings or children is preferred over the editor default, so that
 * indenting doesn't mix tabs and spaces in an existing list.
 */
export function getIndentChars(
  list: List,
  parent: List,
  prev: List | null,
  defaultIndentChars: string,
): string {
  const parentIndentLength = parent.getFirstLineIndent().length;

  if (prev && !prev.isEmpty()) {
    const indentChars = prev
      .getChildren()[0]
      .getFirstLineIndent()
      .slice(prev.getFirstLineIndent().length);

    if (indentChars !== "") {
      return indentChars;
    }
  }

  for (const sibling of parent.getChildren()) {
    if (sibling === list) {
      continue;
    }

    const siblingIndent = sibling.getFirstLineIndent();

    if (siblingIndent.length > parentIndentLength) {
      return siblingIndent.slice(parentIndentLength);
    }
  }

  if (!list.isEmpty()) {
    const indentChars = list
      .getChildren()[0]
      .getFirstLineIndent()
      .slice(list.getFirstLineIndent().length);

    if (indentChars !== "") {
      return indentChars;
    }
  }

  return defaultIndentChars;
}
