/** Owned concern: centralize localized GraphNodeCard copy consumed by card read-model strategies. */
type GraphNodeCardCopy = Readonly<{
  nodeActionsLabel: string;
  sourceIdentityAriaLabelTemplate: string;
  sourceIdentityDatabaseLabel: string;
  sourceIdentityConnectionLabel: string;
  sourceIdentitySchemaLabel: string;
  sourceIdentityUserLabel: string;
}>;

const ENGLISH_GRAPH_NODE_CARD_COPY: GraphNodeCardCopy = {
  nodeActionsLabel: 'More node actions',
  sourceIdentityAriaLabelTemplate: 'View source identity for {table}',
  sourceIdentityDatabaseLabel: 'Database',
  sourceIdentityConnectionLabel: 'Connection',
  sourceIdentitySchemaLabel: 'Schema',
  sourceIdentityUserLabel: 'User',
};

const SPANISH_GRAPH_NODE_CARD_COPY: GraphNodeCardCopy = {
  nodeActionsLabel: 'Más acciones del nodo',
  sourceIdentityAriaLabelTemplate: 'Ver identidad de origen de {table}',
  sourceIdentityDatabaseLabel: 'Base de datos',
  sourceIdentityConnectionLabel: 'Conexión',
  sourceIdentitySchemaLabel: 'Esquema',
  sourceIdentityUserLabel: 'Usuario',
};

export const graphNodeCardCopyTokens = ENGLISH_GRAPH_NODE_CARD_COPY;

export function resolveGraphNodeCardCopy(locale?: string): GraphNodeCardCopy {
  return locale?.trim().toLowerCase().startsWith('es')
    ? SPANISH_GRAPH_NODE_CARD_COPY
    : ENGLISH_GRAPH_NODE_CARD_COPY;
}
