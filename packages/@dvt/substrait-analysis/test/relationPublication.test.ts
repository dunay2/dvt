import {
  AggregateFunctionSchema,
  ExpressionSchema,
  SetRel_SetOp,
  type Expression,
} from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import { PlanSchema } from '@buf/substrait_substrait.bufbuild_es/substrait/plan_pb.js';
import { Type_Nullability } from '@buf/substrait_substrait.bufbuild_es/substrait/type_pb.js';
import { create } from '@bufbuild/protobuf';
import { describe, expect, it } from 'vitest';

import { deriveSubstraitPublication } from '../src/relationPublication.js';

import { relationsFixture } from './relationsFixture.js';

const selection = (field: number): Expression =>
  create(ExpressionSchema, {
    rexType: {
      case: 'selection',
      value: {
        rootType: { case: 'rootReference', value: {} },
        referenceType: {
          case: 'directReference',
          value: {
            referenceType: { case: 'structField', value: { field } },
          },
        },
      },
    },
  });

describe('publication after withdrawing an admitted input field', () => {
  it('retains authored identities but propagates missing value dependencies through aliases', () => {
    const g = relationsFixture();
    const input = g.combine('cross', [g.read(), g.read()], [0, 1]);
    const project = g.unary('project', input, [0, 1]);
    const document = g.document(g.unary('project', project, [1, 0]));
    const before = globalThis.structuredClone(document);
    const result = deriveSubstraitPublication(document, new Set(['f1']));
    expect(result.get('r4')?.unavailableFieldIds).toEqual(['f4']);
    expect(result.get('r5')?.unavailableFieldIds).toEqual(['f5_1']);
    expect(result.get('r5')?.rowUnavailable).toBe(false);
    expect(document).toEqual(before);
    expect(deriveSubstraitPublication(document, new Set()).get('r5')?.unavailableFieldIds).toEqual(
      []
    );
  });

  it('does not mark constants invalid, but does mark expressions reading a missing field', () => {
    const g = relationsFixture();
    const project = g.unary('project', g.read(), [1, 2]);
    if (project.relType.case !== 'project') throw new Error('Expected project');
    project.relType.value.expressions = [
      selection(0),
      create(ExpressionSchema, {
        rexType: { case: 'literal', value: { literalType: { case: 'string', value: '' } } },
      }),
    ];
    expect(
      deriveSubstraitPublication(g.document(project), new Set(['f1'])).get('r2')
    ).toMatchObject({ unavailableFieldIds: ['f2'], rowUnavailable: false });
  });

  it('does not invalidate a projection which no longer uses the missing input', () => {
    const g = relationsFixture();
    const input = g.combine('cross', [g.read(), g.read()], [0, 1]);
    expect(
      deriveSubstraitPublication(g.document(g.unary('project', input, [1])), new Set(['f1'])).get(
        'r4'
      )?.unavailableFieldIds
    ).toEqual([]);
  });

  it.each([SetRel_SetOp.UNION_ALL, SetRel_SetOp.UNION_DISTINCT])(
    'distinguishes SET value dependencies from row comparison dependencies (%s)',
    (op) => {
      const g = relationsFixture();
      const left = g.combine('cross', [g.read(), g.read()], [0, 1]);
      const right = g.combine('cross', [g.read(), g.read()], [0, 1]);
      const relation = g.combine('set', [left, right], [1]);
      if (relation.relType.case !== 'set') throw new Error('Expected set');
      relation.relType.value.op = op;
      expect(deriveSubstraitPublication(g.document(relation), new Set(['f1'])).get('r7')).toEqual({
        unavailableFieldIds: op === SetRel_SetOp.UNION_ALL ? [] : ['f7'],
        rowUnavailable: op !== SetRel_SetOp.UNION_ALL,
      });
    }
  );

  it.each(['filter', 'sort'] as const)(
    'invalidates all outputs of a broken %s row dependency',
    (kind) => {
      const g = relationsFixture();
      const input = g.combine('cross', [g.read(), g.read()], [0, 1]);
      const relation = g.unary(kind, input, [1]);
      if (relation.relType.case === 'filter') relation.relType.value.condition = selection(0);
      if (relation.relType.case === 'sort')
        relation.relType.value.sorts = [
          {
            $typeName: 'substrait.SortField',
            expr: selection(0),
            sortKind: { case: undefined },
          },
        ];
      expect(
        deriveSubstraitPublication(g.document(relation), new Set(['f1'])).get('r4')
      ).toMatchObject({ unavailableFieldIds: ['f4'], rowUnavailable: true });
    }
  );
});

describe('publication after losing an entire Read', () => {
  it.each(['constant projection', 'COUNT(*)'] as const)(
    'propagates missing rows through %s without requiring a denied field',
    (kind) => {
      const g = relationsFixture();
      const read = g.read();
      const consumer =
        kind === 'COUNT(*)' ? g.unary('aggregate', read) : g.unary('project', read, [1]);
      if (consumer.relType.case === 'aggregate') {
        consumer.relType.value.measures = [
          {
            $typeName: 'substrait.AggregateRel.Measure',
            measure: create(AggregateFunctionSchema, {
              functionReference: 1,
              outputType: {
                kind: { case: 'i64', value: { nullability: Type_Nullability.REQUIRED } },
              },
            }),
          },
        ];
      } else if (consumer.relType.case === 'project') {
        consumer.relType.value.expressions = [
          create(ExpressionSchema, {
            rexType: {
              case: 'literal',
              value: { literalType: { case: 'string', value: 'constant' } },
            },
          }),
        ];
      }
      const independentRead = g.read();
      const document = g.document(g.combine('cross', [consumer, independentRead], [0, 1]));
      if (kind === 'COUNT(*)') {
        const functions = create(PlanSchema, {
          extensionUrns: [
            { extensionUrnAnchor: 1, urn: 'extension:io.substrait:functions_aggregate_generic' },
          ],
          extensions: [
            {
              mappingType: {
                case: 'extensionFunction',
                value: {
                  extensionUrnReference: 1,
                  functionAnchor: 1,
                  name: 'count',
                },
              },
            },
          ],
        });
        document.plan.extensionUrns = functions.extensionUrns;
        document.plan.extensions = functions.extensions;
      }
      const before = globalThis.structuredClone(document);
      const result = deriveSubstraitPublication(document, new Set(), new Set(['r1']));
      expect(result.get('r1')).toEqual({ rowUnavailable: true, unavailableFieldIds: ['f1'] });
      expect(result.get('r2')).toEqual({ rowUnavailable: true, unavailableFieldIds: ['f2'] });
      expect(result.get('r3')).toEqual({ rowUnavailable: false, unavailableFieldIds: [] });
      expect(result.get('r4')).toEqual({
        rowUnavailable: true,
        unavailableFieldIds: ['f4', 'f4_1'],
      });
      expect(document).toEqual(before);
    }
  );

  it('preserves existing callers and ignores unavailable identities which are not Reads', () => {
    const g = relationsFixture();
    const document = g.document(g.unary('project', g.read()));
    const existing = deriveSubstraitPublication(document, new Set(['f1']));
    expect(deriveSubstraitPublication(document, new Set(['f1']), new Set())).toEqual(existing);
    expect(
      deriveSubstraitPublication(document, new Set(['f1']), new Set(['r2', 'absent']))
    ).toEqual(existing);
    expect(existing.get('r2')).toEqual({ rowUnavailable: false, unavailableFieldIds: ['f2'] });
  });
});
