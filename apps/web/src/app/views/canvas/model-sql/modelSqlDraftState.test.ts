/** Buffer receipts must never be mistaken for current SQL after a context or text change. */
import { describe, expect, it } from 'vitest';
import {
  initialModelSqlDraft,
  modelSqlDraftReducer,
  hasModelSqlChanges,
} from './modelSqlDraftState';
import { ModelSqlContextResponseSchema } from '@dvt/contracts';

const context = ModelSqlContextResponseSchema.parse({
  schemaVersion: 'canvas-model-sql-context.v1',
  canvasId: 'canvas',
  transformNodeId: 'model',
  draftRevision: 'r1',
  contextSha256: 'a'.repeat(64),
  semanticPlanSha256: null,
  connectionRef: null,
  sql: 'SELECT country FROM client',
  inputs: [],
  diagnostics: [],
});
describe('Model SQL lexical draft', () => {
  it('seeds a clean buffer but preserves text written before the context arrives', () => {
    expect(modelSqlDraftReducer(initialModelSqlDraft, { type: 'context', context }).sql).toBe(
      context.sql
    );
    const edited = modelSqlDraftReducer(initialModelSqlDraft, {
      type: 'text',
      sql: 'SELECT client_id FROM client',
    });
    expect(modelSqlDraftReducer(edited, { type: 'context', context }).sql).toBe(edited.sql);
  });
  it('retains a dirty buffer after context invalidation', () => {
    const ready = modelSqlDraftReducer(initialModelSqlDraft, { type: 'context', context });
    const edited = modelSqlDraftReducer(ready, { type: 'text', sql: 'SELECT * FROM client' });
    const stale = modelSqlDraftReducer(edited, { type: 'invalidate' });
    expect(stale.context).toBeNull();
    expect(stale.sql).toBe(edited.sql);
    expect(hasModelSqlChanges(stale)).toBe(true);
  });
  it('marks only an acknowledged generation as the new clean baseline', () => {
    const edited = modelSqlDraftReducer(initialModelSqlDraft, {
      type: 'text',
      sql: 'SELECT * FROM client',
    });
    expect(hasModelSqlChanges(edited)).toBe(true);
    const applied = modelSqlDraftReducer(edited, {
      type: 'applied',
      sql: edited.sql,
      semanticSha256: 'b'.repeat(64),
    });
    expect(hasModelSqlChanges(applied)).toBe(false);
    const accepted = ModelSqlContextResponseSchema.parse({
      ...context,
      semanticPlanSha256: 'b'.repeat(64),
      sql: null,
    });
    expect(modelSqlDraftReducer(applied, { type: 'context', context: accepted }).sql).toBe(
      edited.sql
    );
  });
  it('discard restores the last accepted source without inventing an empty SELECT', () => {
    const ready = modelSqlDraftReducer(initialModelSqlDraft, {
      type: 'context',
      context: { ...context, sql: null },
    });
    const edited = modelSqlDraftReducer(ready, { type: 'text', sql: 'bad sql' });
    expect(modelSqlDraftReducer(edited, { type: 'discard' }).sql).toBe('');
  });
  it.each(['SELECT country AS nation FROM client', null])(
    'discards against the refreshed semantic context instead of the old baseline: %s',
    (sql) => {
      const ready = modelSqlDraftReducer(initialModelSqlDraft, { type: 'context', context });
      const accepted = modelSqlDraftReducer(ready, {
        type: 'applied',
        sql: ready.sql,
        semanticSha256: 'b'.repeat(64),
      });
      const edited = modelSqlDraftReducer(accepted, { type: 'text', sql: 'SELECT * FROM client' });
      const refreshed = modelSqlDraftReducer(edited, {
        type: 'context',
        context: { ...context, semanticPlanSha256: 'c'.repeat(64), sql },
      });
      expect(refreshed.sql).toBe(edited.sql);
      expect(hasModelSqlChanges(refreshed)).toBe(true);
      const discarded = modelSqlDraftReducer(refreshed, { type: 'discard' });
      expect(discarded.sql).toBe(sql ?? '');
      expect(discarded.baseline).toBe(sql ?? '');
      expect(discarded.acceptedSemanticSha256).toBeNull();
      expect(hasModelSqlChanges(discarded)).toBe(false);
    }
  );
  it('retains acknowledged lexical SQL on discard only for its matching semantic context', () => {
    const lexical = 'SELECT country /* accepted spelling */ FROM client';
    const accepted = modelSqlDraftReducer(initialModelSqlDraft, {
      type: 'applied',
      sql: lexical,
      semanticSha256: 'b'.repeat(64),
    });
    const edited = modelSqlDraftReducer(accepted, { type: 'text', sql: 'SELECT * FROM client' });
    const refreshed = modelSqlDraftReducer(edited, {
      type: 'context',
      context: { ...context, semanticPlanSha256: 'b'.repeat(64) },
    });
    const discarded = modelSqlDraftReducer(refreshed, { type: 'discard' });
    expect(discarded.sql).toBe(lexical);
    expect(hasModelSqlChanges(discarded)).toBe(false);
  });
});
