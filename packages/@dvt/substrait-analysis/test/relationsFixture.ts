import {
  RelSchema,
  JoinRel_JoinType,
  SetRel_SetOp,
  type Rel,
} from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import { PlanSchema } from '@buf/substrait_substrait.bufbuild_es/substrait/plan_pb.js';
import { Type_Nullability } from '@buf/substrait_substrait.bufbuild_es/substrait/type_pb.js';
import { create } from '@bufbuild/protobuf';
import {
  DVT_SUBSTRAIT_AUTHORING_SIDECAR_SCHEMA_VERSION,
  encodeDvtSubstraitPlanV1,
  type DvtSubstraitAuthoringSidecarV1,
} from '@dvt/contracts';

import type { SubstraitDocument } from '../src/document.js';

type UnaryKind = 'project' | 'filter' | 'aggregate' | 'sort' | 'fetch';
type BinaryKind = 'join' | 'cross' | 'set';
type RelationsFixture = {
  read(): Rel;
  unary(kind: UnaryKind, input: Rel, outputMapping?: number[]): Rel;
  combine(kind: BinaryKind, inputs: Rel[], outputMapping?: number[]): Rel;
  document(root: Rel, signed?: boolean): SubstraitDocument;
};

export function relationsFixture(): RelationsFixture {
  const relations: DvtSubstraitAuthoringSidecarV1['relations'] = [];
  const fields: DvtSubstraitAuthoringSidecarV1['fields'] = [];
  function bind(rel: Rel, anchor: number, width = 1): Rel {
    relations.push({
      relationId: `r${anchor}`,
      relAnchor: anchor,
      displayName: `Instance ${anchor}`,
    });
    for (let ordinal = 0; ordinal < width; ordinal += 1) {
      fields.push({
        fieldId: ordinal === 0 ? `f${anchor}` : `f${anchor}_${ordinal}`,
        relationId: `r${anchor}`,
        outputOrdinal: ordinal,
        displayName: ordinal === 0 ? 'value' : `value_${ordinal}`,
      });
    }
    return rel;
  }
  function read(): Rel {
    const anchor = relations.length + 1;
    return bind(
      create(RelSchema, {
        relType: {
          case: 'read',
          value: {
            common: { relAnchor: anchor },
            baseSchema: {
              names: ['value'],
              struct: {
                types: [
                  { kind: { case: 'i64', value: { nullability: Type_Nullability.REQUIRED } } },
                ],
              },
            },
            readType: { case: 'namedTable', value: { names: ['raw', 'items'] } },
          },
        },
      }),
      anchor
    );
  }
  function unary(kind: UnaryKind, input: Rel, outputMapping = [0]): Rel {
    const anchor = relations.length + 1;
    const common = {
      relAnchor: anchor,
      emitKind: { case: 'emit' as const, value: { outputMapping } },
    };
    const rel =
      kind === 'filter'
        ? create(RelSchema, {
            relType: {
              case: kind,
              value: {
                input,
                common,
                condition: {
                  rexType: {
                    case: 'literal',
                    value: { literalType: { case: 'boolean', value: true } },
                  },
                },
              },
            },
          })
        : create(RelSchema, { relType: { case: kind, value: { input, common } } });
    return bind(rel, anchor, outputMapping.length);
  }
  function combine(kind: BinaryKind, inputs: Rel[], outputMapping = [0]): Rel {
    const anchor = relations.length + 1;
    const common = {
      relAnchor: anchor,
      emitKind: { case: 'emit' as const, value: { outputMapping } },
    };
    const rel =
      kind === 'set'
        ? create(RelSchema, {
            relType: { case: kind, value: { common, inputs, op: SetRel_SetOp.UNION_ALL } },
          })
        : kind === 'join'
          ? create(RelSchema, {
              relType: {
                case: kind,
                value: {
                  common,
                  left: inputs[0]!,
                  right: inputs[1]!,
                  type: JoinRel_JoinType.INNER,
                },
              },
            })
          : create(RelSchema, {
              relType: { case: kind, value: { common, left: inputs[0]!, right: inputs[1]! } },
            });
    return bind(rel, anchor, outputMapping.length);
  }
  function document(root: Rel, signed = false): SubstraitDocument {
    const plan = create(PlanSchema, {
      version: { majorNumber: 0, minorNumber: 101, patchNumber: 0 },
      relations: [
        {
          relType: {
            case: 'root',
            value: {
              input: root,
              names: fields
                .filter((field) => field.relationId === relations.at(-1)?.relationId)
                .map((field) => field.displayName!),
            },
          },
        },
      ],
    });
    const sidecar: DvtSubstraitAuthoringSidecarV1 = {
      schemaVersion: DVT_SUBSTRAIT_AUTHORING_SIDECAR_SCHEMA_VERSION,
      semanticPlanSha256: signed ? encodeDvtSubstraitPlanV1(plan).sha256 : '0'.repeat(64),
      relations,
      fields,
    };
    return { plan, sidecar };
  }
  return { read, unary, combine, document };
}
