/**
 * Owned concern: provide deterministic regex iteration for markdown parser subcomponents.
 *
 * This module centralizes stateful RegExp iteration so parser helpers do not
 * each own lastIndex reset behavior.
 */
export function forEachRegexMatch(
  pattern: RegExp,
  content: string,
  callback: (match: RegExpExecArray) => void
): void {
  pattern.lastIndex = 0;

  let match = pattern.exec(content);
  while (match !== null) {
    callback(match);
    match = pattern.exec(content);
  }
}
