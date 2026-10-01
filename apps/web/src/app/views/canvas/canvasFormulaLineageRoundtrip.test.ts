/** Authoring -> wire document -> reopen -> inspection uses one canonical expression authority. */
import { describe, expect, it } from 'vitest';
import { projectSubstraitToPostgresSql } from '@dvt/postgres-projection';
import { connectedNamesProjectionDraft } from './canvasProjectionCommand.test-support';
import { CanvasRelationAnalysisSession } from './canvasRelationAnalysisSession';
import { applySelectedRelationDerivedOutput } from './canvasSelectedRelationDerivedOutput';
import {
  inspectDvtSubstraitProjectionDraft,
  type DvtSubstraitProjectionDraft,
} from './canvasDvtSubstraitProjection';
import {
  decodeDvtSubstraitSemanticDocument,
  encodeDvtSubstraitSemanticDocument,
} from './canvasDvtSubstraitSemanticDocument';
import { node } from './canvasOutputExpression.test.fixtures';
import { projectCanvasOutputExpression } from './canvasOutputExpressionProjection';
import { compileDerivedOutputFormula } from './canvasDerivedOutputFormula';
import { dvtSubstraitExpression } from './canvasDvtSubstraitExpression';
import { projectionOperandLineageMatches } from './canvasProjectionOperandLineage';

async function author(formula: string): Promise<DvtSubstraitProjectionDraft> {
  const session = new CanvasRelationAnalysisSession('formula-lineage');
  session.receive(connectedNamesProjectionDraft());
  try {
    return await applySelectedRelationDerivedOutput(session, {
      intent: 'edit',
      relationId: session.rootId,
      expectedRevision: session.revision,
      alias: 'preferred_name',
      formula,
    });
  } finally {
    session.dispose();
  }
}

function reopen(document: DvtSubstraitProjectionDraft): DvtSubstraitProjectionDraft {
  return decodeDvtSubstraitSemanticDocument(
    JSON.parse(JSON.stringify(encodeDvtSubstraitSemanticDocument(document)))
  );
}

