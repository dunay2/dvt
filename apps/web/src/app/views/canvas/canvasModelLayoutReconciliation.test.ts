/** SQL regeneration transfers presentation only when canonical correspondence is unique. */
import { describe, expect, it } from 'vitest';
import {
  compileModelSqlSource,
  pgColumnRef,
  pgComparison,
  pgQualifiedColumnRef,
  pgRangeSubselect,
  pgRangeVar,
  sourceFieldType,
  type ModelSqlSourceContext,
  type PostgresAstNode,
} from '@dvt/postgres-projection';
import {
  deriveSubstraitSchemas,
  type IndexedRelation,
  type SubstraitDocument,
} from '@dvt/substrait-analysis';
import { reconcileCanvasModelLayout } from './canvasModelLayoutReconciliation';
import { CANVAS_RELATIONAL_OUTPUT_POSITION_ID } from './canvasRelationalTreeGeometry';

const input: ModelSqlSourceContext['inputs'][number] = {
  nodeId: 'orders',
  sqlName: 'orders',
  columns: ['id', 'country'].map((name) => ({
    id: name,
    name,
    type: sourceFieldType('string', true),
  })),
  source: {
    names: ['public', 'orders'],
    sourceRef: {
      schemaVersion: 'connected-source-ref.v1',
      connectionRef: {
        schemaVersion: 'connection-ref.v1',
        provider: 'postgres',
        connectionId: 'warehouse',
      },
      sourceObjectId: 'public.orders',
    },
  },
};

function generate(column: string, currentDocument?: SubstraitDocument): SubstraitDocument {
  const retainedRead =
    currentDocument == null
      ? undefined
      : [...deriveSubstraitSchemas(currentDocument).index.relations.values()].find(
          (entry) => entry.relation.relType.case === 'read'
        );
  const ast: PostgresAstNode = {
    SelectStmt: {
      op: 'SETOP_NONE',
      targetList: [{ ResTarget: { val: pgColumnRef(column) } }],
      fromClause: [pgRangeVar({ table: 'orders' })],
    },
  };
  return compileModelSqlSource(ast, { inputs: [{ ...input, retainedRead }], currentDocument })
    .document;
}

function branchJoin(columns: readonly [string, string]): SubstraitDocument {
  const branch = (column: string, alias: string): PostgresAstNode =>
    pgRangeSubselect(
      {
        SelectStmt: {
          op: 'SETOP_NONE',
          targetList: [{ ResTarget: { val: pgColumnRef(column) } }],
          fromClause: [pgRangeVar({ table: 'orders' })],
        },
      },
      alias
    );
  return compileModelSqlSource(
    {
      SelectStmt: {
        op: 'SETOP_NONE',
        targetList: [
          { ResTarget: { val: pgQualifiedColumnRef('a', columns[0]), name: 'left_value' } },
          { ResTarget: { val: pgQualifiedColumnRef('b', columns[1]), name: 'right_value' } },
        ],
        fromClause: [
          {
            JoinExpr: {
              jointype: 'JOIN_INNER',
              larg: branch(columns[0], 'a'),
              rarg: branch(columns[1], 'b'),
              quals: pgComparison(
                '=',
                pgQualifiedColumnRef('a', columns[0]),
                pgQualifiedColumnRef('b', columns[1])
              ),
            },
          },
        ],
      },
    },
    { inputs: [input] }
  ).document;
}

describe('canonical Model layout correspondence', () => {
  it('keeps exact input, regenerated operation and Output world coordinates without rewriting either document', () => {
    const old = generate('id');
    const next = generate('id', old);
    const oldIndex = deriveSubstraitSchemas(old).index;
    const nextIndex = deriveSubstraitSchemas(next).index;
    expect(nextIndex.rootId).not.toBe(oldIndex.rootId);
    const readId = oldIndex.postorder[0]!;
    const positions = new Map([
      [readId, { x: -400, y: 250 }],
      [oldIndex.rootId, { x: 700, y: -100 }],
      [CANVAS_RELATIONAL_OUTPUT_POSITION_ID, { x: 1200, y: 500 }],
    ]);
    const before = structuredClone({ old, next, positions });
    const result = reconcileCanvasModelLayout(old, next, positions);
    expect(result.get(readId)).toEqual(positions.get(readId));
    expect(result.get(nextIndex.rootId)).toEqual(positions.get(oldIndex.rootId));
    expect(result.get(CANVAS_RELATIONAL_OUTPUT_POSITION_ID)).toEqual(
      positions.get(CANVAS_RELATIONAL_OUTPUT_POSITION_ID)
    );
    expect(result.has(oldIndex.rootId)).toBe(false);
    const third = generate('id', next);
    const thirdRoot = deriveSubstraitSchemas(third).index.rootId;
    const repeated = reconcileCanvasModelLayout(next, third, result);
    expect(repeated.get(thirdRoot)).toEqual(positions.get(oldIndex.rootId));
    expect(repeated.has(nextIndex.rootId)).toBe(false);
    expect(repeated.size).toBe(result.size);
    expect({ old, next, positions }).toEqual(before);
  });

  it('does not give a changed operation the prior operation coordinates by class, label or ordinal', () => {
    const old = generate('id');
    const next = generate('country', old);
    const oldRoot = deriveSubstraitSchemas(old).index.rootId;
    const nextRoot = deriveSubstraitSchemas(next).index.rootId;
    const result = reconcileCanvasModelLayout(
      old,
      next,
      new Map([
        [oldRoot, { x: 900, y: -200 }],
        ['rel:old-digest:root', { x: 40, y: 80 }],
      ])
    );
    expect(result.has(nextRoot)).toBe(false);
    expect(result.has(oldRoot)).toBe(false);
    expect(result.has('rel:old-digest:root')).toBe(false);
  });

  it('follows two distinct operations of the same class when branches are reordered, rather than swapping by index', () => {
    const old = branchJoin(['id', 'country']);
    const next = branchJoin(['country', 'id']);
    const projects = (document: SubstraitDocument): IndexedRelation[] =>
      [...deriveSubstraitSchemas(document).index.relations.values()].filter(
        (entry) => entry.relation.relType.case === 'project' && entry.fields.length === 1
      );
    const previous = projects(old);
    expect(previous).toHaveLength(2);
    const positions = new Map(
      previous.map((entry, ordinal) => [entry.binding.relationId, { x: 500, y: ordinal * 300 }])
    );
    const result = reconcileCanvasModelLayout(old, next, positions);
    for (const entry of projects(next)) {
      const corresponding = previous.find(
        (candidate) => candidate.fields[0]!.displayName === entry.fields[0]!.displayName
      )!;
      expect(result.get(entry.binding.relationId)).toEqual(
        positions.get(corresponding.binding.relationId)
      );
    }
  });

  it('does not transfer ambiguous duplicate operation or self-join input positions', () => {
    const old = branchJoin(['id', 'id']);
    const next = branchJoin(['id', 'id']);
    const oldIndex = deriveSubstraitSchemas(old).index;
    const nextIndex = deriveSubstraitSchemas(next).index;
    const positions = new Map(
      oldIndex.postorder.map((id, ordinal) => [id, { x: 500, y: ordinal * 300 }])
    );
    const result = reconcileCanvasModelLayout(old, next, positions);
    for (const entry of nextIndex.relations.values()) {
      if (entry.relation.relType.case === 'read')
        expect(result.has(entry.binding.relationId)).toBe(false);
      if (entry.relation.relType.case === 'project' && entry.fields.length === 1)
        expect(result.has(entry.binding.relationId)).toBe(false);
    }
  });
});
