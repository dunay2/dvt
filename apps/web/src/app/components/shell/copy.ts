import { resolveString, type LocalizableString } from '../../plugins/contracts/PluginManifest';

export type ShellTopBarCopy = {
  readonly shell: string;
  readonly workspacePanels: string;
  readonly viewOptions: string;
  readonly explorerPanel: string;
  readonly inspectorPanel: string;
  readonly consolePanel: string;
  readonly focusMode: string;
  readonly canvasPalette: string;
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

const COPY_BY_KEY: Record<keyof ShellTopBarCopy, LocalizableString> = {
  shell: { key: 'shell.view', fallback: 'View' },
  workspacePanels: { key: 'shell.workspacePanels', fallback: 'Panels' },
  viewOptions: { key: 'shell.viewOptions', fallback: 'View options' },
  explorerPanel: { key: 'shell.explorerPanel', fallback: 'Explorer Panel' },
  inspectorPanel: { key: 'shell.inspectorPanel', fallback: 'Inspector Panel' },
  consolePanel: { key: 'shell.consolePanel', fallback: 'Console' },
  focusMode: { key: 'shell.focusMode', fallback: 'Focus Mode' },
  canvasPalette: { key: 'shell.canvasPalette', fallback: 'Canvas background' },
  gridSize: { key: 'shell.gridSize', fallback: 'Grid size' },
  resetGrid: { key: 'shell.resetGrid', fallback: 'Reset grid to 20px' },
  gitTooltip: { key: 'shell.gitTooltip', fallback: 'Current Git branch and commit SHA' },
  checking: { key: 'shell.checking', fallback: 'Checking' },
  checkingTooltip: {
    key: 'shell.checkingTooltip',
    fallback: 'Checking platform health endpoints',
  },
  offline: { key: 'shell.offline', fallback: 'Offline' },
  offlineTooltipFallback: {
    key: 'shell.offlineTooltipFallback',
    fallback: 'Unable to reach /healthz',
  },
  degraded: { key: 'shell.degraded', fallback: 'Degraded' },
  degradedTooltipFallback: {
    key: 'shell.degradedTooltipFallback',
    fallback: 'Platform in degraded state',
  },
};

export function resolveShellTopBarCopy(locale?: string): ShellTopBarCopy {
  return {
    shell: resolveString(COPY_BY_KEY.shell, locale),
    workspacePanels: resolveString(COPY_BY_KEY.workspacePanels, locale),
    viewOptions: resolveString(COPY_BY_KEY.viewOptions, locale),
    explorerPanel: resolveString(COPY_BY_KEY.explorerPanel, locale),
    inspectorPanel: resolveString(COPY_BY_KEY.inspectorPanel, locale),
    consolePanel: resolveString(COPY_BY_KEY.consolePanel, locale),
    focusMode: resolveString(COPY_BY_KEY.focusMode, locale),
    canvasPalette: resolveString(COPY_BY_KEY.canvasPalette, locale),
    gridSize: resolveString(COPY_BY_KEY.gridSize, locale),
    resetGrid: resolveString(COPY_BY_KEY.resetGrid, locale),
    gitTooltip: resolveString(COPY_BY_KEY.gitTooltip, locale),
    checking: resolveString(COPY_BY_KEY.checking, locale),
    checkingTooltip: resolveString(COPY_BY_KEY.checkingTooltip, locale),
    offline: resolveString(COPY_BY_KEY.offline, locale),
    offlineTooltipFallback: resolveString(COPY_BY_KEY.offlineTooltipFallback, locale),
    degraded: resolveString(COPY_BY_KEY.degraded, locale),
    degradedTooltipFallback: resolveString(COPY_BY_KEY.degradedTooltipFallback, locale),
  };
}
