/** Prove SQL proposals cannot bypass context identity or the saved-Model preview boundary. */
import { describe, expect, it } from 'vitest';

import {
  MODEL_SQL_MAX_LENGTH,
  ModelSqlCompilationRequestSchema,
  ModelSqlCompilationResponseSchema,
} from '../../src/contracts/canvas/ModelSqlCompilation.v1.js';
import { ModelSqlContextResponseSchema } from '../../src/contracts/canvas/ModelSqlContext.v1.js';
import { TransformDataSampleRequestSchema } from '../../src/contracts/canvas/TransformDataSample.v1.js';
import { TransformSqlDraftDataSampleRequestSchema } from '../../src/contracts/canvas/TransformSqlDraftDataSample.v1.js';

const target = { canvasId: 'canvas', transformNodeId: 'model' };
const request = {
  ...target,
  draftRevision: 'revision-7',
  contextSha256: 'a'.repeat(64),
  sql: ' SELECT "client"."country" FROM "client";\n',
};
const context = {
  schemaVersion: 'canvas-model-sql-context.v1',
  ...target,
  draftRevision: request.draftRevision,
  contextSha256: request.contextSha256,
  semanticPlanSha256: null,
  connectionRef: null,
  sql: null,
  inputs: [],
  diagnostics: [],
};

describe('Model SQL authoring contracts', () => {
  it('preserves the exact buffer while requiring a current scoped Model context', () => {
    expect(ModelSqlCompilationRequestSchema.parse(request).sql).toBe(request.sql);
    for (const patch of [
      { contextSha256: 'stale' },
      { draftRevision: '' },
      { canvasId: '' },
      { transformNodeId: ' model ' },
      { semanticDocument: {} },
      { credentialRef: 'secret' },
    ])
      expect(ModelSqlCompilationRequestSchema.safeParse({ ...request, ...patch }).success).toBe(
        false
      );
    expect(
      ModelSqlCompilationRequestSchema.safeParse({
        ...request,
        sql: 'x'.repeat(MODEL_SQL_MAX_LENGTH + 1),
      }).success
    ).toBe(false);
  });

  it('admits an honest empty context without manufacturing a connection or SELECT', () => {
    expect(ModelSqlContextResponseSchema.parse(context)).toMatchObject({
      inputs: [],
      sql: null,
      connectionRef: null,
      semanticPlanSha256: null,
    });
    expect(ModelSqlContextResponseSchema.safeParse({ ...context, credentials: {} }).success).toBe(
      false
    );
  });

  it('retains unknown publication facts and rejects ambiguous SQL input names', () => {
    const input = {
      nodeId: 'client-id',
      name: 'Client',
      sqlName: 'client',
      columns: [{ id: 'country-id', name: 'country', dataType: null, nullable: null }],
    };
    expect(
      ModelSqlContextResponseSchema.parse({ ...context, inputs: [input] }).inputs[0]?.columns[0]
    ).toMatchObject({ dataType: null, nullable: null });
    expect(
      ModelSqlContextResponseSchema.safeParse({
        ...context,
        inputs: [input, { ...input, nodeId: 'other-id' }],
      }).success
    ).toBe(false);
  });

  it('cannot attach a partial semantic candidate to failed validation', () => {
    const invalid = {
      schemaVersion: 'canvas-model-sql-compilation.v1',
      ...target,
      draftRevision: request.draftRevision,
      contextSha256: request.contextSha256,
      sqlSha256: 'b'.repeat(64),
      status: 'invalid',
      diagnostics: [
        { code: 'unsupported_sql', source: 'semantic', message: 'CTE is unsupported.' },
      ],
    };
    expect(ModelSqlCompilationResponseSchema.safeParse(invalid).success).toBe(true);
    expect(
      ModelSqlCompilationResponseSchema.safeParse({ ...invalid, semanticDocument: {} }).success
    ).toBe(false);
    expect(
      ModelSqlCompilationResponseSchema.safeParse({ ...invalid, diagnostics: [] }).success
    ).toBe(false);
    expect(
      ModelSqlCompilationResponseSchema.safeParse({ ...invalid, status: 'valid' }).success
    ).toBe(false);
  });

  it('requires the explicit SQL-draft variant and retains the existing row limit', () => {
    const draft = {
      ...request,
      schemaVersion: 'canvas-transform-sql-draft-data-sample.v1',
    };
    expect(TransformSqlDraftDataSampleRequestSchema.parse(draft).limit).toBe(20);
    for (const limit of [0, -1, 51, 1.5])
      expect(TransformSqlDraftDataSampleRequestSchema.safeParse({ ...draft, limit }).success).toBe(
        false
      );
    expect(
      TransformDataSampleRequestSchema.safeParse({ ...target, sql: request.sql }).success
    ).toBe(false);
    expect(TransformDataSampleRequestSchema.safeParse(draft).success).toBe(false);
    expect(
      TransformSqlDraftDataSampleRequestSchema.safeParse({ ...draft, connectionRef: {} }).success
    ).toBe(false);
  });
});
