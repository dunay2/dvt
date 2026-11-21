import { describe, expect, it } from 'vitest';

import { validateSnowflakeTaskSql } from './operationSqlSyntax';

const task = [
  'CREATE OR REPLACE TASK tarea',
  '  WAREHOUSE = small',
  "  SCHEDULE = 'USING CRON 0 * * * * UTC'",
  'AS',
  '  SELECT 2',
  ';',
].join('\n');

describe('Snowflake task syntax', () => {
  it.each([
    task,
    'CREATE TASK alpha AS CALL next_step(); CREATE TASK beta AFTER alpha AS SELECT 1;',
    'CREATE TASK alpha AS BEGIN SELECT 1; END;',
  ])('accepts valid Snowflake SQL, including task bodies and graphs', (source) => {
    expect(validateSnowflakeTaskSql(source)).toEqual({ kind: 'valid' });
  });

  it('reports the leftover text in the edited task on the correct line', () => {
    const result = validateSnowflakeTaskSql(task + "P'K");
    expect(result).toMatchObject({
      kind: 'invalid',
      diagnostics: [{ line: 6, column: 2, startOffset: task.length }],
    });
  });

  it('reports malformed SQL within the task body', () => {
    const result = validateSnowflakeTaskSql(task.replace('SELECT 2', 'SELECT FROM'));
    expect(result).toMatchObject({
      kind: 'invalid',
      diagnostics: [expect.objectContaining({ line: 5 })],
    });
  });

  it('maps code point columns to the visible UTF-16 offsets after a BOM and CRLF', () => {
    const prefix = "CREATE TASK alpha AS\r\nSELECT '💡'; ";
    expect(validateSnowflakeTaskSql('\uFEFF' + prefix + 'P`K')).toMatchObject({
      kind: 'invalid',
      diagnostics: expect.arrayContaining([
        expect.objectContaining({ line: 2, column: 14, startOffset: prefix.length }),
      ]),
    });
  });

  it('distinguishes a comment-only buffer from a successful syntax check', () => {
    expect(validateSnowflakeTaskSql('-- No task yet')).toEqual({ kind: 'empty' });
  });
});
