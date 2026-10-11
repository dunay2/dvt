/** Predicate editing consumes exact operand outputs, including transformed inputs on either port. */
import { describe, expect, it } from 'vitest';
import { selectedUnaryScenario } from './canvasSelectedUnary.test-support';
import { applySelectedRelationFilter } from './canvasSelectedRelationFilter';
import { dvtSubstraitTextComparison } from './canvasDvtSubstraitTextComparison';
import { querySelectedJoin } from './canvasSelectedJoin';
import { replaceSelectedJoinConditions } from './canvasSelectedJoinPredicate';
import { resolveDvtSubstraitJoinUnaryFunctions } from './canvasDvtSubstraitJoinOperand';
import type { DvtSubstraitJoinPredicateCondition } from './canvasDvtSubstraitJoinCondition';
import { encodeDvtSubstraitSemanticDocument } from './canvasDvtSubstraitSemanticDocument';
import { joinPredicateFormulaScope } from './canvasJoinPredicateFormula';
import { projectSubstraitToPostgresSql } from '@dvt/postgres-projection';
import { JoinRel_JoinType } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import { createCustomerOrdersJoin } from './canvasJoin.test-support';
import { source } from './canvasRelationalOperator.test-support';
import { CanvasRelationAnalysisSession } from './canvasRelationAnalysisSession';
import { createSourceJoin } from './canvasSourceJoin';

