/** Owned concern: aggregate plugin node-kind vocabularies for generic graph UI lookups. */
import { DBT_NODE_KINDS, EDGE_TYPE_STRATEGIES } from './nodeTypeCatalog.dbt';
import { DVT_AUTHORING_NODE_KINDS, FALLBACK_DVT_NODE_KIND } from './dvt/dvtNodeTypeCatalog';
import type { EdgeTypeStrategy, NodeKindRegistration } from './nodeTypeContracts';
import { OBJECT_FILE_POSTGRES_NODE_KINDS } from './objectFilePostgres/objectFilePostgresNodeTypeCatalog';
import { HTTP_JSON_NODE_KINDS } from './httpJson/httpJsonNodeTypeCatalog';

export const CANVAS_NODE_KINDS: NodeKindRegistration[] = [
  ...DBT_NODE_KINDS,
  ...HTTP_JSON_NODE_KINDS,
  ...OBJECT_FILE_POSTGRES_NODE_KINDS,
  ...DVT_AUTHORING_NODE_KINDS,
];

export const FALLBACK_NODE_KIND = FALLBACK_DVT_NODE_KIND;

export { EDGE_TYPE_STRATEGIES };
export type { EdgeTypeStrategy };