describe('nested formula lineage roundtrip', () => {
  it.each([
    ['COALESCE(TRIM(first_name), last_name)', 'coalesce(trim(first_name), last_name)'],
    [
      'UPPER(COALESCE(TRIM(first_name), LOWER(last_name)))',
      'upper(coalesce(trim(first_name), lower(last_name)))',
    ],
    [
      'COALESCE(TRIM(first_name), last_name, first_name)',
      'coalesce(trim(first_name), last_name, first_name)',
    ],
  ])('preserves inspection, identities and SQL for %s', async (formula, expression) => {
    const authored = await author(formula);
    const field = authored.sidecar.fields.find((entry) => entry.displayName === 'preferred_name')!;
    expect(field.operandFieldIds).toEqual(['output:first_name', 'output:last_name']);
    const document = reopen(authored);
    expect(document.sidecar).toEqual(authored.sidecar);
    expect(inspectDvtSubstraitProjectionDraft(document).ok).toBe(true);
    const inspected = projectCanvasOutputExpression(node(document), field.fieldId);
    expect(inspected.status).toBe('available');
    if (inspected.status !== 'available') throw new Error(inspected.reason);
    expect(inspected.graph.nodes[0]?.data.expression).toBe(expression);
    expect(inspected.fieldId).toBe(field.fieldId);
    const before = await projectSubstraitToPostgresSql(authored);
    const after = await projectSubstraitToPostgresSql(document);
    expect(after.sql).toBe(before.sql);
    expect(after.projection).toEqual(before.projection);
    const session = new CanvasRelationAnalysisSession('reopened-formula');
    session.receive(document);
    try {
      expect((await session.query(session.rootId)).bindings.at(-1)?.fieldId).toBe(field.fieldId);
    } finally {
      session.dispose();
    }
  });

  it('matches a referenced derived output as a complete nested subexpression', async () => {
    const session = new CanvasRelationAnalysisSession('derived-lineage');
    session.receive(connectedNamesProjectionDraft());
    try {
      const trimmed = await applySelectedRelationDerivedOutput(session, {
        intent: 'edit',
        relationId: session.rootId,
        expectedRevision: session.revision,
        alias: 'trimmed',
        formula: 'TRIM(first_name)',
      });
      const trimmedId = trimmed.sidecar.fields.find(
        (field) => field.displayName === 'trimmed'
      )!.fieldId;
      const combined = await applySelectedRelationDerivedOutput(session, {
        intent: 'edit',
        relationId: session.rootId,
        expectedRevision: session.revision,
        alias: 'combined',
        formula: 'COALESCE(UPPER(trimmed), last_name, trimmed)',
      });
      const field = combined.sidecar.fields.find((entry) => entry.displayName === 'combined')!;
      expect(field.operandFieldIds).toEqual([trimmedId, 'output:last_name']);
      const document = reopen(combined);
      expect(projectCanvasOutputExpression(node(document), field.fieldId).status).toBe('available');
      expect(document.sidecar).toEqual(combined.sidecar);
      const changed = await applySelectedRelationDerivedOutput(session, {
        intent: 'edit',
        relationId: session.rootId,
        expectedRevision: session.revision,
        alias: 'trimmed',
        outputFieldId: trimmedId,
        formula: 'LOWER(first_name)',
      });
      expect(inspectDvtSubstraitProjectionDraft(changed)).toEqual({ ok: false });
    } finally {
      session.dispose();
    }
  });

  it.each(['unknown', 'self', 'missing', 'duplicate', 'reordered', 'extra'])(
    'rejects %s dependency metadata without rewriting the saved document',
    async (kind) => {
      const document = reopen(await author('COALESCE(TRIM(first_name), last_name)'));
      const field = document.sidecar.fields.find(
        (entry) => entry.displayName === 'preferred_name'
      )!;
      const first = 'output:first_name';
      const last = 'output:last_name';
      const invalid: Record<string, string[]> = {
        unknown: [first, 'missing'],
        self: [first, field.fieldId],
        missing: [first],
        duplicate: [first, last, first],
        reordered: [last, first],
        extra: [first, last, document.sidecar.fields[0]!.fieldId],
      };
      field.operandFieldIds = invalid[kind]!;
      const before = structuredClone(document);
      expect(inspectDvtSubstraitProjectionDraft(document)).toEqual({ ok: false });
      expect(document).toEqual(before);
    }
  );

  it('retains distinct referenced outputs that have identical canonical expressions', async () => {
    const session = new CanvasRelationAnalysisSession('equivalent-output-lineage');
    session.receive(connectedNamesProjectionDraft());
    try {
      const copied = await applySelectedRelationDerivedOutput(session, {
        intent: 'edit',
        relationId: session.rootId,
        expectedRevision: session.revision,
        alias: 'first_copy',
        formula: 'first_name',
      });
      const copiedId = copied.sidecar.fields.find(
        (field) => field.displayName === 'first_copy'
      )!.fieldId;
      const combined = await applySelectedRelationDerivedOutput(session, {
        intent: 'edit',
        relationId: session.rootId,
        expectedRevision: session.revision,
        alias: 'combined',
        formula: 'COALESCE(TRIM(first_name), first_copy, last_name, first_name)',
      });
      const field = combined.sidecar.fields.find((entry) => entry.displayName === 'combined')!;
      expect(field.operandFieldIds).toEqual(['output:first_name', copiedId, 'output:last_name']);
      const document = reopen(combined);
      expect(inspectDvtSubstraitProjectionDraft(document).ok).toBe(true);
      expect(projectCanvasOutputExpression(node(document), field.fieldId).status).toBe('available');
      expect(document.sidecar).toEqual(combined.sidecar);
    } finally {
      session.dispose();
    }
  });

  it.each([
    "CONCAT(TRIM(first_name), ' ', last_name)",
    'COALESCE(TRIM(first_name), NULL, last_name, first_name)',
  ])('does not invent dependencies for inline constants in %s', (formula) => {
    const document = connectedNamesProjectionDraft();
    const fields = ['first_name', 'last_name'].map((name, ordinal) => ({
      fieldId: name,
      name,
      dataType: 'string',
      expression: dvtSubstraitExpression.field(ordinal),
    }));
    const compiled = compileDerivedOutputFormula({
      formula,
      fields,
      plan: document.plan,
      provider: 'postgres',
    });
    expect(
      projectionOperandLineageMatches(
        compiled.expression,
        compiled.fieldIds,
        (id) => fields.find((field) => field.fieldId === id)?.expression ?? null
      )
    ).toBe(true);
  });
});