describe('selected JOIN predicate', () => {
  it.each([
    JoinRel_JoinType.INNER,
    JoinRel_JoinType.LEFT,
    JoinRel_JoinType.RIGHT,
    JoinRel_JoinType.OUTER,
  ])(
    'compiles a mixed-input scalar in JOIN %s without changing its shape or outputs',
    async (joinType) => {
      const session = new CanvasRelationAnalysisSession('model');
      session.receive(
        createCustomerOrdersJoin({
          left: source('left'),
          right: source('right'),
          targetNodeId: 'model',
          joinType,
        })
      );
      const root = session.locate(session.rootId, session.revision);
      const before = await querySelectedJoin(session, session.rootId, session.revision);
      const left = before.fields.find((field) => field.inputIndex === 0)!;
      const right = before.fields.find((field) => field.inputIndex === 1)!;
      const formula = `CONCAT("L.${left.label}", "R.${right.label}") = 'match'`;
      const originalInputs = before.target.inputs.map(
        (id) => session.locate(id, before.revision).relation
      );
      const saved = await replaceSelectedJoinConditions(session, {
        relationId: before.relationId,
        expectedRevision: before.revision,
        formula,
      });
      const after = await querySelectedJoin(session, session.rootId, session.revision);
      expect(after.target.relation.relType.case).toBe('join');
      expect(after.target.inputs).toEqual(root.inputs);
      expect(after.inputs.map(({ fields, bindings }) => ({ fields, bindings }))).toEqual(
        before.inputs.map(({ fields, bindings }) => ({ fields, bindings }))
      );
      expect(after.target.inputs.map((id) => session.locate(id, after.revision).relation)).toEqual(
        originalInputs
      );
      expect(after.type).toBe(before.type);
      expect(after.output.bindings).toEqual(before.output.bindings);
      expect(after.target.relation).not.toEqual(before.target.relation);
      const reopenedFormula = joinPredicateFormulaScope(after).formula!;
      expect(reopenedFormula).toContain('CONCAT');
      await replaceSelectedJoinConditions(session, {
        relationId: after.relationId,
        expectedRevision: after.revision,
        formula: reopenedFormula,
      });
      const reopened = await querySelectedJoin(session, session.rootId, session.revision);
      expect(reopened.target.relation).toEqual(after.target.relation);
      const projected = await projectSubstraitToPostgresSql(saved);
      expect(projected.sql).toContain("ON (i0.c0 || i1.c0) = 'match'");
      expect(projected.sql).not.toMatch(/WHERE/i);
      session.dispose();
    }
  );

  it('disambiguates same-named self-JOIN inputs without accepting an unqualified field', async () => {
    const session = new CanvasRelationAnalysisSession('self');
    session.receive(
      createSourceJoin({
        left: { source: source('same'), fields: ['customer_id', 'name'] },
        right: { source: source('same'), fields: ['customer_id', 'name'] },
        targetNodeId: 'self',
        joinType: JoinRel_JoinType.INNER,
        leftFieldName: 'customer_id',
        rightFieldName: 'customer_id',
        outputs: [
          { side: 0, fieldName: 'name', name: 'left_name' },
          { side: 1, fieldName: 'name', name: 'right_name' },
        ],
      })
    );
    const selected = await querySelectedJoin(session, session.rootId, session.revision);
    const scope = joinPredicateFormulaScope(selected);
    expect(new Set(scope.fields.map((field) => field.name)).size).toBe(4);
    const left = scope.fields[1]!.name;
    const right = scope.fields[3]!.name;
    const request = { relationId: selected.relationId, expectedRevision: selected.revision };
    await expect(
      replaceSelectedJoinConditions(session, { ...request, formula: 'name = name' })
    ).rejects.toThrow();
    const saved = await replaceSelectedJoinConditions(session, {
      ...request,
      formula: `CONCAT("${left}", "${right}") = 'match'`,
    });
    expect((await projectSubstraitToPostgresSql(saved)).sql).toContain(
      "ON (i0.c1 || i1.c1) = 'match'"
    );
    session.dispose();
  });

  it('rejects stale, aborted and unmapped formula operands without altering the saved document', async () => {
    const { session, document } = selectedUnaryScenario();
    const selected = await querySelectedJoin(session, session.rootId, session.revision);
    const field = selected.fields[0]!;
    const request = {
      relationId: selected.relationId,
      expectedRevision: selected.revision,
      formula: `"L.${field.label}" = 'x'`,
    };
    await expect(
      replaceSelectedJoinConditions(session, { ...request, expectedRevision: -1 })
    ).rejects.toThrow();
    const controller = new AbortController();
    controller.abort();
    await expect(
      replaceSelectedJoinConditions(session, { ...request, signal: controller.signal })
    ).rejects.toThrow();
    session.receive(document, new Set([field.fieldId]));
    await expect(replaceSelectedJoinConditions(session, request)).rejects.toThrow();
    expect(session.revision).toBe(selected.revision);
    expect(session.hasDocument(document)).toBe(true);
    session.dispose();
  });

  it.each(['1 + 2', 'UNKNOWN_FUNCTION(1) = 1', '"foreign" = 1', 'SUM(1) = 1'])(
    'rejects invalid JOIN formula %s atomically',
    async (formula) => {
      const { session, document } = selectedUnaryScenario();
      const revision = session.revision;
      await expect(
        replaceSelectedJoinConditions(session, {
          relationId: session.rootId,
          expectedRevision: revision,
          formula,
        })
      ).rejects.toThrow();
      expect(session.revision).toBe(revision);
      expect(session.hasDocument(document)).toBe(true);
      session.dispose();
    }
  );

  it.each(['left', 'right', 'group', 'null'] as const)(
    'rejects nested scalar operands in %s without changing the document or revision',
    async (position) => {
      const { session, document } = selectedUnaryScenario();
      const snapshot = encodeDvtSubstraitSemanticDocument(document);
      const before = await querySelectedJoin(session, session.rootId, session.revision);
      const capability = resolveDvtSubstraitJoinUnaryFunctions({
        dataType: 'string',
        provider: 'postgres',
      })[0]!;
      const field = { kind: 'field' as const, sourceFieldId: before.fields[0]!.fieldId };
      const nested = {
        kind: 'function' as const,
        capabilityId: capability.capabilityId,
        input: { kind: 'function' as const, capabilityId: capability.capabilityId, input: field },
      };
      const comparison = {
        left: position === 'right' ? field : nested,
        right: position === 'right' ? nested : field,
      };
      const condition: DvtSubstraitJoinPredicateCondition =
        position === 'null'
          ? { left: nested, operator: 'is_null' }
          : position === 'group'
            ? { kind: 'group', conditions: [before.conditions![0]!, comparison] }
            : comparison;
      await expect(
        replaceSelectedJoinConditions(session, {
          relationId: before.relationId,
          expectedRevision: before.revision,
          conditions: [condition],
        })
      ).rejects.toThrow(/Transform/);
      expect(session.revision).toBe(before.revision);
      expect(session.hasDocument(document)).toBe(true);
      expect(encodeDvtSubstraitSemanticDocument(document)).toEqual(snapshot);
      expect(await querySelectedJoin(session, session.rootId, session.revision)).toEqual(before);
      session.dispose();
    }
  );
  it.each([0, 1] as const)(
    'edits both predicate operands after transforming input %s',
    async (port) => {
      const { session, root } = selectedUnaryScenario();
      const source = await session.query(root.inputs[port]!);
      await applySelectedRelationFilter(session, {
        relationId: root.inputs[port]!,
        expectedRevision: session.revision,
        intent: 'insert',
        fieldId: source.bindings[0]!.fieldId,
        capabilityId: dvtSubstraitTextComparison.capabilities[0]!.capabilityId,
        value: 'selected',
      });
      const selected = await querySelectedJoin(session, root.binding.relationId, session.revision);
      const operands = selected.inputs.map(
        (input) => session.locate(input.relationId, session.revision).relation
      );
      const condition = {
        left: {
          kind: 'field' as const,
          sourceFieldId: selected.fields[0]!.fieldId,
        },
        right: {
          kind: 'field' as const,
          sourceFieldId: selected.fields.find((field) => field.inputIndex === 1)!.fieldId,
        },
      };
      await replaceSelectedJoinConditions(session, {
        relationId: selected.relationId,
        expectedRevision: selected.revision,
        conditions: [condition],
      });
      const reopened = await querySelectedJoin(session, selected.relationId, session.revision);
      expect(reopened.conditions).toEqual([expect.objectContaining(condition)]);
      expect(
        reopened.inputs.map((input) => session.locate(input.relationId, session.revision).relation)
      ).toEqual(operands);
      expect(reopened.output.fields).toEqual(selected.output.fields);
      expect(reopened.output.bindings).toEqual(selected.output.bindings);
    }
  );

  it('rejects foreign fields, stale revisions and an empty predicate atomically', async () => {
    const { session, root } = selectedUnaryScenario();
    const before = await querySelectedJoin(session, root.binding.relationId, session.revision);
    const request = {
      relationId: before.relationId,
      expectedRevision: before.revision,
      conditions: before.conditions!,
    };
    await expect(
      replaceSelectedJoinConditions(session, { ...request, conditions: [] })
    ).rejects.toThrow();
    await expect(
      replaceSelectedJoinConditions(session, { ...request, expectedRevision: 99 })
    ).rejects.toThrow();
    await expect(
      replaceSelectedJoinConditions(session, {
        ...request,
        conditions: [
          {
            left: { kind: 'field', sourceFieldId: 'foreign' },
            right: { kind: 'literal', literal: { dataType: 'string', value: 'x' } },
          },
        ],
      })
    ).rejects.toThrow();
    expect(await querySelectedJoin(session, before.relationId, session.revision)).toEqual(before);
    expect(session.revision).toBe(before.revision);
  });
});
