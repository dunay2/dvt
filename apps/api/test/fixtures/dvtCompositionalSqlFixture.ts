import { readFileSync } from 'node:fs';
import { URL } from 'node:url';

import {
  RelSchema,
  JoinRel_JoinType,
  SetRel_SetOp,
} from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import { create } from '@bufbuild/protobuf';
import { decodeDvtSubstraitPlanV1, DvtSubstraitSemanticDocumentV1Schema } from '@dvt/contracts';
import type { SubstraitDocument } from '@dvt/substrait-analysis';

/** Reuse the serialized package fixture across the public package boundary. */
export function compositionalFixture(
  kind: 'join' | 'cross' | 'set',
  type = JoinRel_JoinType.INNER,
  calculated = false
): SubstraitDocument {
  const document = DvtSubstraitSemanticDocumentV1Schema.parse(
    JSON.parse(
      readFileSync(
        new URL(
          '../../../../packages/@dvt/postgres-projection/test/fixtures/composed-relations-document.json',
          import.meta.url
        ),
        'utf8'
      )
    )
  );
  const plan = decodeDvtSubstraitPlanV1(document);
  const root = plan.relations[0]!.relType;
  if (root.case !== 'root' || root.value.input?.relType.case !== 'join')
    throw new Error('Expected composed JOIN fixture');
  const join = root.value.input.relType.value;
  const inputs = [join.left!, join.right!];
  const single =
    kind === 'set' ||
    [
      JoinRel_JoinType.LEFT_SEMI,
      JoinRel_JoinType.RIGHT_SEMI,
      JoinRel_JoinType.LEFT_ANTI,
      JoinRel_JoinType.RIGHT_ANTI,
    ].includes(type);
  if (single) {
    root.value.names = [root.value.names[0]!];
    join.common!.emitKind = {
      case: 'emit',
      value: { $typeName: 'substrait.RelCommon.Emit', outputMapping: [0] },
    };
    document.sidecar.fields = document.sidecar.fields.filter(
      (field) => field.relationId !== 'r7' || field.outputOrdinal === 0
    );
  }
  if (calculated) {
    const right = inputs[1]!.relType;
    if (right.case !== 'project' || right.value.input?.relType.case !== 'filter')
      throw new Error('Expected projected filter');
    const expression = right.value.input.relType.value.condition!;
    for (const input of inputs) {
      if (input.relType.case !== 'project') throw new Error('Expected project');
      input.relType.value.expressions = [globalThis.structuredClone(expression)];
    }
  }
  const { common } = join;
  if (kind === 'cross')
    root.value.input = create(RelSchema, {
      relType: { case: 'cross', value: { common, left: inputs[0], right: inputs[1] } },
    });
  if (kind === 'set')
    root.value.input = create(RelSchema, {
      relType: { case: 'set', value: { common, inputs, op: SetRel_SetOp.UNION_ALL } },
    });
  if (kind === 'join') join.type = type;
  document.sidecar.semanticPlanSha256 = '0'.repeat(64);
  return { plan, sidecar: document.sidecar };
}
