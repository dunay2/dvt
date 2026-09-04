/** Owned concern: provide reusable Canvas runtime registration fixtures for local Canvas tests. */
import { Database } from 'lucide-react';

import type { CanvasKindRegistration, NodeKindRegistration } from '../../plugins/nodeTypeContracts';

export function buildTestNodeKind(
  kind: NodeKindRegistration['kind'] = 'dvt:source',
  label = 'Source'
): NodeKindRegistration {
  return {
    kind,
    pluginId: kind.split(':')[0] ?? 'dvt',
    label,
    role: 'input',
    icon: Database,
    borderClass: 'border-purple-500',
    minimapColor: '#a855f7',
    allowsIncoming: false,
    allowsOutgoing: true,
    supportsColumns: true,
  };
}

export function buildTestCanvasKind(
  kind: string,
  nodeKinds: readonly NodeKindRegistration[] = [buildTestNodeKind()]
): CanvasKindRegistration {
  return {
    kind,
    pluginId: kind,
    label: kind,
    description: kind,
    createTitle: `Create ${kind}`,
    nodeKinds,
  };
}
