/**
 * Owned concern: prove formula references survive authoring, wire roundtrip and inspection.
 * @baseline ADR-0064: canonical expressions and producer identities own dependencies.
 * @decision Inspect current groups directly; exercise legacy lineage validation with valid legacy fixtures.
 * @consequence Reopen cannot freeze a dependency snapshot or hide vacuous metadata rejections.
 * @version 1.0.0
 */
import { describe, expect, it } from 'vitest';
import { deriveSubstraitSchemas } from '@dvt/substrait-analysis';
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
import { node, scalar } from './canvasOutputExpression.test.fixtures';
import { projectCanvasOutputExpression } from './canvasOutputExpressionProjection';
import { compileDerivedOutputFormula } from './canvasDerivedOutputFormula';
import { dvtSubstraitExpression } from './canvasDvtSubstraitExpression';
import { projectionOperandLineageMatches } from './canvasProjectionOperandLineage';
import { applyDvtSubstraitSemanticDocument } from './canvasDvtTransformAuthoringAuthority';
import {
  readCanvasTransformDependencyModel,
  type TransformDependencyModel,
} from './canvasTransformDependencyModel';
import { transformExpressionDependencies } from './canvasTransformExpressionReferences';
import { describeCanvasTransformDefinitions } from './canvasTransformDefinitionPresentation';

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

function dependencyModel(document: DvtSubstraitProjectionDraft): TransformDependencyModel {
  const { index } = deriveSubstraitSchemas(document);
  return readCanvasTransformDependencyModel(index.relations.get(index.rootId)!, (id) =>
    index.relations.get(id)!
  );
}

function inspectOutput(
  document: DvtSubstraitProjectionDraft,
  fieldId: string
): ReturnType<typeof projectCanvasOutputExpression> {
  return projectCanvasOutputExpression(
    applyDvtSubstraitSemanticDocument(
      node(connectedNamesProjectionDraft()),
      encodeDvtSubstraitSemanticDocument(document)
    ),
    fieldId
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
    const model = dependencyModel(authored);
    const definition = model.definitions[0]!;
    const field = definition.output!;
    expect(model.root.fields.slice(0, 2).map((entry) => entry.fieldId)).toEqual([
      'output:first_name',
      'output:last_name',
    ]);
    expect(
      new Set(transformExpressionDependencies(definition.expression, definition.inputIds))
    ).toEqual(new Set(model.input.fields.map((entry) => entry.fieldId)));
    const document = reopen(authored);
    expect(document.sidecar).toEqual(authored.sidecar);
    expect(dependencyModel(document).definitions).toEqual(model.definitions);
    expect(
      describeCanvasTransformDefinitions(document.plan, dependencyModel(document)).get(
        definition.id
      )?.formula
    ).toBe(formula);
    const inspected = inspectOutput(document, field.fieldId);
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

  it('updates the referenced producer without freezing a nested formula snapshot', async () => {
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
      const trimmedDefinition = dependencyModel(trimmed).definitions[0]!;
      const trimmedId = trimmedDefinition.output!.fieldId;
      const combined = await applySelectedRelationDerivedOutput(session, {
        intent: 'edit',
        relationId: session.rootId,
        expectedRevision: session.revision,
        alias: 'combined',
        formula: 'COALESCE(UPPER(trimmed), last_name, trimmed)',
      });
      const model = dependencyModel(combined);
      const definition = model.definitions.find(
        (entry) => entry.output?.displayName === 'combined'
      )!;
      const field = definition.output!;
      const lastNameId = model.input.fields.find(
        (entry) => entry.displayName === 'last_name'
      )!.fieldId;
      expect(
        new Set(transformExpressionDependencies(definition.expression, definition.inputIds))
      ).toEqual(new Set([trimmedDefinition.id, lastNameId]));
      const document = reopen(combined);
      expect(inspectOutput(document, field.fieldId).status).toBe('available');
      expect(document.sidecar).toEqual(combined.sidecar);
      const changed = await applySelectedRelationDerivedOutput(session, {
        intent: 'edit',
        relationId: session.rootId,
        expectedRevision: session.revision,
        alias: 'trimmed',
        outputFieldId: trimmedId,
        formula: 'LOWER(first_name)',
      });
      const reopened = reopen(changed);
      const after = dependencyModel(reopened);
      expect(after.root.fields.map((entry) => entry.fieldId)).toEqual(
        model.root.fields.map((entry) => entry.fieldId)
      );
      expect(after.definitions.map((entry) => entry.id)).toEqual(
        model.definitions.map((entry) => entry.id)
      );
      expect(after.definitions.find((entry) => entry.id === definition.id)?.expression).toEqual(
        definition.expression
      );
      const descriptions = describeCanvasTransformDefinitions(reopened.plan, after);
      expect(descriptions.get(trimmedDefinition.id)?.formula).toBe('LOWER(first_name)');
      expect(descriptions.get(definition.id)?.formula).toBe(
        'COALESCE(UPPER(trimmed), last_name, trimmed)'
      );
      const beforeSql = await projectSubstraitToPostgresSql(document);
      const afterSql = await projectSubstraitToPostgresSql(reopened);
      expect(afterSql.sql).not.toBe(beforeSql.sql);
      expect(afterSql.sql).toMatch(/\blower\s*\(/i);
      expect(afterSql.sql).not.toMatch(/\b(?:btrim|trim)\s*\(/i);
      expect(afterSql.projection).toEqual(beforeSql.projection);
      expect(inspectOutput(reopened, field.fieldId).status).toBe('available');
    } finally {
      session.dispose();
    }
  });

  it.each(['unknown', 'self', 'missing', 'duplicate', 'reordered', 'extra'])(
    'rejects %s dependency metadata without rewriting the saved document',
    (kind) => {
      const trimmed = scalar(
        connectedNamesProjectionDraft(),
        'trim',
        ['output:first_name'],
        'trimmed'
      );
      const document = reopen(
        scalar(
          trimmed.draft,
          'coalesce',
          [trimmed.createdFieldId, 'output:last_name'],
          'preferred_name'
        ).draft
      );
      expect(inspectDvtSubstraitProjectionDraft(document).ok).toBe(true);
      const field = document.sidecar.fields.find(
        (entry) => entry.displayName === 'preferred_name'
      )!;
      const first = trimmed.createdFieldId;
      const last = 'output:last_name';
      expect(field.operandFieldIds).toEqual([first, last]);
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
      const copiedDefinition = dependencyModel(copied).definitions[0]!;
      const combined = await applySelectedRelationDerivedOutput(session, {
        intent: 'edit',
        relationId: session.rootId,
        expectedRevision: session.revision,
        alias: 'combined',
        formula: 'COALESCE(TRIM(first_name), first_copy, last_name, first_name)',
      });
      const model = dependencyModel(combined);
      const definition = model.definitions.find(
        (entry) => entry.output?.displayName === 'combined'
      )!;
      const field = definition.output!;
      const inputIds = model.input.fields.map((entry) => entry.fieldId);
      expect(inputIds).not.toContain(copiedDefinition.id);
      expect(
        new Set(transformExpressionDependencies(definition.expression, definition.inputIds))
      ).toEqual(new Set([...inputIds, copiedDefinition.id]));
      const document = reopen(combined);
      expect(dependencyModel(document).definitions).toEqual(model.definitions);
      expect(inspectOutput(document, field.fieldId).status).toBe('available');
      expect(document.sidecar).toEqual(combined.sidecar);
      expect(await projectSubstraitToPostgresSql(document)).toEqual(
        await projectSubstraitToPostgresSql(combined)
      );
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
