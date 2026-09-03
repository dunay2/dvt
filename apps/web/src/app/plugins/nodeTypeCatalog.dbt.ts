import {
  Cpu,
  Database,
  FileText,
  Package,
  Presentation,
  Table,
  TestTube,
  TrendingUp,
} from 'lucide-react';

import type { CoreNodeRole, PluginNodeKind } from '../types/canonical';
import type { DbtNodeType } from '../types/dbt';

import { resolveGraphNodeKindTone } from './graph/graphVisualTokens';
import type { EdgeTypeStrategy, NodeKindRegistration } from './nodeTypeContracts';

export const DBT_NODE_KINDS: NodeKindRegistration[] = [
  {
    kind: 'dbt:source',
    pluginId: 'dbt',
    label: 'Source',
    role: 'input',
    icon: Database,
    ...resolveGraphNodeKindTone('dbt:source'),
    allowsIncoming: false,
    allowsOutgoing: true,
    supportsColumns: true,
  },
  {
    kind: 'dbt:model',
    pluginId: 'dbt',
    label: 'Model',
    role: 'transform',
    icon: Table,
    ...resolveGraphNodeKindTone('dbt:model'),
    allowsIncoming: true,
    allowsOutgoing: true,
    supportsColumns: true,
  },
  {
    kind: 'dbt:seed',
    pluginId: 'dbt',
    label: 'Seed',
    role: 'input',
    icon: FileText,
    ...resolveGraphNodeKindTone('dbt:seed'),
    allowsIncoming: false,
    allowsOutgoing: true,
    supportsColumns: false,
  },
  {
    kind: 'dbt:snapshot',
    pluginId: 'dbt',
    label: 'Snapshot',
    role: 'transform',
    icon: Package,
    ...resolveGraphNodeKindTone('dbt:snapshot'),
    allowsIncoming: true,
    allowsOutgoing: true,
    supportsColumns: false,
  },
  {
    kind: 'dbt:test',
    pluginId: 'dbt',
    label: 'Test',
    role: 'check',
    icon: TestTube,
    ...resolveGraphNodeKindTone('dbt:test'),
    allowsIncoming: true,
    allowsOutgoing: false,
    supportsColumns: false,
  },
  {
    kind: 'dbt:exposure',
    pluginId: 'dbt',
    label: 'Exposure',
    role: 'output',
    icon: Presentation,
    ...resolveGraphNodeKindTone('dbt:exposure'),
    allowsIncoming: true,
    allowsOutgoing: false,
    supportsColumns: false,
  },
  {
    kind: 'dbt:metric',
    pluginId: 'dbt',
    label: 'Metric',
    role: 'output',
    icon: TrendingUp,
    ...resolveGraphNodeKindTone('dbt:metric'),
    allowsIncoming: true,
    allowsOutgoing: false,
    supportsColumns: false,
  },
  {
    kind: 'dbt:macro',
    pluginId: 'dbt',
    label: 'Macro',
    role: 'control',
    icon: Cpu,
    ...resolveGraphNodeKindTone('dbt:macro'),
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
    id: 'check-role',
    matches: (context) => context.targetRole === 'check',
    edgeType: 'test',
  },
  {
    id: 'source-role',
    matches: (context) => context.sourceRole === 'input',
    edgeType: 'source',
  },
  {
    id: 'output-role',
    matches: (context) => context.targetRole === 'output',
    edgeType: 'exposure',
  },
];
