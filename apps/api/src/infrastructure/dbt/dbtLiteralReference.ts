/** Owned concern: recognize the existing literal dbt reference expression subset. */
const REF_LITERAL_PATTERN = /^\s*ref\s*\(\s*(['"])([^'"]+)\1(?:\s*,\s*(['"])([^'"]+)\3)?\s*\)\s*$/u;
const SOURCE_LITERAL_PATTERN =
  /^\s*source\s*\(\s*(['"])([^'"]+)\1\s*,\s*(['"])([^'"]+)\3\s*\)\s*$/u;

type DbtLiteralReference =
  | Readonly<{ kind: 'ref'; name: string; packageName?: string }>
  | Readonly<{ kind: 'source'; sourceName: string; name: string }>;

export function readDbtLiteralReference(expression: string): DbtLiteralReference | null {
  const refMatch = REF_LITERAL_PATTERN.exec(expression);
  if (refMatch?.[2] !== undefined) {
    return refMatch[4] === undefined
      ? { kind: 'ref', name: refMatch[2] }
      : { kind: 'ref', name: refMatch[4], packageName: refMatch[2] };
  }
  const sourceMatch = SOURCE_LITERAL_PATTERN.exec(expression);
  return sourceMatch?.[2] !== undefined && sourceMatch[4] !== undefined
    ? { kind: 'source', sourceName: sourceMatch[2], name: sourceMatch[4] }
    : null;
}
