import { readFileSync } from 'node:fs';
import { URL } from 'node:url';

import { SetRel_SetOp } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import { Type_Nullability } from '@buf/substrait_substrait.bufbuild_es/substrait/type_pb.js';
import {
  decodeDvtSubstraitPlanV1,
  DvtSubstraitSemanticDocumentV1Schema,
  encodeDvtSubstraitPlanV1,
} from '@dvt/contracts';
import { describe, expect, it } from 'vitest';

import {
  buildDvtSetPostgresAst,
  ZERO_SHA256,
  inspectDvtSubstraitSetDraft,
  projectDvtSetDraftToPostgresSql,
  type DvtSubstraitSetDraft,
} from '../src/index.js';

const documents = JSON.parse(
  readFileSync(new URL('./fixtures/set-documents.json', import.meta.url), 'utf8')
) as Record<string, unknown>;

function draft(): DvtSubstraitSetDraft {
  const document = DvtSubstraitSemanticDocumentV1Schema.parse(documents['unionDistinct']);
  return { plan: decodeDvtSubstraitPlanV1(document), sidecar: document.sidecar };
}

function wrappedDraft(
  wrapper: 'aggregate' | 'window',
  operation: 'union_all' | 'union_distinct' | 'intersect_distinct' | 'except_distinct'
): DvtSubstraitSetDraft {
  const suffix = wrapper === 'aggregate' ? 'Aggregate' : 'Window';
  const document = DvtSubstraitSemanticDocumentV1Schema.parse(documents[`unionDistinct${suffix}`]);
  const draft = { plan: decodeDvtSubstraitPlanV1(document), sidecar: document.sidecar };
  const root = draft.plan.relations[0]?.relType;
  const set =
    root?.case === 'root' && root.value.input?.relType.case === 'aggregate'
      ? root.value.input.relType.value.input?.relType
      : root?.case === 'root' && root.value.input?.relType.case === 'project'
        ? root.value.input.relType.value.input?.relType.value.input?.relType
        : undefined;
  if (set?.case !== 'set') throw new Error('Wrapped fixture must contain one SetRel.');
  set.value.op = {
    union_all: SetRel_SetOp.UNION_ALL,
    union_distinct: SetRel_SetOp.UNION_DISTINCT,
    intersect_distinct: SetRel_SetOp.INTERSECTION_MULTISET,
    except_distinct: SetRel_SetOp.MINUS_PRIMARY,
  }[operation];
  draft.sidecar.semanticPlanSha256 = encodeDvtSubstraitPlanV1(draft.plan).sha256;
  return draft;
}

function setOperation(candidate: DvtSubstraitSetDraft, operation: SetRel_SetOp): void {
  const root = candidate.plan.relations[0]?.relType;
  if (root?.case !== 'root' || root.value.input?.relType.case !== 'set') {
    throw new Error('Fixture must contain a SetRel root.');
  }
  root.value.input.relType.value.op = operation;
  candidate.sidecar.semanticPlanSha256 = ZERO_SHA256;
}

function setInputNullability(
  candidate: DvtSubstraitSetDraft,
  inputOrdinal: number,
  nullability: Type_Nullability
): void {
  const root = candidate.plan.relations[0]?.relType;
  const set = root?.case === 'root' ? root.value.input?.relType : undefined;
  const input = set?.case === 'set' ? set.value.inputs[inputOrdinal]?.relType : undefined;
  if (input?.case !== 'read') throw new Error('Fixture must contain SetRel ReadRel inputs.');
  const type = input.value.baseSchema?.struct?.types[0];
  if (type?.kind.case !== 'string') throw new Error('Fixture field must be string.');
  type.kind.value.nullability = nullability;
  candidate.sidecar.semanticPlanSha256 = ZERO_SHA256;
}

