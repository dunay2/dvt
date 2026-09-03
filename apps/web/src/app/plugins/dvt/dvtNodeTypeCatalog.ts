/** Owned concern: declare DVT transformation authoring node kinds. */
import { Cpu, Database, Presentation, Table } from 'lucide-react';

import { resolveGraphNodeKindTone } from '../graph/graphVisualTokens';
import type { NodeKindRegistration } from '../nodeTypeContracts';

export const DVT_AUTHORING_NODE_KINDS: NodeKindRegistration[] = [
  {
    kind: 'dvt:source',
    pluginId: 'dvt',
    label: 'Source',
    role: 'input',
    icon: Database,
    ...resolveGraphNodeKindTone('dvt:source'),
    allowsIncoming: false,
    allowsOutgoing: true,
    supportsColumns: false,
  },
  {
    kind: 'dvt:transform',
    pluginId: 'dvt',
    label: 'Transform',
    role: 'transform',
    icon: Table,
    ...resolveGraphNodeKindTone('dvt:transform'),
    allowsIncoming: true,
    allowsOutgoing: true,
    supportsColumns: false,
  },
  {
    kind: 'dvt:sink',
    pluginId: 'dvt',
    label: 'Sink',
    role: 'output',
    icon: Presentation,
    ...resolveGraphNodeKindTone('dvt:sink'),
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
  ...resolveGraphNodeKindTone('dvt:unknown'),
  allowsIncoming: true,
  allowsOutgoing: true,
  supportsColumns: false,
};
