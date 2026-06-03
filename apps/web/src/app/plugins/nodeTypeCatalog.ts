/** Owned concern: aggregate plugin node-kind vocabularies for generic graph UI lookups. */
import type { CoreNodeRole } from '../types/canonical';
import { DBT_NODE_KINDS, EDGE_TYPE_STRATEGIES } from './nodeTypeCatalog.dbt';
import { DVT_AUTHORING_NODE_KINDS, FALLBACK_DVT_NODE_KIND } from './dvt/dvtNodeTypeCatalog';
import type { EdgeTypeStrategy, NodeKindRegistration } from './nodeTypeContracts';

export const CONNECTION_RULES: Record<CoreNodeRole, readonly CoreNodeRole[]> = {
  input: ['transform'],
  transform: ['transform', 'check', 'output'],
  check: [],
  output: [],
  control: ['input', 'transform', 'check', 'output'],
};

export const CANVAS_NODE_KINDS: NodeKindRegistration[] = [
  ...DBT_NODE_KINDS,
  ...DVT_AUTHORING_NODE_KINDS,
];

export const FALLBACK_NODE_KIND = FALLBACK_DVT_NODE_KIND;

export { EDGE_TYPE_STRATEGIES };
export type { EdgeTypeStrategy };
