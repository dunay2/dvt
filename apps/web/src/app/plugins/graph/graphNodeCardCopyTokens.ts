/** Owned concern: centralize localized GraphNodeCard copy consumed by card read-model strategies. */
type GraphNodeCardCopy = Readonly<{
  nodeActionsLabel: string;
  columnsLabel: string;
  remainingColumnsLabelTemplate: string;
  showFirstFiveColumnsLabel: string;
  automapColumnsLabel: string;
  sourceColumnPortLabelTemplate: string;
  targetColumnPortLabelTemplate: string;
  sourceIdentityAriaLabelTemplate: string;
  sourceIdentityDatabaseLabel: string;
  sourceIdentityConnectionLabel: string;
  sourceIdentitySchemaLabel: string;
  sourceIdentityUserLabel: string;
}>;

const ENGLISH_GRAPH_NODE_CARD_COPY: GraphNodeCardCopy = {
  nodeActionsLabel: 'More node actions',
  columnsLabel: 'Columns',
  remainingColumnsLabelTemplate: 'Show remaining columns ({count})',
  showFirstFiveColumnsLabel: 'Show first 5 columns',
  automapColumnsLabel: 'Map compatible columns',
  sourceColumnPortLabelTemplate: 'Connect {column} output',
  targetColumnPortLabelTemplate: 'Map into {column}',
  sourceIdentityAriaLabelTemplate: 'View source identity for {table}',
  sourceIdentityDatabaseLabel: 'Database',
  sourceIdentityConnectionLabel: 'Connection',
  sourceIdentitySchemaLabel: 'Schema',
  sourceIdentityUserLabel: 'User',
};

const SPANISH_GRAPH_NODE_CARD_COPY: GraphNodeCardCopy = {
  nodeActionsLabel: 'Más acciones del nodo',
  columnsLabel: 'Columnas',
  remainingColumnsLabelTemplate: 'Ver columnas restantes ({count})',
  showFirstFiveColumnsLabel: 'Mostrar solo las 5 primeras',
  automapColumnsLabel: 'Asignar columnas compatibles',
  sourceColumnPortLabelTemplate: 'Conectar salida de {column}',
  targetColumnPortLabelTemplate: 'Asignar a {column}',
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
