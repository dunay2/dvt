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

  it('generates deterministic read-only Snowflake task source when required values are present', () => {
    const selected = resolveExecutionTemplateSelection('snowflake-task');
    const preview = resolveExecutionTemplatePreview(selected, {
      taskName: 'load_orders',
      schedule: 'USING CRON 0 * * * * UTC',
      warehouse: 'transforming_wh',
      sqlBody: 'call analytics.load_orders();',
    });

    expect(preview.kind).toBe('ready');
    if (preview.kind !== 'ready') {
      throw new Error('Expected ready template preview.');
    }

    expect(preview.exportFileName).toBe('load_orders.task.sql');
    expect(preview.source).toContain('create or replace task load_orders');
    expect(preview.source).toContain('warehouse = transforming_wh');
    expect(preview.source).toContain("schedule = 'USING CRON 0 * * * * UTC'");
    expect(preview.source).toContain('call analytics.load_orders();');
  });
});
