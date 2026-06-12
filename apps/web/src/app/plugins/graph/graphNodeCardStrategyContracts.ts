/** Owned concern: define plugin-owned graph node card projection strategies. */
import type { CanonicalNode } from '../../types/canonical';

export type GraphNodeCardMetric = Readonly<{
  id: string;
  label: string;
  value: string;
}>;

export type GraphNodeCardReadModel = Readonly<{
  title: string;
  subtitle: string | null;
  kindLabel: string;
  metrics: readonly GraphNodeCardMetric[];
}>;

export type GraphNodeCardStrategy = Readonly<{
  id: string;
  matches: (node: CanonicalNode) => boolean;
  build: (node: CanonicalNode, data: Record<string, unknown>) => GraphNodeCardReadModel;
}>;
