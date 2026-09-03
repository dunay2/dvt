/** Owned concern: declare the governed HTTP JSON acquisition node vocabulary. */
import { CloudDownload } from 'lucide-react';

import { resolveGraphNodeKindTone } from '../graph/graphVisualTokens';
import type { NodeKindRegistration } from '../nodeTypeContracts';

export const HTTP_JSON_NODE_KINDS: NodeKindRegistration[] = [
  {
    kind: 'dvt:http_json_acquisition',
    pluginId: 'dvt.http-json',
    label: 'HTTP JSON acquisition',
    role: 'input',
    icon: CloudDownload,
    ...resolveGraphNodeKindTone('dvt:http_json_acquisition'),
    allowsIncoming: false,
    allowsOutgoing: true,
    supportsColumns: false,
  },
];
