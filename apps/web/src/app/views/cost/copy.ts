export type CostViewCopy = {
  readonly title: string;
  readonly subtitle: string;
  readonly focusedRun: string;
  readonly costCaptureUnavailable: string;
  readonly durationByRunSeriesLabel: string;
  readonly durationByStepSeriesLabel: string;
  readonly loadingTitle: string;
  readonly loadingDescription: string;
  readonly errorTitle: string;
  readonly errorDescription: string;
  readonly costCaptureStatus: string;
  readonly runsObserved: string;
  readonly completedSteps: string;
  readonly failedSteps: string;
  readonly tracked: string;
  readonly runtime: string;
  readonly durationByRun: string;
  readonly durationByStep: string;
  readonly topUsageDrivers: string;
  readonly noUsageData: string;
  readonly alerts: string;
  readonly noActiveAlerts: string;
  readonly warning: string;
  readonly coverage: string;
  readonly coverageDescription: string;
  readonly stepsWithUsageData: string;
  readonly totalObservedDuration: string;
  readonly observedWindow: string;
};

const EN_COPY: CostViewCopy = {
  title: 'Cost',
  subtitle: 'Runtime usage attribution from protected run events. Monetary capture is explicit.',
  focusedRun: 'Focused run',
  costCaptureUnavailable: 'Cost capture unavailable',
  durationByRunSeriesLabel: 'Run duration (s)',
  durationByStepSeriesLabel: 'Step duration (s)',
  loadingTitle: 'Loading cost attribution',
  loadingDescription: 'Loading runtime usage facts from protected run events...',
  errorTitle: 'Cost attribution unavailable',
  errorDescription: 'Runtime usage facts could not be loaded from the current data source.',
  costCaptureStatus: 'Cost capture status',
  runsObserved: 'Runs observed',
  completedSteps: 'Completed steps',
  failedSteps: 'Failed steps',
  tracked: 'tracked',
  runtime: 'runtime',
  durationByRun: 'Duration by run',
  durationByStep: 'Duration by step',
  topUsageDrivers: 'Top runtime usage drivers',
  noUsageData: 'No runtime usage data is available.',
  alerts: 'Alerts',
  noActiveAlerts: 'No runtime attribution alerts are active.',
  warning: 'Warning',
  coverage: 'Coverage',
  coverageDescription:
    'This view uses the protected CostAttributionSummary read model. Monetary totals remain unavailable until provider credit capture is implemented.',
  stepsWithUsageData: 'Steps with usage data',
  totalObservedDuration: 'Total observed duration',
  observedWindow: 'Observed window',
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
