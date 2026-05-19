/** Owned concern: resolve copy for global shell chrome without owning route behavior. */
import { resolveString, type LocalizableString } from '../../plugins/contracts/PluginManifest';

export type ShellTopBarCopy = {
  readonly shell: string;
  readonly workspaceMenu: string;
  readonly workspacePanels: string;
  readonly globalNavigation: string;
  readonly workspaceContext: string;
  readonly gitContext: string;
  readonly viewOptions: string;
  readonly explorerPanel: string;
  readonly inspectorPanel: string;
  readonly consolePanel: string;
  readonly focusMode: string;
  readonly canvasPalette: string;
  readonly gridSize: string;
  readonly resetGrid: string;
  readonly tenantScope: string;
  readonly projectScope: string;
  readonly environmentScope: string;
  readonly tenantScopeAria: string;
  readonly projectScopeAria: string;
  readonly environmentScopeAria: string;
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
  workspaceMenu: { key: 'shell.workspaceMenu', fallback: 'Workspace' },
  workspacePanels: { key: 'shell.workspacePanels', fallback: 'Panels' },
  globalNavigation: { key: 'shell.globalNavigation', fallback: 'Navigation' },
  workspaceContext: { key: 'shell.workspaceContext', fallback: 'Workspace context' },
  gitContext: { key: 'shell.gitContext', fallback: 'Git context' },
  viewOptions: { key: 'shell.viewOptions', fallback: 'View options' },
  explorerPanel: { key: 'shell.explorerPanel', fallback: 'Explorer Panel' },
  inspectorPanel: { key: 'shell.inspectorPanel', fallback: 'Inspector Panel' },
  consolePanel: { key: 'shell.consolePanel', fallback: 'Console' },
  focusMode: { key: 'shell.focusMode', fallback: 'Focus Mode' },
  canvasPalette: { key: 'shell.canvasPalette', fallback: 'Canvas background' },
  gridSize: { key: 'shell.gridSize', fallback: 'Grid size' },
  resetGrid: { key: 'shell.resetGrid', fallback: 'Reset grid to 20px' },
  tenantScope: { key: 'shell.tenantScope', fallback: 'Tenant' },
  projectScope: { key: 'shell.projectScope', fallback: 'Project' },
  environmentScope: { key: 'shell.environmentScope', fallback: 'Environment' },
  tenantScopeAria: { key: 'shell.tenantScopeAria', fallback: 'Tenant scope (read only)' },
  projectScopeAria: { key: 'shell.projectScopeAria', fallback: 'Project scope (read only)' },
  environmentScopeAria: {
    key: 'shell.environmentScopeAria',
    fallback: 'Environment scope (read only)',
  },
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

const COPY_ES: ShellTopBarCopy = {
  shell: 'Vista',
  workspaceMenu: 'Workspace',
  workspacePanels: 'Paneles',
  globalNavigation: 'Navegacion',
  workspaceContext: 'Contexto del workspace',
  gitContext: 'Contexto Git',
  viewOptions: 'Opciones de vista',
  explorerPanel: 'Panel explorador',
  inspectorPanel: 'Panel inspector',
  consolePanel: 'Consola',
  focusMode: 'Modo foco',
  canvasPalette: 'Fondo del canvas',
  gridSize: 'Tamano de rejilla',
  resetGrid: 'Restablecer rejilla a 20px',
  tenantScope: 'Tenant',
  projectScope: 'Proyecto',
  environmentScope: 'Entorno',
  tenantScopeAria: 'Scope de tenant (solo lectura)',
  projectScopeAria: 'Scope de proyecto (solo lectura)',
  environmentScopeAria: 'Scope de entorno (solo lectura)',
  gitTooltip: 'Rama Git y SHA actuales',
  checking: 'Comprobando',
  checkingTooltip: 'Comprobando endpoints de salud de la plataforma',
  offline: 'Sin conexion',
  offlineTooltipFallback: 'No se puede alcanzar /healthz',
  degraded: 'Degradado',
  degradedTooltipFallback: 'Plataforma en estado degradado',
};

function resolveShellTopBarLanguage(locale?: string): 'en' | 'es' {
  return locale?.trim().toLowerCase().startsWith('es') ? 'es' : 'en';
}

export function detectShellTopBarLocale(): string {
  if (typeof navigator !== 'undefined') {
    const navigatorLocale = navigator.language || navigator.languages?.[0];
    if (navigatorLocale) {
      return navigatorLocale;
    }
  }

  const documentLocale =
    typeof document === 'undefined' ? '' : document.documentElement.lang?.trim();
  if (documentLocale) {
    return documentLocale;
  }

  return 'en';
}

export function resolveShellTopBarCopy(locale?: string): ShellTopBarCopy {
  if (resolveShellTopBarLanguage(locale) === 'es') {
    return COPY_ES;
  }

  return {
    shell: resolveString(COPY_BY_KEY.shell, locale),
    workspaceMenu: resolveString(COPY_BY_KEY.workspaceMenu, locale),
    workspacePanels: resolveString(COPY_BY_KEY.workspacePanels, locale),
    globalNavigation: resolveString(COPY_BY_KEY.globalNavigation, locale),
    workspaceContext: resolveString(COPY_BY_KEY.workspaceContext, locale),
    gitContext: resolveString(COPY_BY_KEY.gitContext, locale),
    viewOptions: resolveString(COPY_BY_KEY.viewOptions, locale),
    explorerPanel: resolveString(COPY_BY_KEY.explorerPanel, locale),
    inspectorPanel: resolveString(COPY_BY_KEY.inspectorPanel, locale),
    consolePanel: resolveString(COPY_BY_KEY.consolePanel, locale),
    focusMode: resolveString(COPY_BY_KEY.focusMode, locale),
    canvasPalette: resolveString(COPY_BY_KEY.canvasPalette, locale),
    gridSize: resolveString(COPY_BY_KEY.gridSize, locale),
    resetGrid: resolveString(COPY_BY_KEY.resetGrid, locale),
    tenantScope: resolveString(COPY_BY_KEY.tenantScope, locale),
    projectScope: resolveString(COPY_BY_KEY.projectScope, locale),
    environmentScope: resolveString(COPY_BY_KEY.environmentScope, locale),
    tenantScopeAria: resolveString(COPY_BY_KEY.tenantScopeAria, locale),
    projectScopeAria: resolveString(COPY_BY_KEY.projectScopeAria, locale),
    environmentScopeAria: resolveString(COPY_BY_KEY.environmentScopeAria, locale),
    gitTooltip: resolveString(COPY_BY_KEY.gitTooltip, locale),
    checking: resolveString(COPY_BY_KEY.checking, locale),
    checkingTooltip: resolveString(COPY_BY_KEY.checkingTooltip, locale),
    offline: resolveString(COPY_BY_KEY.offline, locale),
    offlineTooltipFallback: resolveString(COPY_BY_KEY.offlineTooltipFallback, locale),
    degraded: resolveString(COPY_BY_KEY.degraded, locale),
    degradedTooltipFallback: resolveString(COPY_BY_KEY.degradedTooltipFallback, locale),
  };
}
