/** Owned concern: resolve copy for global shell chrome without owning route behavior. */
import { resolveString, type LocalizableString } from '../../plugins/contracts/PluginManifest';

export type ShellTopBarCopy = {
  readonly skipToMainContent: string;
  readonly shell: string;
  readonly aboutCommand: string;
  readonly aboutTitle: string;
  readonly aboutDescription: string;
  readonly aboutVersionLabel: string;
  readonly aboutBuildDateLabel: string;
  readonly aboutBuildDateUnavailable: string;
  readonly workspaceMenu: string;
  readonly workspacePanels: string;
  readonly globalNavigation: string;
  readonly workspaceContext: string;
  readonly showWorkspaceContext: string;
  readonly currentProject: string;
  readonly availableProjects: string;
  readonly noAlternativeProjects: string;
  readonly projectUnavailable: string;
  readonly gitContext: string;
  readonly viewOptions: string;
  readonly language: string;
  readonly languageEnglish: string;
  readonly languageSpanish: string;
  readonly operationalDrawer: string;
  readonly closeOperationalDrawer: string;
  readonly closeOperationalDrawerTab: string;
  readonly restoreOperationalDrawerTabs: string;
  readonly focusMode: string;
  readonly canvasPalette: string;
  readonly canvasColorHexValue: string;
  readonly canvasColorInputLabel: string;
  readonly gridSize: string;
  readonly gridDensityDense: string;
  readonly gridDensityDefault: string;
  readonly gridDensitySparse: string;
  readonly resetGrid: string;
  readonly tenantScope: string;
  readonly projectScope: string;
  readonly environmentScope: string;
  readonly deploymentScope: string;
  readonly tenantScopeAria: string;
  readonly projectScopeAria: string;
  readonly environmentScopeAria: string;
  readonly deploymentScopeAria: string;
  readonly gitTooltip: string;
  readonly checking: string;
  readonly checkingTooltip: string;
  readonly offline: string;
  readonly offlineTooltipFallback: string;
  readonly degraded: string;
  readonly degradedTooltipFallback: string;
  readonly restApiLabel: string;
  readonly liveEventsLabel: string;
  readonly canvasRunStatusTemplate: string;
  readonly runningTemplate: string;
  readonly runReady: string;
  readonly previewRequired: string;
  readonly runBlocked: string;
  readonly runCommand: string;
};

