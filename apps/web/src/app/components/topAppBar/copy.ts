export type TopAppBarCopy = {
  readonly shell: string;
  readonly workspaceControls: string;
  readonly explorerPanel: string;
  readonly inspectorPanel: string;
  readonly consolePanel: string;
  readonly focusMode: string;
  readonly gridSize: string;
  readonly quickActions: string;
  readonly notifications: string;
  readonly profileSettings: string;
  readonly apiKeys: string;
  readonly documentation: string;
  readonly signOut: string;
  readonly gitTooltip: string;
  readonly checking: string;
  readonly checkingTooltip: string;
  readonly offline: string;
  readonly offlineTooltipFallback: string;
  readonly degraded: string;
  readonly degradedTooltipFallback: string;
};

const EN_COPY: TopAppBarCopy = {
  shell: 'Shell',
  workspaceControls: 'Workspace controls',
  explorerPanel: 'Explorer Panel',
  inspectorPanel: 'Inspector Panel',
  consolePanel: 'Console',
  focusMode: 'Focus Mode',
  gridSize: 'Grid size',
  quickActions: 'Quick actions',
  notifications: 'Notifications',
  profileSettings: 'Profile Settings',
  apiKeys: 'API Keys',
  documentation: 'Documentation',
  signOut: 'Sign Out',
  gitTooltip: 'Current Git branch and commit SHA',
  checking: 'Checking',
  checkingTooltip: 'Checking platform health endpoints',
  offline: 'Offline',
  offlineTooltipFallback: 'Unable to reach /healthz',
  degraded: 'Degraded',
  degradedTooltipFallback: 'Platform in degraded state',
};

const ES_COPY: TopAppBarCopy = {
  shell: 'Shell',
  workspaceControls: 'Controles del workspace',
  explorerPanel: 'Panel explorador',
  inspectorPanel: 'Panel inspector',
  consolePanel: 'Consola',
  focusMode: 'Modo foco',
  gridSize: 'Tamaño de rejilla',
  quickActions: 'Acciones rápidas',
  notifications: 'Notificaciones',
  profileSettings: 'Configuración de perfil',
  apiKeys: 'Claves API',
  documentation: 'Documentación',
  signOut: 'Cerrar sesión',
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

export function resolveTopAppBarCopy(locale = detectBrowserLocale()): TopAppBarCopy {
  if (locale.toLowerCase().startsWith('es')) {
    return ES_COPY;
  }
  return EN_COPY;
}
