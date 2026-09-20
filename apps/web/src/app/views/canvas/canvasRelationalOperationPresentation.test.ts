import { create } from '@bufbuild/protobuf';
import {
  JoinRel_JoinType,
  JoinRelSchema,
  RelSchema,
  SetRel_SetOp,
  SetRelSchema,
  ReadRelSchema,
  FilterRelSchema,
  AggregateRelSchema,
  SortRelSchema,
  FetchRelSchema,
  ProjectRelSchema,
  CrossRelSchema,
  ExpressionSchema,
  Expression_WindowFunctionSchema,
} from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import { describe, expect, it } from 'vitest';
import { resolveCanvasViewCopy } from './canvasCopyCatalog';
import {
  canvasPresentationOperationForRel,
  canvasRelationalOperationPresentation,
  resolveCanvasRelationalOperationPresentation,
} from './canvasRelationalOperationPresentation';
import { canvasJoinOperationForType, toSubstraitJoinType } from './canvasRelationalTreeJoinType';

const cases = [
  ['projection', 'PROJECT', 'project'],
  ['inner_join', 'INNER JOIN', 'join'],
  ['left_join', 'LEFT JOIN', 'join'],
  ['right_join', 'RIGHT JOIN', 'join'],
  ['full_outer_join', 'FULL OUTER JOIN', 'join'],
  ['left_semi_join', 'LEFT SEMI JOIN', 'join'],
  ['left_anti_join', 'LEFT ANTI JOIN', 'join'],
  ['right_semi_join', 'RIGHT SEMI JOIN', 'join'],
  ['right_anti_join', 'RIGHT ANTI JOIN', 'join'],
  ['cross_join', 'CROSS JOIN', 'cross'],
  ['union_all', 'UNION ALL', 'set'],
  ['union_distinct', 'UNION DISTINCT', 'set'],
  ['intersect_distinct', 'INTERSECT', 'set'],
  ['except_distinct', 'EXCEPT', 'set'],
  ['intersect_all', 'INTERSECT ALL', 'set'],
  ['except_all', 'EXCEPT ALL', 'set'],
] as const;

