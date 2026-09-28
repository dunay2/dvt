/** Resolve exact reusable JOIN-normalization outputs from canonical ProjectRel semantics. */
import { inspectDvtSubstraitJoinOperandExpression } from '@dvt/postgres-projection';

import {
  dvtSubstraitJoinOperandCapabilityIds,
  type DvtSubstraitInspectedJoinOperand,
} from './canvasDvtSubstraitJoinOperand';
import {
  projectJoinNormalization,
  type JoinNormalizationProjection,
  type JoinNormalizationTransformation,
} from './canvasJoinNormalizationProposal';
import type { CanvasRelationAnalysisSession } from './canvasRelationAnalysisSession';
import { relationOutputMapping } from './canvasRelationOutputBindings';
import { rootFields } from './canvasDerivedOutputExpression';
import type { SelectedJoin } from './canvasSelectedJoin';

function terminalFieldOrdinal(operand: DvtSubstraitInspectedJoinOperand): number | null {
  let current = operand;
  while (current.kind === 'function') current = current.input;
  return current.kind === 'field' ? current.ordinal : null;
}

function exactCapabilityChain(
  operand: DvtSubstraitInspectedJoinOperand
): readonly string[] | null {
  const ordinal = terminalFieldOrdinal(operand);
  if (ordinal == null) return null;
  return [...dvtSubstraitJoinOperandCapabilityIds(operand)].reverse();
}

function sameCapabilities(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

export async function resolveJoinNormalizationReusableField(
  session: CanvasRelationAnalysisSession,
  selected: SelectedJoin,
  transformation: JoinNormalizationTransformation,
  signal?: AbortSignal
): Promise<string | null> {
  const inputIndex = selected.inputs.findIndex(
    (input) => input.relationId === transformation.inputRelationId
  );
  const input = selected.inputs[inputIndex];
  if (input == null) return null;

  const base = rootFields(input.bindings).find(
    (field) => field.fieldId === transformation.baseFieldId
  );
  // Reuse is intentionally conservative: prove the inline operand is a direct
  // passthrough of the same stable upstream FieldId. Derived-on-derived reuse
  // needs a deeper equivalence proof and remains create-only.
  if (base?.sourceFieldId == null) return null;

  const location = session.locate(input.relationId, selected.revision);
  if (location.relation.relType.case !== 'project' || location.inputs.length !== 1) return null;
  const project = location.relation.relType.value;
  const source = await session.query(location.inputs[0]!, signal);
  const sourceFields = rootFields(source.bindings);
  const mapping = relationOutputMapping(
    location.relation,
    sourceFields.length + project.expressions.length
  );

  for (const candidate of rootFields(input.bindings)) {
    if (candidate.fieldId === transformation.baseFieldId) continue;
    const slot = mapping[candidate.outputOrdinal];
    if (slot == null || slot < sourceFields.length) continue;
    const expression = project.expressions[slot - sourceFields.length];
    if (expression == null) continue;
    const inspected = inspectDvtSubstraitJoinOperandExpression(location.plan, expression);
    if (inspected == null) continue;
    const terminalOrdinal = terminalFieldOrdinal(inspected);
    const capabilities = exactCapabilityChain(inspected);
    if (
      terminalOrdinal == null ||
      capabilities == null ||
      sourceFields[terminalOrdinal]?.fieldId !== base.sourceFieldId ||
      !sameCapabilities(capabilities, transformation.capabilityIds)
    ) {
      continue;
    }
    return candidate.fieldId;
  }
  return null;
}

export async function projectJoinNormalizationWithReuse(
  session: CanvasRelationAnalysisSession,
  selected: SelectedJoin,
  signal?: AbortSignal
): Promise<JoinNormalizationProjection> {
  const projected = projectJoinNormalization(selected);
  if (projected.outcome !== 'available') return projected;
  const transformations = await Promise.all(
    projected.proposal.transformations.map(async (transformation) => {
      const reuseFieldId = await resolveJoinNormalizationReusableField(
        session,
        selected,
        transformation,
        signal
      );
      return reuseFieldId == null ? transformation : { ...transformation, reuseFieldId };
    })
  );
  return {
    outcome: 'available',
    proposal: { ...projected.proposal, transformations },
  };
}
