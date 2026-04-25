/** Owned concern: define plugin-neutral Canvas graph strategy contracts. */
import type { CanonicalEdge, CanonicalNode } from '../types/canonical';
import type { CanvasKindRegistration } from './nodeTypeContracts';

export type CanvasGraphAuthoringMode = CanvasKindRegistration['kind'];

export type CanvasGraphAuthoringPolicy = Readonly<{
  canvasKind: CanvasGraphAuthoringMode;
}>;

export interface CanvasGraphStrategy {
  id: string;
  authoringPolicy: CanvasGraphAuthoringPolicy;
  mapNodeToCanonical: (node: unknown) => CanonicalNode | null;
  mapEdgeToCanonical: (edge: unknown) => CanonicalEdge | null;
  parseDropPayload: (dataTransfer: DataTransfer) => CanonicalNode | null;
}
