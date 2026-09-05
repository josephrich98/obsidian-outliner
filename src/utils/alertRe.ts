// An alert item is a list item whose text starts with "!":
//
//   - [ ] ! pay the rent
//   - ! don't forget
//
// The "!" has to be followed by whitespace or the end of the line, so that
// embeds like "- ![[image.png]]" are not mistaken for alerts.
const bulletSignRe = `(?:[-*+]|\\d+\\.)`;
const optionalCheckboxRe = `(?:\\[[^\\[\\]]\\][ \t]*)?`;

// The indent, including the blockquote and the callout markers, so that items
// inside a quote are recognised as well.
const prefixRe = `([ \t]*(?:>[ \t]*)*)`;

export const alertListItemRe = new RegExp(
  `^${prefixRe}(${bulletSignRe}[ \t]+${optionalCheckboxRe})(!(?:[ \t]+|$))?`,
);

export const alertMarker = `! `;

export function isAlertLine(lineText: string): boolean {
  const matches = alertListItemRe.exec(lineText);
  return matches !== null && matches[3] !== undefined;
}
