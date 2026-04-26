/** Owned concern: declare DVT transformation authoring node kinds. */
import { Cpu, Database, Presentation, Table } from 'lucide-react';

import type { NodeKindRegistration } from '../nodeTypeContracts';

export const DVT_AUTHORING_NODE_KINDS: NodeKindRegistration[] = [
  {
    kind: 'dvt:source',
    pluginId: 'dvt',
    label: 'Source',
    role: 'input',
    previewStepKind: 'CANVAS_SOURCE',
    icon: Database,
    borderClass: 'border-purple-500',
    minimapColor: '#a855f7',
    allowsIncoming: false,
    allowsOutgoing: true,
    supportsColumns: false,
  },
  {
    kind: 'dvt:sql_transform',
    pluginId: 'dvt',
    label: 'SQL transform',
    role: 'transform',
    previewStepKind: 'CANVAS_TRANSFORM',
    icon: Table,
    borderClass: 'border-blue-500',
    minimapColor: '#3b82f6',
    allowsIncoming: true,
    allowsOutgoing: true,
    supportsColumns: false,
  },
  {
    kind: 'dvt:sink',
    pluginId: 'dvt',
    label: 'Sink',
    previewStepKind: 'CANVAS_SINK',
    role: 'output',
    icon: Presentation,
    borderClass: 'border-pink-500',
    minimapColor: '#ec4899',
    allowsIncoming: true,
    allowsOutgoing: false,
    supportsColumns: false,
  },
];

export const FALLBACK_DVT_NODE_KIND: NodeKindRegistration = {
  kind: 'dvt:unknown',
  pluginId: 'dvt',
  label: 'Unknown',
  role: 'control',
  icon: Cpu,
  borderClass: 'border-slate-500',
  minimapColor: '#64748b',
  allowsIncoming: true,
  allowsOutgoing: true,
  supportsColumns: false,
};