describe('operation presentation catalog', () => {
  it('covers every composition operation exactly once', () => {
    expect(Object.keys(canvasRelationalOperationPresentation).sort()).toEqual(
      cases.map(([id]) => id).sort()
    );
  });
  it.each(cases)('%s supplies copy, icon and category', (id, label, category) => {
    const presentation = resolveCanvasRelationalOperationPresentation(id);
    expect(presentation.category).toBe(category);
    expect(presentation.icon).toBeDefined();
    expect(resolveCanvasViewCopy('en')[presentation.labelKey]).toBe(label);
    expect(resolveCanvasViewCopy('es')[presentation.labelKey]).toBe(
      id === 'projection' ? 'PROYECCIÓN' : label
    );
  });
  it.each([undefined, null, 'unknown', 'constructor', '__proto__', 999])(
    'keeps unknown %s unsupported',
    (value) => {
      const presentation = resolveCanvasRelationalOperationPresentation(value);
      expect(presentation.category).toBe('unsupported');
      expect(resolveCanvasViewCopy('es')[presentation.labelKey]).toBe('Operación no soportada');
    }
  );
  it.each([
    [
      'read',
      'Source',
      'Fuente',
      create(RelSchema, { relType: { case: 'read', value: create(ReadRelSchema) } }),
    ],
    [
      'filter',
      'Filter',
      'Filtrar',
      create(RelSchema, { relType: { case: 'filter', value: create(FilterRelSchema) } }),
    ],
    [
      'aggregate',
      'Aggregate',
      'Agrupar',
      create(RelSchema, { relType: { case: 'aggregate', value: create(AggregateRelSchema) } }),
    ],
    [
      'sort',
      'Order by',
      'Ordenar',
      create(RelSchema, { relType: { case: 'sort', value: create(SortRelSchema) } }),
    ],
    [
      'fetch',
      'Limit / offset',
      'Límite / desplazamiento',
      create(RelSchema, { relType: { case: 'fetch', value: create(FetchRelSchema) } }),
    ],
    [
      'projection',
      'PROJECT',
      'PROYECCIÓN',
      create(RelSchema, { relType: { case: 'project', value: create(ProjectRelSchema) } }),
    ],
    [
      'cross_join',
      'CROSS JOIN',
      'CROSS JOIN',
      create(RelSchema, { relType: { case: 'cross', value: create(CrossRelSchema) } }),
    ],
    [
      'window',
      'Window',
      'Ventana',
      create(RelSchema, {
        relType: {
          case: 'project',
          value: create(ProjectRelSchema, {
            expressions: [
              create(ExpressionSchema, {
                rexType: {
                  case: 'windowFunction',
                  value: create(Expression_WindowFunctionSchema, { functionReference: 77 }),
                },
              }),
            ],
          }),
        },
      }),
    ],
  ] as const)(
    'presents %s from its canonical relation, not a SQL string',
    (operation, en, es, rel) => {
      expect(canvasPresentationOperationForRel(rel)).toBe(operation);
      const presentation = resolveCanvasRelationalOperationPresentation(operation);
      expect(resolveCanvasViewCopy('en')[presentation.labelKey]).toBe(en);
      expect(resolveCanvasViewCopy('es')[presentation.labelKey]).toBe(es);
      expect(presentation.icon).toBeDefined();
    }
  );
  it.each([
    [JoinRel_JoinType.INNER, 'inner_join'],
    [JoinRel_JoinType.LEFT, 'left_join'],
    [JoinRel_JoinType.RIGHT, 'right_join'],
    [JoinRel_JoinType.OUTER, 'full_outer_join'],
    [JoinRel_JoinType.LEFT_SEMI, 'left_semi_join'],
    [JoinRel_JoinType.LEFT_ANTI, 'left_anti_join'],
    [JoinRel_JoinType.RIGHT_SEMI, 'right_semi_join'],
    [JoinRel_JoinType.RIGHT_ANTI, 'right_anti_join'],
  ] as const)('reads JOIN %s from canonical semantics', (type, operation) => {
    const rel = create(RelSchema, {
      relType: { case: 'join', value: create(JoinRelSchema, { type }) },
    });
    expect(canvasPresentationOperationForRel(rel)).toBe(operation);
    expect(canvasJoinOperationForType(type)).toBe(operation);
    expect(toSubstraitJoinType(operation)).toBe(type);
  });
  it.each([
    [SetRel_SetOp.UNION_ALL, 'union_all'],
    [SetRel_SetOp.UNION_DISTINCT, 'union_distinct'],
    [SetRel_SetOp.INTERSECTION_MULTISET, 'intersect_distinct'],
    [SetRel_SetOp.MINUS_PRIMARY, 'except_distinct'],
    [SetRel_SetOp.INTERSECTION_MULTISET_ALL, 'intersect_all'],
    [SetRel_SetOp.MINUS_PRIMARY_ALL, 'except_all'],
  ] as const)('reads Set %s from canonical semantics', (op, operation) => {
    const rel = create(RelSchema, {
      relType: { case: 'set', value: create(SetRelSchema, { op }) },
    });
    expect(canvasPresentationOperationForRel(rel)).toBe(operation);
  });
  it('does not translate unspecified or future selectors to INNER', () => {
    expect(canvasJoinOperationForType(JoinRel_JoinType.UNSPECIFIED)).toBe('unsupported');
    expect(canvasJoinOperationForType(999 as JoinRel_JoinType)).toBe('unsupported');
    expect(() => toSubstraitJoinType('invalid' as never)).toThrow(/unsupported/i);
    expect(canvasPresentationOperationForRel(create(RelSchema))).toBe('unsupported');
    expect(
      canvasPresentationOperationForRel(
        create(RelSchema, { relType: { case: 'set', value: create(SetRelSchema) } })
      )
    ).toBe('unsupported');
  });
});
