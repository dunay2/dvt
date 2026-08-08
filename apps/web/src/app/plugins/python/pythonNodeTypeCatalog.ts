/** Owned concern: declare the governed Python code authoring node kind. */
import { FileCode2 } from 'lucide-react';

import { resolveGraphNodeKindTone } from '../graph/graphVisualTokens';
import type { NodeKindRegistration } from '../nodeTypeContracts';

export const PYTHON_PLUGIN_ID = 'dvt.python' as const;
export const PYTHON_CODE_NODE_KIND = 'python:code' as const;

export const PYTHON_NODE_KINDS: readonly NodeKindRegistration[] = [
  {
    kind: PYTHON_CODE_NODE_KIND,
    pluginId: PYTHON_PLUGIN_ID,
    label: 'Python',
    role: 'transform',
    previewStepKind: 'EXECUTE_PYTHON_CODE',
    icon: FileCode2,
    ...resolveGraphNodeKindTone(PYTHON_CODE_NODE_KIND),
    allowsIncoming: true,
    allowsOutgoing: true,
    supportsColumns: false,
  },
];
