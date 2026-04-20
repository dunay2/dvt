import type { CanvasViewCopy } from './canvasCopy.types';

export const canvasViewAuthoringCopyEs = {
  connectionIncompleteMessage: 'La conexion esta incompleta.',
  nodeNotFoundInGraphMessage: 'No se ha encontrado el nodo en el grafo.',
  nodeAlreadyOnCanvasMessage: 'El nodo ya esta en el canvas',
  transformationConnectionOrderMessage:
    'Las aristas del plan deben seguir source -> sql_transform -> sink.',
  transformationConnectionEdgeCountMessage:
    'El plan requiere exactamente 2 aristas: source -> sql_transform y sql_transform -> sink.',
  transformationConnectionDuplicateMessage:
    'La dependencia ya existe en este draft de transformacion.',
  transformationRequiresThreeNodesMessage:
    'El plan requiere exactamente 3 nodos: source, sql_transform y sink.',
  transformationUnsupportedRolesMessage:
    'El plan solo admite nodos input, transform y output en esta vertical.',
  transformationRequiresOneOfEachRoleMessage:
    'El plan requiere exactamente 1 source, 1 sql_transform y 1 sink.',
  transformationDraftValidMessage: 'El draft de transformacion es valido para preview.',
  connectionSelfNotAllowedMessage: 'No se permiten las autoconexiones.',
  connectionAlreadyExistsMessage: 'La conexion ya existe.',
  connectionCycleDetectedMessage: 'La conexion crearia un ciclo en el DAG.',
  connectionPluginRuleBlockedFallbackMessage:
    'La conexion no esta permitida por las reglas del plugin.',
  connectionCrossPluginBridgeMissingPrefix:
    'No existe un puente de puertos de datos compatible entre',
  limitedAccessMessagePrefix: 'Puedes seguir inspeccionando el grafo, pero ',
  limitedAccessSingularMessageSuffix: ' no esta disponible en este contexto.',
  limitedAccessPluralMessageSuffix: ' no estan disponibles en este contexto.',
  capabilityPlanPreview: 'el preview del plan',
  capabilityRunStart: 'el arranque de runs',
  capabilityGraphEdits: 'la edicion del grafo',
  conjunctionAnd: 'y',
  serialConjunctionAnd: 'y',
  nodeAddedPrefix: 'Se ha anadido',
  nodeAddedSuffix: 'al canvas',
  nodeRemovedPrefix: 'Se ha eliminado',
  nodeRemovedSuffix: '',
} satisfies Partial<CanvasViewCopy>;
