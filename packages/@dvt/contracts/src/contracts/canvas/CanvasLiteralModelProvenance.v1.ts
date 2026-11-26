/**
 * Own the execution identity of a canonical literal Model without claiming a warehouse source.
 * @baseline ADR-0064: Substrait owns relation semantics and stable authoring identity.
 * @decision Literal provenance names the authorized connection and exact semantic plan.
 * @consequence A source-free result cannot masquerade as physical or file-model lineage.
 * @version 1.0.0
 */
import { z } from 'zod';

import { isSha256HexString } from '../../utils/contractPrimitives.js';
import { ConnectionRefSchema } from '../source-import/ConnectedSourceRef.v1.js';

export const CanvasLiteralModelProvenanceSchema = z
  .object({
    connectionRef: ConnectionRefSchema.refine((connection) => connection.provider === 'postgres'),
    semanticPlanSha256: z.string().refine(isSha256HexString),
  })
  .strict();

export function hasCanvasModelProvenance(
  value: Readonly<{
    sourceRefs: readonly unknown[];
    modelRefs?: readonly unknown[] | undefined;
    literalModel?: unknown;
  }>
): boolean {
  if (value.literalModel != null)
    return value.sourceRefs.length === 0 && value.modelRefs === undefined;
  return value.sourceRefs.length > 0 || (value.modelRefs?.length ?? 0) > 0;
}

export function matchesCanvasLiteralPlan(
  value: Readonly<{
    semanticPlanSha256: string;
    provenance: { literalModel?: { semanticPlanSha256: string } | undefined };
  }>
): boolean {
  const literal = value.provenance.literalModel;
  return literal == null || literal.semanticPlanSha256 === value.semanticPlanSha256;
}
