/** Owned concern: declare the object-file PostgreSQL node vocabulary for Canvas composition. */
import { FileInput } from 'lucide-react';

import { resolveGraphNodeKindTone } from '../graph/graphVisualTokens';
import type { NodeKindRegistration } from '../nodeTypeContracts';

export const OBJECT_FILE_POSTGRES_NODE_KINDS: NodeKindRegistration[] = [
  {
    kind: 'dvt:object_file_load',
    pluginId: 'dvt.object-file-postgres',
    label: 'Object-file load',
    role: 'transform',
    icon: FileInput,
    ...resolveGraphNodeKindTone('dvt:object_file_load'),
    allowsIncoming: true,
    allowsOutgoing: true,
    supportsColumns: true,
  },
];
