export type ShellTopBarCopy = {
  readonly shell: string;
  readonly workspacePanels: string;
  readonly viewOptions: string;
  readonly explorerPanel: string;
  readonly inspectorPanel: string;
  readonly consolePanel: string;
  readonly focusMode: string;
  readonly gridSize: string;
  readonly resetGrid: string;
  readonly gitTooltip: string;
  readonly checking: string;
  readonly checkingTooltip: string;
  readonly offline: string;
  readonly offlineTooltipFallback: string;
  readonly degraded: string;
  readonly degradedTooltipFallback: string;
};

const EN_COPY: ShellTopBarCopy = {
  shell: 'View',
  workspacePanels: 'Panels',
  viewOptions: 'View options',
  explorerPanel: 'Explorer Panel',
  inspectorPanel: 'Inspector Panel',
  consolePanel: 'Console',
  focusMode: 'Focus Mode',
  gridSize: 'Grid size',
  resetGrid: 'Reset grid to 20px',
  gitTooltip: 'Current Git branch and commit SHA',
  checking: 'Checking',
  checkingTooltip: 'Checking platform health endpoints',
  offline: 'Offline',
  offlineTooltipFallback: 'Unable to reach /healthz',
  degraded: 'Degraded',
  degradedTooltipFallback: 'Platform in degraded state',
};

const ES_COPY: ShellTopBarCopy = {
  shell: 'Vista',
  workspacePanels: 'Paneles',
  viewOptions: 'Opciones de vista',
  explorerPanel: 'Panel explorador',
  inspectorPanel: 'Panel inspector',
  consolePanel: 'Consola',
  focusMode: 'Modo foco',
  gridSize: 'Tama\u00f1o de rejilla',
  resetGrid: 'Restablecer rejilla a 20px',
  gitTooltip: 'Rama Git y SHA del commit actual',
  checking: 'Comprobando',
  checkingTooltip: 'Comprobando endpoints de salud de plataforma',
  offline: 'Offline',
  offlineTooltipFallback: 'No se pudo alcanzar /healthz',
  degraded: 'Degradado',
  degradedTooltipFallback: 'Plataforma en estado degradado',
};

function detectBrowserLocale(): string {
  if (typeof navigator === 'undefined') {
    return 'en';
  }
  return navigator.language || 'en';
}

export function resolveShellTopBarCopy(locale = detectBrowserLocale()): ShellTopBarCopy {
  if (locale.toLowerCase().startsWith('es')) {
    return ES_COPY;
  }
  return EN_COPY;
}
