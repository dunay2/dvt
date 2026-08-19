import { describe, expect, it } from 'vitest';

import {
  CompileGraphDbtModelsRequestSchema,
  GraphDbtModelCompilationResultSchema,
} from '@dvt/contracts';

const SHA = 'a'.repeat(64);

describe('Graph DBT model compilation contract', () => {
  it('accepts a bounded model selection and native compiled SQL result', () => {
    expect(
      CompileGraphDbtModelsRequestSchema.parse({
        canvasId: 'canvas-dbt',
        selectors: ['orders', 'customers'],
      })
    ).toEqual({ canvasId: 'canvas-dbt', selectors: ['orders', 'customers'] });

    expect(
      GraphDbtModelCompilationResultSchema.parse({
        schemaVersion: 'graph-dbt-model-compilation.v1',
        kind: 'compiled',
        canvasId: 'canvas-dbt',
        authorityBinding: {
          schemaVersion: 'canvas-authoring-authority-binding.v1',
          canvasId: 'canvas-dbt',
          authority: { kind: 'graph-draft' },
        },
        projectRevision: {
          projectRoot: '.',
          projectName: 'analytics',
          contentSetSha256: SHA,
          analyzedAt: '2026-08-19T22:00:00.000Z',
          analyzerVersion: 'dvt-dbt-analyzer.v1',
          dbtVersion: '1.10.0',
        },
        analysisSha256: SHA,
        models: [
          {
            selector: 'customers',
            uniqueId: 'model.analytics.customers',
            compiledSql: 'select * from raw.customers',
          },
          {
            selector: 'orders',
            uniqueId: 'model.analytics.orders',
            compiledSql: 'select * from raw.orders',
          },
        ],
      }).kind
    ).toBe('compiled');
  });

  it.each([
    { canvasId: 'canvas-dbt', selectors: [] },
    { canvasId: 'canvas-dbt', selectors: ['orders', 'orders'] },
    { canvasId: 'canvas-dbt', selectors: ['orders; drop table users'] },
  ])('rejects an unsafe or ambiguous selection: %j', (request) => {
    expect(CompileGraphDbtModelsRequestSchema.safeParse(request).success).toBe(false);
  });

  it('requires diagnostics for invalid and unavailable native compilation', () => {
    expect(
      GraphDbtModelCompilationResultSchema.safeParse({
        schemaVersion: 'graph-dbt-model-compilation.v1',
        kind: 'invalid',
        canvasId: 'canvas-dbt',
        diagnostics: [],
      }).success
    ).toBe(false);
  });
});
