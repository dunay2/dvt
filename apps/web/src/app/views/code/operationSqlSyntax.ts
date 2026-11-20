/** Owned concern: project grammar diagnostics into visible editor coordinates. */
import { parseSnowflake } from 'sqllens';

export type OperationSqlDiagnostic = Readonly<{
  line: number;
  column: number;
  message: string;
  startOffset: number;
  endOffset: number;
}>;

export type OperationSqlSyntaxResult =
  | Readonly<{ kind: 'valid' | 'empty' }>
  | Readonly<{ kind: 'invalid'; diagnostics: readonly OperationSqlDiagnostic[] }>;

export function validateSnowflakeTaskSql(source: string): OperationSqlSyntaxResult {
  const text = source.startsWith('\uFEFF') ? source.slice(1) : source;
  const parsed = parseSnowflake(text);
  if (parsed.diagnostics.length === 0) {
    return { kind: parsed.tree.getChildCount() > 1 ? 'valid' : 'empty' };
  }

  let nextOffset = 0;
  const lines = text.split('\n').map((line) => {
    const offset = nextOffset;
    nextOffset += line.length + 1;
    return { line, offset };
  });
  const diagnostics = [...parsed.diagnostics]
    .sort((left, right) => left.line - right.line || left.column - right.column)
    .slice(0, 20)
    .map(({ message, line, column, length }) => {
      const current = lines[line - 1];
      const before = Array.from(current?.line ?? '')
        .slice(0, column)
        .join('').length;
      const startOffset = (current?.offset ?? text.length) + before;
      return {
        line,
        column: before + 1,
        message,
        startOffset,
        endOffset: Math.min(startOffset + length, text.length),
      };
    });
  return { kind: 'invalid', diagnostics };
}
