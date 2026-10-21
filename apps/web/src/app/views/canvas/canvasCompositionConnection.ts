/** Resolve one execution connection from every exact composition Read and admitted input. */
import type { ConnectionRef } from '@dvt/contracts';
import { hasSameConnectionRef } from '@dvt/postgres-projection';
import type { SubstraitDocument } from '@dvt/substrait-analysis';
import type { CanvasDvtCompositionInput } from './canvasDvtCompositionInputCatalog';
import { canvasInputConnection } from './canvasSourceRelation';

export type CanvasCompositionConnection =
  | Readonly<{ state: 'available'; connection: ConnectionRef }>
  | Readonly<{
      state: 'unavailable';
      reason: 'missing-input' | 'mixed-connections' | 'missing-connection';
    }>;

export function resolveCanvasCompositionConnection(
  documents: readonly SubstraitDocument[],
  inputs: readonly CanvasDvtCompositionInput[]
): CanvasCompositionConnection {
  let connection: ConnectionRef | undefined;
  for (const document of documents) {
    for (const binding of document.sidecar.relations) {
      if (binding.sourceRef == null && binding.producerRef == null) continue;
      const input = inputs.find((candidate) =>
        binding.sourceRef != null
          ? candidate.sourceRef != null &&
            candidate.sourceRef.sourceObjectId === binding.sourceRef.sourceObjectId &&
            hasSameConnectionRef(candidate.sourceRef.connectionRef, binding.sourceRef.connectionRef)
          : candidate.producer?.nodeId === binding.producerRef?.nodeId
      );
      if (input == null) return { state: 'unavailable', reason: 'missing-input' };
      const current = canvasInputConnection(input);
      if (connection != null && !hasSameConnectionRef(connection, current))
        return { state: 'unavailable', reason: 'mixed-connections' };
      connection = current;
    }
  }
  return connection == null
    ? { state: 'unavailable', reason: 'missing-connection' }
    : { state: 'available', connection };
}
