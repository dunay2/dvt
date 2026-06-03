/** Owned concern: define plugin-neutral Canvas graph strategy contracts. */
import type { CanonicalEdge, CanonicalNode } from '../types/canonical';

export interface CanvasGraphStrategy {
  id: string;
  mapNodeToCanonical: (node: unknown) => CanonicalNode | null;
  mapEdgeToCanonical: (edge: unknown) => CanonicalEdge | null;
  parseDropPayload: (dataTransfer: DataTransfer) => CanonicalNode | null;
}
