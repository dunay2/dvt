export type CostViewCopy = {
  readonly title: string;
  readonly subtitle: string;
  readonly focusedRun: string;
  readonly currentRunEstimate: string;
  readonly loadingTitle: string;
  readonly loadingDescription: string;
  readonly errorTitle: string;
  readonly errorDescription: string;
  readonly totalObservedNodeCost: string;
  readonly runsAvailable: string;
  readonly averageCostPerRun: string;
  readonly costAlerts: string;
  readonly tracked: string;
  readonly workspace: string;
  readonly estimatedCostByRun: string;
  readonly durationByModel: string;
  readonly topCostDrivers: string;
  readonly noNodeCostData: string;
  readonly alerts: string;
  readonly noActiveAlerts: string;
  readonly warning: string;
  readonly coverage: string;
  readonly coverageDescription: string;
  readonly nodesWithCostData: string;
  readonly totalObservedDuration: string;
};

const EN_COPY: CostViewCopy = {
  title: 'Cost',
  subtitle: 'Node cost data is derived from the active workspace graph.',
  focusedRun: 'Focused run',
  currentRunEstimate: 'Current run estimate',
  loadingTitle: 'Loading cost coverage',
  loadingDescription: 'Loading cost coverage from workspace and runs...',
  errorTitle: 'Cost data unavailable',
  errorDescription: 'Cost data could not be loaded from the current data source.',
  totalObservedNodeCost: 'Total observed node cost',
  runsAvailable: 'Runs available',
  averageCostPerRun: 'Average cost per run',
  costAlerts: 'Cost alerts',
  tracked: 'tracked',
  workspace: 'workspace',
  estimatedCostByRun: 'Estimated cost by run',
  durationByModel: 'Duration by model',
  topCostDrivers: 'Top cost drivers',
  noNodeCostData: 'No node cost data is available.',
  alerts: 'Alerts',
  noActiveAlerts: 'No cost alerts are active.',
  warning: 'Warning',
  coverage: 'Coverage',
  coverageDescription:
    'Cost coverage currently uses node-level `lastCost` and `lastDuration` data from the workspace graph. The canvas cost heatmap reads the same source when the `Cost` overlay is enabled from the canvas toolbar.',
  nodesWithCostData: 'Nodes with cost data',
  totalObservedDuration: 'Total observed duration',
};

const ES_COPY: CostViewCopy = {
  title: 'Coste',
  subtitle: 'Los datos de coste por nodo se derivan del grafo activo del workspace.',
  focusedRun: 'Run enfocado',
  currentRunEstimate: 'Estimación del run actual',
  loadingTitle: 'Cargando cobertura de costes',
  loadingDescription: 'Cargando cobertura de costes desde workspace y runs...',
  errorTitle: 'Datos de coste no disponibles',
  errorDescription: 'No se pudieron cargar los datos de coste desde el data source actual.',
  totalObservedNodeCost: 'Coste total observado por nodo',
  runsAvailable: 'Runs disponibles',
  averageCostPerRun: 'Coste medio por run',
  costAlerts: 'Alertas de coste',
  tracked: 'trazado',
  workspace: 'workspace',
  estimatedCostByRun: 'Coste estimado por run',
  durationByModel: 'Duración por modelo',
  topCostDrivers: 'Principales impulsores de coste',
  noNodeCostData: 'No hay datos de coste por nodo disponibles.',
  alerts: 'Alertas',
  noActiveAlerts: 'No hay alertas de coste activas.',
  warning: 'Warning',
  coverage: 'Cobertura',
  coverageDescription:
    'La cobertura de costes usa actualmente `lastCost` y `lastDuration` a nivel de nodo desde el grafo del workspace. El mapa de calor de costes del canvas lee esa misma fuente cuando el overlay `Cost` está habilitado en la toolbar.',
  nodesWithCostData: 'Nodos con datos de coste',
  totalObservedDuration: 'Duración total observada',
};

function detectBrowserLocale(): string {
  if (typeof navigator === 'undefined') {
    return 'en';
  }
  return navigator.language || 'en';
}

export function resolveCostViewCopy(locale = detectBrowserLocale()): CostViewCopy {
  if (locale.toLowerCase().startsWith('es')) {
    return ES_COPY;
  }
  return EN_COPY;
}
