import {
  ExpressionSchema,
  RelSchema,
  type Expression,
} from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import {
  TypeSchema,
  Type_Nullability,
} from '@buf/substrait_substrait.bufbuild_es/substrait/type_pb.js';
import { create } from '@bufbuild/protobuf';
import { describe, expect, it } from 'vitest';

import type { SubstraitDocument } from '../src/document.js';
import { RelationAnalysisSession } from '../src/relationAnalysisSession.js';
import { deriveSubstraitSchemas } from '../src/relationSchema.js';
import { deriveExpressionSchema } from '../src/schemaExpression.js';

import { relationsFixture } from './relationsFixture.js';

function structuredDocument(): SubstraitDocument {
  const f = relationsFixture();
  const read = f.read();
  const project = f.unary('project', read, [1]);
  if (project.relType.case !== 'project') throw new Error('Expected project');
  project.relType.value.expressions = [
    create(ExpressionSchema, {
      rexType: {
        case: 'nested',
        value: {
          nestedType: {
            case: 'struct',
            value: {
              fields: [
                selection(0),
                create(ExpressionSchema, {
                  rexType: {
                    case: 'literal',
                    value: { literalType: { case: 'string', value: 'constant' } },
                  },
                }),
              ],
            },
          },
        },
      },
    }),
  ];
  const document = f.document(project);
  const root = document.plan.relations[0]!.relType;
  if (root.case !== 'root') throw new Error('Expected root');
  root.value.names = ['record', 'value', 'label'];
  document.sidecar.fields.push(
    { fieldId: 'child:value', parentFieldId: 'f2', relationId: 'r2', outputOrdinal: 0 },
    { fieldId: 'child:label', parentFieldId: 'f2', relationId: 'r2', outputOrdinal: 1 }
  );
  return document;
}

function selection(ordinal: number, child?: number): Expression {
  return create(ExpressionSchema, {
    rexType: {
      case: 'selection',
      value: {
        rootType: { case: 'rootReference', value: {} },
        referenceType: {
          case: 'directReference',
          value: {
            referenceType: {
              case: 'structField',
              value: {
                field: ordinal,
                ...(child == null
                  ? {}
                  : {
                      child: {
                        referenceType: { case: 'structField' as const, value: { field: child } },
                      },
                    }),
              },
            },
          },
        },
      },
    },
  });
}

describe('composable structured schema', () => {
  it('derives children and exact dependencies, including the same facts from a hot session', async () => {
    const document = structuredDocument();
    const before = globalThis.structuredClone(document);
    const derived = deriveSubstraitSchemas(document);
    const expected = derived.schemas.get(derived.index.rootId)!;
    expect(expected).toMatchObject([
      {
        type: { kind: { case: 'struct' } },
        sourceFieldIds: ['f1'],
        children: [
          { type: { kind: { case: 'i64' } }, sourceFieldIds: ['f1'] },
          { type: { kind: { case: 'string' } }, sourceFieldIds: [] },
        ],
      },
    ]);
    const session = new RelationAnalysisSession({ scope: 'nested', document });
    expect((await session.query(session.rootId)).fields).toEqual(expected);
    const work = session.work;
    expect((await session.query(session.rootId)).fields).toEqual(expected);
    expect(session.work.analyzed).toBe(work.analyzed);
    expect(deriveExpressionSchema(selection(0, 1), expected).sourceFieldIds).toEqual([]);
    expect(() => deriveExpressionSchema(selection(0, 2), expected)).toThrow();
    expect(document).toEqual(before);
    session.dispose();
  });

  it('reads nested source bindings by sibling ordinal and propagates nullable parents on selection', () => {
    const document = structuredDocument();
    const root = document.plan.relations[0]!.relType;
    if (root.case !== 'root') throw new Error('Expected root');
    root.value.input = create(RelSchema, {
      relType: {
        case: 'read',
        value: {
          common: { relAnchor: 2 },
          readType: { case: 'namedTable', value: { names: ['raw', 'records'] } },
          baseSchema: {
            names: [...root.value.names],
            struct: {
              types: [
                create(TypeSchema, {
                  kind: {
                    case: 'struct',
                    value: {
                      nullability: Type_Nullability.NULLABLE,
                      types: [
                        {
                          kind: { case: 'i64', value: { nullability: Type_Nullability.REQUIRED } },
                        },
                        {
                          kind: {
                            case: 'string',
                            value: { nullability: Type_Nullability.REQUIRED },
                          },
                        },
                      ],
                    },
                  },
                }),
              ],
            },
          },
        },
      },
    });
    document.sidecar.relations = document.sidecar.relations.filter((r) => r.relationId === 'r2');
    document.sidecar.fields = document.sidecar.fields.filter((f) => f.relationId === 'r2');
    const result = deriveSubstraitSchemas(document);
    const child = deriveExpressionSchema(selection(0, 1), result.schemas.get('r2')!);
    expect(child.sourceFieldIds).toEqual(['child:label']);
    expect(child.type.kind.value).toMatchObject({ nullability: Type_Nullability.NULLABLE });
  });

  it.each(['missing-name', 'bad-child-ordinal'] as const)(
    'rejects %s instead of flattening the schema',
    async (fault) => {
      const document = structuredDocument();
      const root = document.plan.relations[0]!.relType;
      if (root.case !== 'root') throw new Error('Expected root');
      if (fault === 'missing-name') root.value.names.pop();
      else document.sidecar.fields.at(-1)!.outputOrdinal = 2;
      expect(() => deriveSubstraitSchemas(document)).toThrow();
      const session = new RelationAnalysisSession({ scope: 'invalid', document });
      await expect(session.query(session.rootId)).rejects.toMatchObject({
        code: 'invalid_structure',
      });
      session.dispose();
    }
  );
});
