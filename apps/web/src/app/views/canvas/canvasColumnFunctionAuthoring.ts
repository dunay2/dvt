/** Owned concern: derive card-level outputs through the calculated-output command rail. */
import type { CanonicalNode } from '../../types/canonical';
import { applyCanvasCalculatedColumn } from './canvasCalculatedColumnAuthoring';
import type { CanvasDraftSession } from './canvasDraftSession';

export type CanvasColumnFunctionIdentity = Readonly<{
  nodeId: string;
  operandFieldIds: readonly [string, ...string[]];
  capabilityId: string;
  alias: string;
}>;

export type CanvasColumnFunctionResult =
  | Readonly<{
      outcome: 'applied';
      draftSession: CanvasDraftSession;
      createdFieldId: string;
    }>
  | Readonly<{ outcome: 'rejected' }>;

export function applyCanvasColumnFunction(args: {
  draftSession: CanvasDraftSession;
  canonicalNodesById: ReadonlyMap<string, CanonicalNode>;
  identity: CanvasColumnFunctionIdentity;
}): CanvasColumnFunctionResult {
  const result = applyCanvasCalculatedColumn({
    draftSession: args.draftSession,
    canonicalNodesById: args.canonicalNodesById,
    request: {
      nodeId: args.identity.nodeId,
      kind: 'scalar-function',
      alias: args.identity.alias,
      operandFieldIds: args.identity.operandFieldIds,
      capabilityId: args.identity.capabilityId,
    },
  });
  return result.outcome === 'applied'
    ? {
        outcome: 'applied',
        draftSession: result.draftSession,
        createdFieldId: result.createdFieldId,
      }
    : { outcome: 'rejected' };
}
