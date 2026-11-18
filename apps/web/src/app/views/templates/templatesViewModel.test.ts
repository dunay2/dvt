import { describe, expect, it } from 'vitest';

import {
  EXECUTION_TEMPLATE_CATALOG,
  createDefaultExecutionTemplateValues,
  localizeExecutionTemplate,
  resolveExecutionTemplatePreview,
  resolveExecutionTemplateSelection,
} from './templatesViewModel';

describe('templatesViewModel', () => {
  it('lists governed provider-facing template profiles', () => {
    expect(EXECUTION_TEMPLATE_CATALOG.map((template) => template.id)).toEqual(
      expect.arrayContaining([
        'snowflake-task',
        'snowflake-procedure',
        'etl-scaffold',
        'task-chain',
        'task-diamond',
        'stage-replace',
        'incremental-merge',
        'audit-series',
        'calendar',
        'comparable-periods',
        'latest-record',
        'missing-days',
      ])
    );
    expect(new Set(EXECUTION_TEMPLATE_CATALOG.map((template) => template.id)).size).toBe(
      EXECUTION_TEMPLATE_CATALOG.length
    );
    expect(EXECUTION_TEMPLATE_CATALOG.every((template) => template.parameters.length > 0)).toBe(
      true
    );
  });

  it('renders every new Git recipe with its declared parameters and leaves dbt untouched', () => {
    for (const template of EXECUTION_TEMPLATE_CATALOG.slice(3)) {
      const values = createDefaultExecutionTemplateValues(template);
      if (template.id === 'inspect-relation') values.modelRelation = '"sales"."daily"';
      const preview = resolveExecutionTemplatePreview(template, values);
      expect(preview.kind, template.id).toBe('ready');
      if (preview.kind === 'ready') expect(preview.source).not.toMatch(/\[\[\w/);
    }
    const latest = resolveExecutionTemplateSelection('latest-record');
    const sql = "select * from {{ ref('my_model') }} where id = 2";
    expect(resolveExecutionTemplatePreview(latest, {}, sql)).toMatchObject({
      kind: 'ready',
      source: sql,
    });
    expect(resolveExecutionTemplatePreview(latest, {}, 'select [[missing]]')).toMatchObject({
      kind: 'blocked',
      errors: [{ parameterId: 'source' }],
    });
    expect(resolveExecutionTemplatePreview(latest, {}, 'select [[missing')).toMatchObject({
      kind: 'blocked',
    });
  });

  it('requires an identified physical relation and a bounded integer for PostgreSQL inspection', () => {
    const profile = resolveExecutionTemplateSelection('inspect-relation');
    const values = { modelRelation: '"Regional Sales"."Order"', rowLimit: '25' };
    expect(resolveExecutionTemplatePreview(profile, values)).toMatchObject({
      kind: 'ready',
      source: 'select *\nfrom "Regional Sales"."Order"\nfetch first 25 rows only',
    });
    for (const rowLimit of ['0', '1001', '-1', '1.5', '1; select 2']) {
      expect(resolveExecutionTemplatePreview(profile, { ...values, rowLimit })).toMatchObject({
        kind: 'blocked',
        errors: [{ parameterId: 'rowLimit' }],
      });
    }
    expect(resolveExecutionTemplatePreview(profile, {})).toMatchObject({
      kind: 'blocked',
      errors: [{ parameterId: 'modelRelation' }],
    });
  });

  it('validates calendar bounds, relation identifiers and cleanup operations', () => {
    const calendar = resolveExecutionTemplateSelection('calendar');
    expect(resolveExecutionTemplatePreview(calendar, { startDate: '2023-02-29' }).kind).toBe(
      'blocked'
    );
    expect(
      resolveExecutionTemplatePreview(calendar, { startDate: '2025-02-01', endDate: '2024-01-01' })
        .kind
    ).toBe('blocked');
    const stage = resolveExecutionTemplateSelection('stage-replace');
    expect(resolveExecutionTemplatePreview(stage, { cleanup: 'drop table' }).kind).toBe('blocked');
    expect(
      resolveExecutionTemplatePreview(stage, { targetTable: 'staging.table; select 1' }).kind
    ).toBe('blocked');
    expect(resolveExecutionTemplatePreview(stage, { cleanup: 'truncate table' })).toMatchObject({
      kind: 'ready',
      source: expect.stringContaining('truncate table'),
    });
  });

  it('keeps source and parameter identity when localizing the library', () => {
    const template = resolveExecutionTemplateSelection('calendar');
    const localized = localizeExecutionTemplate(template, 'es');
    expect(localized.label).toBe('Calendario');
    expect(localized.templateSource).toBe(template.templateSource);
    expect(localized.parameters.map((p) => p.id)).toEqual(template.parameters.map((p) => p.id));
    expect(resolveExecutionTemplatePreview(localized, { startDate: '' })).toMatchObject({
      kind: 'blocked',
      errors: [{ parameterId: 'startDate', message: expect.stringContaining('obligatorio') }],
    });
  });

  it('preserves backslashes and apostrophes in a scheduled procedure argument', () => {
    const profile = resolveExecutionTemplateSelection('scheduled-call');
    const preview = resolveExecutionTemplatePreview(profile, { batch: "west\\night's" });
    expect(preview).toMatchObject({
      kind: 'ready',
      source: expect.stringContaining("call pipeline.load_orders('west\\\\night''s')"),
    });
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

  it('validates only the edited source and its export name', () => {
    const selected = resolveExecutionTemplateSelection('snowflake-task');
    expect(resolveExecutionTemplatePreview(selected, { taskName: 'nightly' }, 'select 1')).toEqual({
      kind: 'ready',
      errors: [],
      exportFileName: 'nightly.task.sql',
      source: 'select 1',
    });
    const preview = resolveExecutionTemplatePreview(selected, {}, 'select 1');
    expect(preview.errors.map((error) => error.parameterId)).toEqual(['taskName']);
  });

  it.each([
    {
      caseName: 'without a terminator',
      input: 'call analytics.load_orders()',
      normalizedBody: 'call analytics.load_orders()',
    },
    {
      caseName: 'with one terminator',
      input: 'call analytics.load_orders();',
      normalizedBody: 'call analytics.load_orders()',
    },
    {
      caseName: 'with repeated terminators',
      input: 'call analytics.load_orders();;;   ',
      normalizedBody: 'call analytics.load_orders()',
    },
    {
      caseName: 'with a trailing line comment',
      input: 'call analytics.load_orders() -- scheduled task',
      normalizedBody: 'call analytics.load_orders() -- scheduled task',
    },
  ])('normalizes Snowflake task SQL $caseName', ({ input, normalizedBody }) => {
    const selected = resolveExecutionTemplateSelection('snowflake-task');
    const preview = resolveExecutionTemplatePreview(selected, {
      taskName: 'load_orders',
      schedule: 'USING CRON 0 * * * * UTC',
      warehouse: 'transforming_wh',
      sqlBody: input,
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
        normalizedBody,
        ';',
      ].join('\n'),
    });
  });
});
