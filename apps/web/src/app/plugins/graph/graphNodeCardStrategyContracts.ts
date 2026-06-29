/** Owned concern: define plugin-owned graph node card projection strategies. */
import type { CanonicalNode } from '../../types/canonical';

export type GraphNodeCardMetric = Readonly<{
  id: string;
  label: string;
  value: string;
}>;

export type GraphNodeCardStatusTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

export type GraphNodeCardStatus = Readonly<{
  label: string;
  tone: GraphNodeCardStatusTone;
}>;

export type GraphNodeCardReadModel = Readonly<{
  title: string;
  subtitle: string | null;
  path: string | null;
  kindLabel: string;
  status: GraphNodeCardStatus;
  metrics: readonly GraphNodeCardMetric[];
  operationalMetrics: readonly GraphNodeCardMetric[];
}>;

export type GraphNodeCardStrategy = Readonly<{
  id: string;
  matches: (node: CanonicalNode) => boolean;
  build: (node: CanonicalNode, data: Record<string, unknown>) => GraphNodeCardReadModel;
}>;
