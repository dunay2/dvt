/** Owned concern: define plugin-owned graph node card projection strategies. */
import type { CanonicalNode } from '../../types/canonical';

export type GraphNodeCardMetric = Readonly<{
  id: string;
  label: string;
  value: string;
  detail?: string;
  icon?: GraphNodeCardMetricIcon;
  tone?: GraphNodeCardStatusTone;
}>;

export type GraphNodeCardMetricIcon =
  'clock' | 'refresh' | 'throughput' | 'database' | 'columns' | 'timer' | 'rows' | 'cost' | 'drift';

export type GraphNodeCardAccentTone =
  'source' | 'model' | 'test' | 'output' | 'control' | 'unknown';

export type GraphNodeOperationalDetail = Readonly<{
  title: string;
  ariaLabel: string;
  rows: readonly GraphNodeCardMetric[];
}>;

export type GraphNodeCardStatusTone =
  'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'running';

export type GraphNodeCardHealth = Readonly<{
  label: string;
  tone: 'healthy' | 'failed' | 'neutral';
}>;

export type GraphNodeSourceIdentity = Readonly<{
  ariaLabel: string;
  rows: readonly Readonly<{
    id: 'database' | 'connection' | 'schema' | 'user';
    label: string;
    value: string;
  }>[];
}>;

export type GraphNodeCardReadModel = Readonly<{
  title: string;
  technicalName: string | null;
  subtitle: string | null;
  path: string | null;
  kindLabel: string;
  accentTone: GraphNodeCardAccentTone;
  health: GraphNodeCardHealth;
  metrics: readonly GraphNodeCardMetric[];
  operationalMetrics: readonly GraphNodeCardMetric[];
  operationalDetail: GraphNodeOperationalDetail | null;
  sourceIdentity: GraphNodeSourceIdentity | null;
  nodeActionsLabel: string;
}>;

export type GraphNodeCardStrategy = Readonly<{
  id: string;
  matches: (node: CanonicalNode) => boolean;
  build: (node: CanonicalNode, data: Record<string, unknown>) => GraphNodeCardReadModel;
}>;
