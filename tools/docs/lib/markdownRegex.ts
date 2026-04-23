/**
 * @file tools/docs/lib/markdownRegex.ts
 * Shared regular-expression iterator for markdown parsing helpers.
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
