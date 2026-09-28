/** Owned concern: nodePropertiesContracts. */

import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import type { CanvasNodePresentationCopy } from '../canvas/canvasNodePresentationCopy.contract';
import type {
  CanvasNodeCodeLanguage,
  CanvasNodePresentationTruth,
} from '../canvas/canvasNodePresentationTruth.contract';

export type NodePropertySectionId =
  | 'general'
  | 'columns'
  | 'inputs-outputs'
  | 'tests'
  | 'keys'
  | 'indexes'
  | 'foreign-keys'
  | 'constraints'
  | 'comments'
  | 'sink'
  | 'code'
  | 'summary';

export type NodePropertyRow = Readonly<{
  id: NodePropertyRowId;
  label: string;
  value: string;
}>;

export const NODE_PROPERTY_ROW_ID = Object.freeze({
  name: 'name',
  nodeId: 'node-id',
  kind: 'kind',
  role: 'role',
  status: 'status',
  plugin: 'plugin',
  package: 'package',
  materialization: 'materialization',
  lastRun: 'last-run',
  connection: 'connection',
  database: 'database',
  schema: 'schema',
  table: 'table',
  source: 'source',
  path: 'path',
  owner: 'owner',
  duration: 'duration',
  cost: 'cost',
  destination: 'destination',
  writeMode: 'write-mode',
  partitionStrategy: 'partition-strategy',
  description: 'description',
  comment: 'comment',
  upstreamNodes: 'upstream-nodes',
  downstreamNodes: 'downstream-nodes',
  tags: 'tags',
} as const);

export type NodePropertyRowId = (typeof NODE_PROPERTY_ROW_ID)[keyof typeof NODE_PROPERTY_ROW_ID];

export type NodePropertyTableRow = Readonly<{
  id: string;
  cells: Readonly<Record<string, string>>;
}>;

export type NodePropertySection = Readonly<{
  id: NodePropertySectionId;
  label: string;
  rows: readonly NodePropertyRow[];
  tableRows: readonly NodePropertyTableRow[];
  emptyState?: string;
  description?: string;
  code?: string;
  codeLanguage?: CanvasNodeCodeLanguage;
  codePath?: string;
  columnLabels?: Readonly<Record<string, string>>;
}>;

export type NodePropertiesReadModel = Readonly<{
  nodeId: string;
  nodeName: string;
  sections: readonly NodePropertySection[];
}>;

export type BuildNodePropertiesReadModelArgs = Readonly<{
  node: CanonicalNode;
  nodes: readonly CanonicalNode[];
  edges: readonly CanonicalEdge[];
  presentationCopy?: CanvasNodePresentationCopy;
  presentationTruth?: CanvasNodePresentationTruth;
}>;

export type InspectorColumn = Readonly<{
  name: string;
  type: string;
  nullable?: boolean;
  primaryKey?: boolean;
  defaultValue?: string;
  comment?: string;
}>;
