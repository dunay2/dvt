/** Trace direct canonical values; dependency sets alone cannot preserve publication identity. */
import { JoinRel_JoinType } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import { PlanSchema } from '@buf/substrait_substrait.bufbuild_es/substrait/plan_pb.js';
import { toBinary } from '@bufbuild/protobuf';
import { sha256Hex } from '@dvt/crypto';
import {
  deriveSubstraitSchemas,
  readRelationStructure,
  type SubstraitDocument,
  type SubstraitSchemas,
} from '@dvt/substrait-analysis';

import { dvtSubstraitExpressionReader } from '../substraitExpressionReader.js';
import { hasPinnedPlanVersion } from '../substraitJoinInspectionGuards.js';

import { sourceError } from './context.js';

export function checkedSourceAnalysis(document: SubstraitDocument): SubstraitSchemas {
  if (
    !hasPinnedPlanVersion(document.plan) ||
    sha256Hex(toBinary(PlanSchema, document.plan)) !== document.sidecar.semanticPlanSha256
  )
    sourceError('invalid_model', 'Retained semantic authority is stale or not pinned.');
  return deriveSubstraitSchemas(document);
}

export function directReadOrigin(
  analysis: SubstraitSchemas,
  relationId: string,
  outputOrdinal: number
): Readonly<{ relationId: string; fieldId: string }> | null {
  let id = relationId;
  let ordinal = outputOrdinal;
  for (let step = 0; step < analysis.index.relations.size; step += 1) {
    const entry = analysis.index.relations.get(id);
    if (entry == null) return null;
    const { common } = readRelationStructure(entry.relation);
    const raw =
      common?.emitKind.case === 'emit' ? common.emitKind.value.outputMapping[ordinal] : ordinal;
    if (raw == null) return null;
    const kind = entry.relation.relType;
    if (kind.case === 'read') {
      const field = entry.fields[ordinal];
      return common?.emitKind.case === 'emit' || field?.parentFieldId != null || field == null
        ? null
        : { relationId: id, fieldId: field.fieldId };
    }
    if (kind.case === 'project') {
      const width = analysis.schemas.get(entry.inputs[0]!)?.length;
      if (width == null) return null;
      const input =
        raw < width
          ? raw
          : dvtSubstraitExpressionReader.fieldOrdinal(kind.value.expressions[raw - width]);
      if (input == null) return null;
      id = entry.inputs[0]!;
      ordinal = input;
    } else if (kind.case === 'filter' || kind.case === 'sort' || kind.case === 'fetch') {
      id = entry.inputs[0]!;
      ordinal = raw;
    } else if (kind.case === 'join' || kind.case === 'cross') {
      const rightOnly =
        kind.case === 'join' &&
        (kind.value.type === JoinRel_JoinType.RIGHT_SEMI ||
          kind.value.type === JoinRel_JoinType.RIGHT_ANTI);
      const leftOnly =
        kind.case === 'join' &&
        (kind.value.type === JoinRel_JoinType.LEFT_SEMI ||
          kind.value.type === JoinRel_JoinType.LEFT_ANTI);
      const leftWidth = rightOnly ? 0 : analysis.schemas.get(entry.inputs[0]!)?.length;
      if (leftWidth == null || (leftOnly && raw >= leftWidth)) return null;
      id = entry.inputs[raw < leftWidth ? 0 : 1]!;
      ordinal = raw < leftWidth ? raw : raw - leftWidth;
    } else return null;
  }
  return null;
}
