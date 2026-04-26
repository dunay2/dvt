import { Cpu, Database, FileText, Package, Presentation, Table, TestTube, TrendingUp } from 'lucide-react';

import type { CoreNodeRole, PluginNodeKind } from '../types/canonical';
import type { DbtNodeType } from '../types/dbt';

import type { EdgeTypeStrategy, NodeKindRegistration } from './nodeTypeContracts';

export const DBT_NODE_KINDS: NodeKindRegistration[] = [
  {
    kind: 'dbt:source',
    pluginId: 'dbt',
    label: 'Source',
    role: 'input',
    previewStepKind: 'CANVAS_SOURCE',
    icon: Database,
    borderClass: 'border-purple-500',
    minimapColor: '#a855f7',
    allowsIncoming: false,
    allowsOutgoing: true,
    supportsColumns: true,
  },
  {
    kind: 'dbt:model',
    pluginId: 'dbt',
    label: 'Model',
    role: 'transform',
    previewStepKind: 'DBT_MODEL',
    icon: Table,
    borderClass: 'border-blue-500',
    minimapColor: '#3b82f6',
    allowsIncoming: true,
    allowsOutgoing: true,
    supportsColumns: true,
  },
  {
    kind: 'dbt:seed',
    pluginId: 'dbt',
    label: 'Seed',
    role: 'input',
    previewStepKind: 'CANVAS_SOURCE',
    icon: FileText,
    borderClass: 'border-green-500',
    minimapColor: '#22c55e',
    allowsIncoming: false,
    allowsOutgoing: true,
    supportsColumns: false,
  },
  {
    kind: 'dbt:snapshot',
    pluginId: 'dbt',
    label: 'Snapshot',
    role: 'transform',
    previewStepKind: 'DBT_SNAPSHOT',
    icon: Package,
    borderClass: 'border-yellow-500',
    minimapColor: '#eab308',
    allowsIncoming: true,
    allowsOutgoing: true,
    supportsColumns: false,
  },
  {
    kind: 'dbt:test',
    pluginId: 'dbt',
    label: 'Test',
    role: 'check',
    previewStepKind: 'DBT_TEST',
    icon: TestTube,
    borderClass: 'border-red-500',
    minimapColor: '#ef4444',
    allowsIncoming: true,
    allowsOutgoing: false,
    supportsColumns: false,
  },
  {
    kind: 'dbt:exposure',
    pluginId: 'dbt',
    label: 'Exposure',
    role: 'output',
    previewStepKind: 'CANVAS_SINK',
    icon: Presentation,
    borderClass: 'border-pink-500',
    minimapColor: '#ec4899',
    allowsIncoming: true,
    allowsOutgoing: false,
    supportsColumns: false,
  },
  {
    kind: 'dbt:metric',
    pluginId: 'dbt',
    label: 'Metric',
    role: 'output',
    previewStepKind: 'CANVAS_SINK',
    icon: TrendingUp,
    borderClass: 'border-orange-500',
    minimapColor: '#f97316',
    allowsIncoming: true,
    allowsOutgoing: false,
    supportsColumns: false,
  },
  {
    kind: 'dbt:macro',
    pluginId: 'dbt',
    label: 'Macro',
    role: 'control',
    previewStepKind: 'CANVAS_CONTROL',
    icon: Cpu,
    borderClass: 'border-slate-500',
    minimapColor: '#64748b',
    allowsIncoming: false,
    allowsOutgoing: true,
    supportsColumns: false,
  },
];

export const DBT_TYPE_TO_KIND: Record<DbtNodeType, PluginNodeKind> = {
  SOURCE: 'dbt:source',
  MODEL: 'dbt:model',
  SEED: 'dbt:seed',
  SNAPSHOT: 'dbt:snapshot',
  TEST: 'dbt:test',
  EXPOSURE: 'dbt:exposure',
  METRIC: 'dbt:metric',
  MACRO: 'dbt:macro',
};

export function mapDbtTypeToKind(type: DbtNodeType): PluginNodeKind {
  return DBT_TYPE_TO_KIND[type];
}

export const EDGE_TYPE_STRATEGIES: readonly EdgeTypeStrategy[] = [
  {
    id: 'dbt-metric-target',
    matches: (context) => context.targetKind === 'dbt:metric',
    edgeType: 'metric',
  },
  {
    id: 'source-role',
    matches: (context) => context.sourceRole === 'input',
    edgeType: 'source',
  },
  {
    id: 'check-role',
    matches: (context) => context.targetRole === 'check',
    edgeType: 'test',
  },
  {
    id: 'output-role',
    matches: (context) => context.targetRole === 'output',
    edgeType: 'exposure',
  },
];
