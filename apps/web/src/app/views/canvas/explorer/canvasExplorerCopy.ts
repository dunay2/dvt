/**
 * Owned concern: localized navigation copy, independent of graph and provider semantics.
 * @baseline GH-3765: one project Model catalogue with an independent Source property.
 * @decision Keep ES/EN labels at the presentation boundary.
 * @consequence Navigation never invents domain statuses.
 * @version 1.0.0
 */
const en = {
  navigation: 'Canvas explorer',
  elements: 'Elements',
  explorerTitle: 'Explorer',
  project: 'Project',
  git: 'Git',
  search: 'Search models…',
  empty: 'No models yet.',
  noMatches: 'No matching models.',
  source: 'Source',
  sql: 'SQL',
  connections: 'Connections',
  manageConnections: 'Configure connections',
  connectionsUnavailable: 'Connections are unavailable in this workspace.',
  connectionsIdle: 'Connections have not been loaded.',
  connectionsLoading: 'Loading connections…',
  connectionsEmpty: 'No connections configured.',
  connectionsRefreshing: 'Refreshing connections…',
  retry: 'Retry',
  details: 'Details',
  object: 'Object',
  connection: 'Connection',
  file: 'File',
  identifier: 'Identifier',
  database: 'Database',
  schema: 'Schema',
  type: 'Type',
  addModel: 'Add model',
  resize: 'Resize explorer',
  collapse: 'Collapse explorer',
  close: 'Close explorer',
  models: 'Models',
  projectModelsLoading: 'Loading project models…',
  modelSchemaUnavailable: 'The model output schema or execution connection is unavailable.',
  projectModelsUnavailable: 'Project models are unavailable. Canvas elements remain accessible.',
};
const es: typeof en = {
  navigation: 'Explorador del Canvas',
  elements: 'Elementos',
  explorerTitle: 'Explorador',
  project: 'Proyecto',
  git: 'Git',
  search: 'Buscar modelos…',
  empty: 'Todavía no hay modelos.',
  noMatches: 'No hay coincidencias.',
  source: 'Fuente',
  sql: 'SQL',
  connections: 'Conexiones',
  manageConnections: 'Configurar conexiones',
  connectionsUnavailable: 'Las conexiones no están disponibles en este espacio de trabajo.',
  connectionsIdle: 'Las conexiones todavía no se han cargado.',
  connectionsLoading: 'Cargando conexiones…',
  connectionsEmpty: 'No hay conexiones configuradas.',
  connectionsRefreshing: 'Actualizando conexiones…',
  retry: 'Reintentar',
  details: 'Detalles',
  object: 'Objeto',
  connection: 'Conexión',
  file: 'Archivo',
  identifier: 'Identificador',
  database: 'Base de datos',
  schema: 'Esquema',
  type: 'Tipo',
  addModel: 'Añadir modelo',
  resize: 'Ajustar ancho del explorador',
  collapse: 'Plegar explorador',
  close: 'Cerrar explorador',
  models: 'Modelos',
  projectModelsLoading: 'Cargando modelos del proyecto…',
  modelSchemaUnavailable:
    'El esquema de salida o la conexión de ejecución del modelo no están disponibles.',
  projectModelsUnavailable:
    'Los modelos del proyecto no están disponibles. Puedes seguir consultando los elementos del Canvas.',
};
export function resolveCanvasExplorerCopy(language: string): typeof en {
  return language === 'es' ? es : en;
}
