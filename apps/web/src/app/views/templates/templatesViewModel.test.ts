import { describe, expect, it } from 'vitest';

import {
  EXECUTION_TEMPLATE_CATALOG,
  resolveExecutionTemplatePreview,
  resolveExecutionTemplateSelection,
} from './templatesViewModel';

describe('templatesViewModel', () => {
  it('lists governed provider-facing template profiles', () => {
    expect(EXECUTION_TEMPLATE_CATALOG.map((template) => template.id)).toEqual([
      'snowflake-task',
      'snowflake-procedure',
      'etl-scaffold',
    ]);
    expect(EXECUTION_TEMPLATE_CATALOG.every((template) => template.parameters.length > 0)).toBe(
      true
    );
  });

  it('falls back to the first template when route state carries an unknown id', () => {
    const selected = resolveExecutionTemplateSelection('unknown-template');

    expect(selected.id).toBe('snowflake-task');
  });

  it('blocks preview with field-specific errors when required parameters are empty', () => {
    const selected = resolveExecutionTemplateSelection('snowflake-task');
    const preview = resolveExecutionTemplatePreview(selected, {
      taskName: '',
      schedule: 'USING CRON 0 * * * * UTC',
      warehouse: '',
      sqlBody: 'select 1',
    });

    expect(preview.kind).toBe('blocked');
    expect(preview.exportFileName).toBe('snowflake-task.sql');
    expect(preview.errors).toEqual([
      { parameterId: 'taskName', message: 'Task name is required.' },
      { parameterId: 'warehouse', message: 'Warehouse is required.' },
    ]);
  });

  it.each([
    ['without a terminator', 'call analytics.load_orders()'],
    ['with one terminator', 'call analytics.load_orders();'],
    ['with repeated terminators', 'call analytics.load_orders();;;   '],
  ])('normalizes Snowflake task SQL %s', (_case, sqlBody) => {
    const selected = resolveExecutionTemplateSelection('snowflake-task');
    const preview = resolveExecutionTemplatePreview(selected, {
      taskName: 'load_orders',
      schedule: 'USING CRON 0 * * * * UTC',
      warehouse: 'transforming_wh',
      sqlBody,
    });

    expect(preview).toEqual({
      kind: 'ready',
      errors: [],
      exportFileName: 'load_orders.task.sql',
      source: [
        'create or replace task load_orders',
        '  warehouse = transforming_wh',
        "  schedule = 'USING CRON 0 * * * * UTC'",
        'as',
        'call analytics.load_orders();',
      ].join('\n'),
    });
  });
});
