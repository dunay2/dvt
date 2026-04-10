export type CostViewCopy = {
  readonly title: string;
  readonly subtitle: string;
  readonly focusedRun: string;
  readonly currentRunEstimate: string;
  readonly costSeriesLabel: string;
  readonly durationSeriesLabel: string;
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
  costSeriesLabel: 'Cost',
  durationSeriesLabel: 'Duration (s)',
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

const COPY_BY_LOCALE = {
  en: EN_COPY,
} as const satisfies Record<string, CostViewCopy>;

function detectBrowserLocale(): string {
  if (typeof navigator === 'undefined') {
    return 'en';
  }

  return navigator.language || 'en';
}

function resolveSupportedCostViewLocale(locale: string): keyof typeof COPY_BY_LOCALE {
  const normalizedLocale = locale.toLowerCase();

  for (const supportedLocale of Object.keys(COPY_BY_LOCALE) as Array<keyof typeof COPY_BY_LOCALE>) {
    if (normalizedLocale.startsWith(supportedLocale)) {
      return supportedLocale;
    }
  }

  return 'en';
}

export function resolveCostViewCopy(locale = detectBrowserLocale()): CostViewCopy {
  return COPY_BY_LOCALE[resolveSupportedCostViewLocale(locale)];
}
