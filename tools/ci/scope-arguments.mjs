/** @ownedConcern Parse the one explicit full-scope request without changing event identity. */
export function parseScopeArguments(args) {
  if (Array.isArray(args) && args.length === 0) return { full: false };
  if (Array.isArray(args) && args.length === 1 && args[0] === '--full') return { full: true };
  throw new TypeError('SCOPE_ARGUMENTS_NOT_SUPPORTED');
}