describe('shared PostgreSQL SetRel admission', () => {
  it('preserves three-input order and projects UNION DISTINCT without bag semantics', async () => {
    const result = await projectDvtSetDraftToPostgresSql(draft());

    expect(result.projection.operation).toBe('union_distinct');
    expect(result.projection.inputs.map((input) => input.table)).toEqual([
      'customers_north',
      'customers_south',
      'customers_west',
    ]);
    expect(result.sql.match(/UNION/g)).toHaveLength(2);
    expect(result.sql).not.toContain('UNION ALL');
  });

  it('delegates duplicate tuples containing NULL to exact PostgreSQL set comparison', () => {
    const inspection = inspectDvtSubstraitSetDraft(draft());
    if (!inspection.ok) throw new Error('Expected the UNION DISTINCT fixture to be admitted.');

    const ast = buildDvtSetPostgresAst(inspection.projection);

    expect(JSON.stringify(ast).match(/"all":false/g)).toHaveLength(2);
  });

  it('projects the exact admitted UNION ALL selector with bag semantics', async () => {
    const candidate = draft();
    setOperation(candidate, SetRel_SetOp.UNION_ALL);

    const result = await projectDvtSetDraftToPostgresSql(candidate);

    expect(result.projection.operation).toBe('union_all');
    expect(result.sql.match(/UNION\s+ALL/g)).toHaveLength(2);
  });

  it.each([
    ['intersect_distinct', SetRel_SetOp.INTERSECTION_MULTISET, /INTERSECT/g],
    ['except_distinct', SetRel_SetOp.MINUS_PRIMARY, /EXCEPT/g],
  ] as const)(
    'projects the exact admitted %s selector over all three ordered inputs',
    async (operation, selector, sqlOperator) => {
      const candidate = draft();
      setOperation(candidate, selector);

      const result = await projectDvtSetDraftToPostgresSql(candidate);

      expect(result.projection.operation).toBe(operation);
      expect(result.projection.inputs.map(({ table }) => table)).toEqual([
        'customers_north',
        'customers_south',
        'customers_west',
      ]);
      expect(result.sql.match(sqlOperator)).toHaveLength(2);
      expect(result.sql).not.toContain(' ALL');
    }
  );

  it('applies output projection after tuple comparison for DISTINCT Set operations', async () => {
    const candidate = draft();
    setOperation(candidate, SetRel_SetOp.INTERSECTION_MULTISET);
    const inspection = inspectDvtSubstraitSetDraft(candidate);
    if (!inspection.ok) throw new Error('Expected INTERSECT DISTINCT to be admitted.');

    const ast = buildDvtSetPostgresAst({
      ...inspection.projection,
      outputs: [inspection.projection.outputs[0]!],
    });
    const encoded = JSON.stringify(ast);

    expect(encoded.match(/customer_id/g)).toHaveLength(4);
    expect(encoded.match(/country/g)).toHaveLength(3);
    expect(ast).toMatchObject({
      SelectStmt: {
        op: 'SETOP_NONE',
        fromClause: [{ RangeSubselect: { subquery: { SelectStmt: { op: 'SETOP_INTERSECT' } } } }],
      },
    });
  });

  it('derives INTERSECT and EXCEPT nullability from their exact operand semantics', () => {
    const intersect = draft();
    setOperation(intersect, SetRel_SetOp.INTERSECTION_MULTISET);
    setInputNullability(intersect, 1, Type_Nullability.REQUIRED);
    const intersectInspection = inspectDvtSubstraitSetDraft(intersect);
    expect(intersectInspection.ok && intersectInspection.projection.outputs[0]?.nullable).toBe(
      false
    );

    const except = draft();
    setOperation(except, SetRel_SetOp.MINUS_PRIMARY);
    setInputNullability(except, 0, Type_Nullability.REQUIRED);
    const exceptInspection = inspectDvtSubstraitSetDraft(except);
    expect(exceptInspection.ok && exceptInspection.projection.outputs[0]?.nullable).toBe(false);

    const reversed = draft();
    setOperation(reversed, SetRel_SetOp.MINUS_PRIMARY);
    setInputNullability(reversed, 1, Type_Nullability.REQUIRED);
    const reversedInspection = inspectDvtSubstraitSetDraft(reversed);
    expect(reversedInspection.ok && reversedInspection.projection.outputs[0]?.nullable).toBe(true);
  });

  it.each([
    ['union_distinct', 'aggregate', ['customer_id', 'customer_count'], /GROUP BY\s+customer_id/],
    [
      'union_distinct',
      'window',
      ['customer_id', 'customer_count', 'customer_rank'],
      /row_number\(\) OVER/,
    ],
    ['union_all', 'aggregate', ['customer_id', 'customer_count'], /GROUP BY\s+customer_id/],
    [
      'union_all',
      'window',
      ['customer_id', 'customer_count', 'customer_rank'],
      /row_number\(\) OVER/,
    ],
    [
      'intersect_distinct',
      'aggregate',
      ['customer_id', 'customer_count'],
      /GROUP BY\s+customer_id/,
    ],
    [
      'except_distinct',
      'window',
      ['customer_id', 'customer_count', 'customer_rank'],
      /row_number\(\) OVER/,
    ],
  ] as const)(
    'projects %s with an admitted %s wrapper',
    async (operation, wrapper, outputNames, sqlPattern) => {
      const result = await projectDvtSetDraftToPostgresSql(wrappedDraft(wrapper, operation));

      expect(result.projection.operation).toBe(operation);
      expect(result.projection.outputs.map(({ name }) => name)).toEqual(outputNames);
      expect(result.sql).toMatch(sqlPattern);
      const operator =
        operation === 'intersect_distinct'
          ? /INTERSECT/g
          : operation === 'except_distinct'
            ? /EXCEPT/g
            : /UNION/g;
      expect(result.sql.match(operator)).toHaveLength(2);
      expect(result.sql.match(/UNION\s+ALL/g)?.length ?? 0).toBe(operation === 'union_all' ? 2 : 0);
    }
  );

  it.each([
    'mismatched schema',
    'duplicate source',
    'stale hash',
    'unsupported selector',
    'unsupported INTERSECT ALL selector',
    'unsupported EXCEPT ALL selector',
  ])('rejects %s rather than degrading Set semantics', async (scenario) => {
    const candidate = draft();
    if (scenario === 'mismatched schema') {
      const root = candidate.plan.relations[0]?.relType;
      if (root?.case !== 'root' || root.value.input?.relType.case !== 'set') {
        throw new Error('Fixture must contain a SetRel root.');
      }
      const read = root.value.input.relType.value.inputs[1]?.relType;
      if (read?.case !== 'read') throw new Error('Fixture must contain a ReadRel input.');
      read.value.baseSchema!.names[1] = 'region';
      candidate.sidecar.semanticPlanSha256 = ZERO_SHA256;
    }
    if (scenario === 'duplicate source') {
      candidate.sidecar.relations[1]!.sourceRef = candidate.sidecar.relations[0]!.sourceRef;
    }
    if (scenario === 'stale hash') candidate.sidecar.semanticPlanSha256 = 'a'.repeat(64);
    if (scenario === 'unsupported selector')
      setOperation(candidate, SetRel_SetOp.INTERSECTION_PRIMARY);
    if (scenario === 'unsupported INTERSECT ALL selector')
      setOperation(candidate, SetRel_SetOp.INTERSECTION_PRIMARY);
    if (scenario === 'unsupported EXCEPT ALL selector')
      setOperation(candidate, SetRel_SetOp.MINUS_MULTISET);

    expect(inspectDvtSubstraitSetDraft(candidate).ok).toBe(false);
    await expect(projectDvtSetDraftToPostgresSql(candidate)).rejects.toMatchObject({
      code: 'unsupported_shape',
    });
  });
});
