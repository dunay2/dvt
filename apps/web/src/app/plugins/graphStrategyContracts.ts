/** Owned concern: define plugin-neutral Canvas graph strategy contracts. */
import type { CanonicalEdge, CanonicalNode } from '../types/canonical';

export type CanvasGraphAuthoringMode = 'dbt' | 'transformation';

export type CanvasGraphAuthoringPolicy = Readonly<{
  toolbarMode: CanvasGraphAuthoringMode;
  enforceTransformationTopology: boolean;
}>;

export interface CanvasGraphStrategy {
  id: string;
  authoringPolicy: CanvasGraphAuthoringPolicy;
  mapNodeToCanonical: (node: unknown) => CanonicalNode | null;
  mapEdgeToCanonical: (edge: unknown) => CanonicalEdge | null;
  parseDropPayload: (dataTransfer: DataTransfer) => CanonicalNode | null;
}