const COPY_BY_KEY: Record<keyof ShellTopBarCopy, LocalizableString> = {
  skipToMainContent: { key: 'shell.skipToMainContent', fallback: 'Skip to main content' },
  shell: { key: 'shell.view', fallback: 'View' },
  aboutCommand: { key: 'shell.about.command', fallback: 'About Raven' },
  aboutTitle: { key: 'shell.about.title', fallback: 'About Raven' },
  aboutDescription: {
    key: 'shell.about.description',
    fallback: 'Compiled application metadata for the running Raven bundle.',
  },
  aboutVersionLabel: { key: 'shell.about.versionLabel', fallback: 'Compiled version' },
  aboutBuildDateLabel: { key: 'shell.about.buildDateLabel', fallback: 'Build date' },
  aboutBuildDateUnavailable: { key: 'shell.about.buildDateUnavailable', fallback: 'Not published' },
  workspaceMenu: { key: 'shell.workspaceMenu', fallback: 'Workspace' },
  workspacePanels: { key: 'shell.workspacePanels', fallback: 'Panels' },
  globalNavigation: { key: 'shell.globalNavigation', fallback: 'Navigation' },
  workspaceContext: { key: 'shell.workspaceContext', fallback: 'Workspace context' },
  showWorkspaceContext: {
    key: 'shell.showWorkspaceContext',
    fallback: 'Show project and workspace context',
  },
  currentProject: { key: 'shell.currentProject', fallback: 'Current project' },
  availableProjects: {
    key: 'shell.availableProjects',
    fallback: 'Projects available in this session',
  },
  noAlternativeProjects: {
    key: 'shell.noAlternativeProjects',
    fallback: 'No other project is available in this session.',
  },
  projectUnavailable: {
    key: 'shell.projectUnavailable',
    fallback: 'That project is not available in this session.',
  },
  gitContext: { key: 'shell.gitContext', fallback: 'Git context' },
  viewOptions: { key: 'shell.viewOptions', fallback: 'View options' },
  language: { key: 'shell.language', fallback: 'Language' },
  languageEnglish: { key: 'shell.languageEnglish', fallback: 'English' },
  languageSpanish: { key: 'shell.languageSpanish', fallback: 'Spanish' },
  operationalDrawer: { key: 'shell.operationalDrawer', fallback: 'Operations' },
  closeOperationalDrawer: {
    key: 'shell.closeOperationalDrawer',
    fallback: 'Close operational drawer',
  },
  closeOperationalDrawerTab: {
    key: 'shell.closeOperationalDrawerTab',
    fallback: 'Close {tab}',
  },
  restoreOperationalDrawerTabs: {
    key: 'shell.restoreOperationalDrawerTabs',
    fallback: 'Show windows',
  },
  focusMode: { key: 'shell.focusMode', fallback: 'Focus Mode' },
  canvasPalette: { key: 'shell.canvasPalette', fallback: 'Canvas background' },
  canvasColorHexValue: { key: 'shell.canvasColorHexValue', fallback: 'Hex value' },
  canvasColorInputLabel: {
    key: 'shell.canvasColorInputLabel',
    fallback: 'Set Canvas background hex color',
  },
  gridSize: { key: 'shell.gridSize', fallback: 'Grid size' },
  gridDensityDense: { key: 'shell.gridDensityDense', fallback: 'Dense' },
  gridDensityDefault: { key: 'shell.gridDensityDefault', fallback: 'Default' },
  gridDensitySparse: { key: 'shell.gridDensitySparse', fallback: 'Sparse' },
  resetGrid: { key: 'shell.resetGrid', fallback: 'Reset grid to 20px' },
  tenantScope: { key: 'shell.tenantScope', fallback: 'Tenant' },
  projectScope: { key: 'shell.projectScope', fallback: 'Project' },
  environmentScope: { key: 'shell.environmentScope', fallback: 'Environment' },
  deploymentScope: { key: 'shell.deploymentScope', fallback: 'Deployment adapter' },
  tenantScopeAria: { key: 'shell.tenantScopeAria', fallback: 'Tenant scope (read only)' },
  projectScopeAria: { key: 'shell.projectScopeAria', fallback: 'Project scope (read only)' },
  environmentScopeAria: {
    key: 'shell.environmentScopeAria',
    fallback: 'Environment scope (read only)',
  },
  deploymentScopeAria: {
    key: 'shell.deploymentScopeAria',
    fallback: 'Deployment adapter (read only)',
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
  restApiLabel: { key: 'shell.restApiLabel', fallback: 'REST API' },
  liveEventsLabel: { key: 'shell.liveEventsLabel', fallback: 'Live events' },
  canvasRunStatusTemplate: {
    key: 'shell.canvasRunStatusTemplate',
    fallback: 'Canvas run status: {status}',
  },
  runningTemplate: { key: 'shell.runningTemplate', fallback: 'Running {runId}' },
  runReady: { key: 'shell.runReady', fallback: 'Ready' },
  previewRequired: { key: 'shell.previewRequired', fallback: 'Preview required' },
  runBlocked: { key: 'shell.runBlocked', fallback: 'Run blocked' },
  runCommand: { key: 'shell.runCommand', fallback: 'Run' },
};

const COPY_ES: ShellTopBarCopy = {
  skipToMainContent: 'Saltar al contenido principal',
  shell: 'Vista',
  aboutCommand: 'Acerca de Raven',
  aboutTitle: 'Acerca de Raven',
  aboutDescription: 'Metadatos compilados del bundle de Raven en ejecución.',
  aboutVersionLabel: 'Versión compilada',
  aboutBuildDateLabel: 'Fecha de build',
  aboutBuildDateUnavailable: 'No publicada',
  workspaceMenu: 'Espacio de trabajo',
  workspacePanels: 'Paneles',
  globalNavigation: 'Navegación',
  workspaceContext: 'Contexto del proyecto',
  showWorkspaceContext: 'Mostrar el contexto del proyecto y del espacio de trabajo',
  currentProject: 'Proyecto actual',
  availableProjects: 'Proyectos disponibles en esta sesión',
  noAlternativeProjects: 'No hay otro proyecto disponible en esta sesión.',
  projectUnavailable: 'Ese proyecto no está disponible en esta sesión.',
  gitContext: 'Contexto Git',
  viewOptions: 'Opciones de vista',
  language: 'Idioma',
  languageEnglish: 'Inglés',
  languageSpanish: 'Español',
  operationalDrawer: 'Operaciones',
  closeOperationalDrawer: 'Cerrar panel de operaciones',
  closeOperationalDrawerTab: 'Cerrar {tab}',
  restoreOperationalDrawerTabs: 'Mostrar ventanas',
  focusMode: 'Modo foco',
  canvasPalette: 'Fondo del canvas',
  canvasColorHexValue: 'Valor hexadecimal',
  canvasColorInputLabel: 'Establecer el color hexadecimal del fondo del Canvas',
  gridSize: 'Tamaño de rejilla',
  gridDensityDense: 'Densa',
  gridDensityDefault: 'Predeterminada',
  gridDensitySparse: 'Dispersa',
  resetGrid: 'Restablecer rejilla a 20px',
  tenantScope: 'Tenant',
  projectScope: 'Proyecto',
  environmentScope: 'Entorno',
  deploymentScope: 'Adaptador de despliegue',
  tenantScopeAria: 'Scope de tenant (solo lectura)',
  projectScopeAria: 'Scope de proyecto (solo lectura)',
  environmentScopeAria: 'Scope de entorno (solo lectura)',
  deploymentScopeAria: 'Adaptador de despliegue (solo lectura)',
  gitTooltip: 'Rama Git y SHA actuales',
  checking: 'Comprobando',
  checkingTooltip: 'Comprobando endpoints de salud de la plataforma',
  offline: 'Sin conexión',
  offlineTooltipFallback: 'No se puede alcanzar /healthz',
  degraded: 'Degradado',
  degradedTooltipFallback: 'Plataforma en estado degradado',
  restApiLabel: 'API REST',
  liveEventsLabel: 'Eventos en vivo',
  canvasRunStatusTemplate: 'Estado de ejecución del Canvas: {status}',
  runningTemplate: 'Ejecutando {runId}',
  runReady: 'Lista',
  previewRequired: 'Vista previa obligatoria',
  runBlocked: 'Ejecución bloqueada',
  runCommand: 'Ejecutar',
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
    skipToMainContent: resolveString(COPY_BY_KEY.skipToMainContent, locale),
    shell: resolveString(COPY_BY_KEY.shell, locale),
    aboutCommand: resolveString(COPY_BY_KEY.aboutCommand, locale),
    aboutTitle: resolveString(COPY_BY_KEY.aboutTitle, locale),
    aboutDescription: resolveString(COPY_BY_KEY.aboutDescription, locale),
    aboutVersionLabel: resolveString(COPY_BY_KEY.aboutVersionLabel, locale),
    aboutBuildDateLabel: resolveString(COPY_BY_KEY.aboutBuildDateLabel, locale),
    aboutBuildDateUnavailable: resolveString(COPY_BY_KEY.aboutBuildDateUnavailable, locale),
    workspaceMenu: resolveString(COPY_BY_KEY.workspaceMenu, locale),
    workspacePanels: resolveString(COPY_BY_KEY.workspacePanels, locale),
    globalNavigation: resolveString(COPY_BY_KEY.globalNavigation, locale),
    workspaceContext: resolveString(COPY_BY_KEY.workspaceContext, locale),
    showWorkspaceContext: resolveString(COPY_BY_KEY.showWorkspaceContext, locale),
    currentProject: resolveString(COPY_BY_KEY.currentProject, locale),
    availableProjects: resolveString(COPY_BY_KEY.availableProjects, locale),
    noAlternativeProjects: resolveString(COPY_BY_KEY.noAlternativeProjects, locale),
    projectUnavailable: resolveString(COPY_BY_KEY.projectUnavailable, locale),
    gitContext: resolveString(COPY_BY_KEY.gitContext, locale),
    viewOptions: resolveString(COPY_BY_KEY.viewOptions, locale),
    language: resolveString(COPY_BY_KEY.language, locale),
    languageEnglish: resolveString(COPY_BY_KEY.languageEnglish, locale),
    languageSpanish: resolveString(COPY_BY_KEY.languageSpanish, locale),
    operationalDrawer: resolveString(COPY_BY_KEY.operationalDrawer, locale),
    closeOperationalDrawer: resolveString(COPY_BY_KEY.closeOperationalDrawer, locale),
    closeOperationalDrawerTab: resolveString(COPY_BY_KEY.closeOperationalDrawerTab, locale),
    restoreOperationalDrawerTabs: resolveString(COPY_BY_KEY.restoreOperationalDrawerTabs, locale),
    focusMode: resolveString(COPY_BY_KEY.focusMode, locale),
    canvasPalette: resolveString(COPY_BY_KEY.canvasPalette, locale),
    canvasColorHexValue: resolveString(COPY_BY_KEY.canvasColorHexValue, locale),
    canvasColorInputLabel: resolveString(COPY_BY_KEY.canvasColorInputLabel, locale),
    gridSize: resolveString(COPY_BY_KEY.gridSize, locale),
    gridDensityDense: resolveString(COPY_BY_KEY.gridDensityDense, locale),
    gridDensityDefault: resolveString(COPY_BY_KEY.gridDensityDefault, locale),
    gridDensitySparse: resolveString(COPY_BY_KEY.gridDensitySparse, locale),
    resetGrid: resolveString(COPY_BY_KEY.resetGrid, locale),
    tenantScope: resolveString(COPY_BY_KEY.tenantScope, locale),
    projectScope: resolveString(COPY_BY_KEY.projectScope, locale),
    environmentScope: resolveString(COPY_BY_KEY.environmentScope, locale),
    deploymentScope: resolveString(COPY_BY_KEY.deploymentScope, locale),
    tenantScopeAria: resolveString(COPY_BY_KEY.tenantScopeAria, locale),
    projectScopeAria: resolveString(COPY_BY_KEY.projectScopeAria, locale),
    environmentScopeAria: resolveString(COPY_BY_KEY.environmentScopeAria, locale),
    deploymentScopeAria: resolveString(COPY_BY_KEY.deploymentScopeAria, locale),
    gitTooltip: resolveString(COPY_BY_KEY.gitTooltip, locale),
    checking: resolveString(COPY_BY_KEY.checking, locale),
    checkingTooltip: resolveString(COPY_BY_KEY.checkingTooltip, locale),
    offline: resolveString(COPY_BY_KEY.offline, locale),
    offlineTooltipFallback: resolveString(COPY_BY_KEY.offlineTooltipFallback, locale),
    degraded: resolveString(COPY_BY_KEY.degraded, locale),
    degradedTooltipFallback: resolveString(COPY_BY_KEY.degradedTooltipFallback, locale),
    restApiLabel: resolveString(COPY_BY_KEY.restApiLabel, locale),
    liveEventsLabel: resolveString(COPY_BY_KEY.liveEventsLabel, locale),
    canvasRunStatusTemplate: resolveString(COPY_BY_KEY.canvasRunStatusTemplate, locale),
    runningTemplate: resolveString(COPY_BY_KEY.runningTemplate, locale),
    runReady: resolveString(COPY_BY_KEY.runReady, locale),
    previewRequired: resolveString(COPY_BY_KEY.previewRequired, locale),
    runBlocked: resolveString(COPY_BY_KEY.runBlocked, locale),
    runCommand: resolveString(COPY_BY_KEY.runCommand, locale),
  };
}
