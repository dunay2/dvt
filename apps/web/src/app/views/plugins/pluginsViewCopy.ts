/** Owned concern: resolve locale-aware copy for the Plugins workbench. */
export type PluginsViewCopy = Readonly<{
  title: string;
  subtitle: string;
  registeredCount: string;
  catalogCount: string;
  localOnlyCount: string;
  apiVersion: string;
  minFrontendVersion: string;
  capabilityProbeTitle: string;
  capabilityProbeReady: string;
  capabilityProbeLoading: string;
  capabilityProbeError: string;
  pluginCatalogLoadingTitle: string;
  pluginCatalogLoadingDescription: string;
  pluginCatalogErrorTitle: string;
  pluginCatalogErrorDescription: string;
  noPluginsTitle: string;
  noPluginsDescription: string;
  catalogTitle: string;
  frontendTitle: string;
  backendTitle: string;
  operationalTitle: string;
  capabilitiesTitle: string;
  nodeKindsTitle: string;
  noCapabilities: string;
  noNodeKinds: string;
  searchPlaceholder: string;
  backendFilterAll: string;
  backendFilterAvailable: string;
  backendFilterBlocked: string;
  backendFilterDegraded: string;
  backendFilterPending: string;
  backendFilterNotRequired: string;
  frontendFilterAll: string;
  frontendFilterRegistered: string;
  frontendFilterNotRegistered: string;
  frontendFilterUnbound: string;
  pluginColumn: string;
  frontendColumn: string;
  backendColumn: string;
  operationalColumn: string;
  routesColumn: string;
  versionLabel: string;
  noPluginMatches: string;
  checkingLabel: string;
  probeUnavailableLabel: string;
  availableLabel: string;
  unavailableLabel: string;
  cataloguedLabel: string;
  loadedLabel: string;
  notRegisteredLabel: string;
  notRequiredLabel: string;
  notBoundLabel: string;
  readyLabel: string;
  pendingLabel: string;
  degradedLabel: string;
  unknownLabel: string;
  blockedLabel: string;
  unboundLabel: string;
  runtimeShapeFrontendOnly: string;
  runtimeShapeFrontendAndBackend: string;
  runtimeShapeBackendOnly: string;
  runtimeShapeUnbound: string;
  frontendNotRegisteredDetail: string;
  backendNotRequiredDetail: string;
  frontendOnlyReadyDetail: string;
  unboundBackendDetail: string;
  unboundOperationalDetail: string;
  backendCheckingDetail: string;
  backendPendingDetail: string;
  backendProbeUnavailableDetail: string;
  operationalProbeUnavailableDetail: string;
  operationalUnknownDetail: string;
  operationalReadyDetail: string;
  backendOnlyReadyDetail: string;
  operationalBlockedDetail: string;
  localOnlyDiagnosticTitle: string;
  catalogEntryDetail: (pluginId: string) => string;
  frontendLoadedDetail: (envFlag?: string, envValue?: string) => string;
  backendUnknownDetail: (backendPluginId: string) => string;
  backendAvailableDetail: (backendPluginId: string) => string;
  backendUnavailableDetail: (backendPluginId: string) => string;
  localOnlyDiagnosticDescription: (count: number) => string;
}>;

const EN_COPY: PluginsViewCopy = {
  title: 'Plugins',
  subtitle: 'Inspect catalog membership, frontend presence, backend state, and readiness.',
  registeredCount: 'Registered locally',
  catalogCount: 'Catalog',
  localOnlyCount: 'Local only',
  apiVersion: 'API',
  minFrontendVersion: 'Min frontend',
  capabilityProbeTitle: 'Backend capability probe',
  capabilityProbeReady: 'Backend capabilities responded and live availability is known.',
  capabilityProbeLoading: 'Checking backend capability availability.',
  capabilityProbeError: 'Capability probe unavailable. Backend availability is unknown.',
  pluginCatalogLoadingTitle: 'Loading plugin catalog',
  pluginCatalogLoadingDescription: 'Loading the DB-backed workspace plugin catalog.',
  pluginCatalogErrorTitle: 'Plugin catalog unavailable',
  pluginCatalogErrorDescription:
    'The DB-backed plugin catalog did not respond, so catalog membership cannot be proven.',
  noPluginsTitle: 'No catalog plugins',
  noPluginsDescription: 'The workspace catalog does not expose any enabled plugin entries.',
  catalogTitle: 'Catalog',
  frontendTitle: 'Frontend runtime',
  backendTitle: 'Backend',
  operationalTitle: 'Operational',
  capabilitiesTitle: 'Capabilities',
  nodeKindsTitle: 'Node kinds',
  noCapabilities: 'No explicit capability declarations.',
  noNodeKinds: 'No locally registered node kinds.',
  searchPlaceholder: 'Search plugins, capabilities, node kinds',
  backendFilterAll: 'All backend states',
  backendFilterAvailable: 'Backend available',
  backendFilterBlocked: 'Backend blocked',
  backendFilterDegraded: 'Backend degraded',
  backendFilterPending: 'Backend pending',
  backendFilterNotRequired: 'Backend not required',
  frontendFilterAll: 'All frontend states',
  frontendFilterRegistered: 'Frontend registered',
  frontendFilterNotRegistered: 'Frontend not registered',
  frontendFilterUnbound: 'Unbound',
  pluginColumn: 'Plugin',
  frontendColumn: 'Frontend',
  backendColumn: 'Backend',
  operationalColumn: 'Operational',
  routesColumn: 'Routes',
  versionLabel: 'Version',
  noPluginMatches: 'No catalog plugins match the current filters.',
  checkingLabel: 'Checking',
  probeUnavailableLabel: 'Probe unavailable',
  availableLabel: 'Available',
  unavailableLabel: 'Unavailable',
  cataloguedLabel: 'Catalogued',
  loadedLabel: 'Loaded',
  notRegisteredLabel: 'Not registered',
  notRequiredLabel: 'Not required',
  notBoundLabel: 'Not bound',
  readyLabel: 'Ready',
  pendingLabel: 'Pending',
  degradedLabel: 'Degraded',
  unknownLabel: 'Unknown',
  blockedLabel: 'Blocked',
  unboundLabel: 'Unbound',
  runtimeShapeFrontendOnly: 'Frontend only',
  runtimeShapeFrontendAndBackend: 'Frontend + backend',
  runtimeShapeBackendOnly: 'Backend only',
  runtimeShapeUnbound: 'Unbound',
  frontendNotRegisteredDetail: 'No local frontend module is registered for this DB catalog entry.',
  backendNotRequiredDetail: 'This frontend-only plugin does not require a backend handshake.',
  frontendOnlyReadyDetail: 'The registered frontend contribution is ready.',
  unboundBackendDetail: 'No frontend contribution or backend binding exists for this catalog row.',
  unboundOperationalDetail: 'This catalog row is unbound and cannot be reported as ready.',
  backendCheckingDetail: 'Waiting for the backend capability query.',
  backendPendingDetail: 'Operational readiness depends on the backend capability query.',
  backendProbeUnavailableDetail: 'The capability query failed, so backend state is unknown.',
  operationalProbeUnavailableDetail: 'Operational readiness cannot be confirmed.',
  operationalUnknownDetail: 'The backend did not publish a matching capability row.',
  operationalReadyDetail: 'Frontend registration and backend availability are both confirmed.',
  backendOnlyReadyDetail:
    'The backend-only catalog entry is available without claiming a frontend module is loaded.',
  operationalBlockedDetail: 'Backend unavailability blocks this plugin entry.',
  localOnlyDiagnosticTitle: 'Local registry mismatch',
  catalogEntryDetail: (pluginId) =>
    `DB catalog entry "${pluginId}" controls product catalog membership.`,
  frontendLoadedDetail: (envFlag, envValue) =>
    envFlag
      ? `A local frontend contribution is loaded. Runtime gate ${envFlag} = ${envValue ?? 'unset'}.`
      : 'A local frontend contribution is loaded.',
  backendUnknownDetail: (backendPluginId) =>
    `No capability entry was reported for backend plugin "${backendPluginId}".`,
  backendAvailableDetail: (backendPluginId) =>
    `Backend plugin "${backendPluginId}" reported that it is available.`,
  backendUnavailableDetail: (backendPluginId) =>
    `Backend plugin "${backendPluginId}" reported that it is unavailable.`,
  localOnlyDiagnosticDescription: (count) =>
    `${count} local contribution${count === 1 ? '' : 's'} are absent from the DB catalog and are not shown as catalog rows.`,
};

const ES_COPY: PluginsViewCopy = {
  title: 'Plugins',
  subtitle: 'Consulta catálogo, presencia frontend, estado backend y disponibilidad.',
  registeredCount: 'Registrados localmente',
  catalogCount: 'Catálogo',
  localOnlyCount: 'Solo locales',
  apiVersion: 'API',
  minFrontendVersion: 'Frontend mínimo',
  capabilityProbeTitle: 'Sonda de capacidades backend',
  capabilityProbeReady: 'El backend respondió y se conoce la disponibilidad actual.',
  capabilityProbeLoading: 'Comprobando la disponibilidad del backend.',
  capabilityProbeError: 'La sonda no está disponible. El estado backend es desconocido.',
  pluginCatalogLoadingTitle: 'Cargando catálogo de plugins',
  pluginCatalogLoadingDescription: 'Cargando el catálogo DB del workspace.',
  pluginCatalogErrorTitle: 'Catálogo de plugins no disponible',
  pluginCatalogErrorDescription:
    'El catálogo DB no respondió y no se puede demostrar la pertenencia al catálogo.',
  noPluginsTitle: 'No hay plugins en el catálogo',
  noPluginsDescription: 'El catálogo del workspace no expone plugins habilitados.',
  catalogTitle: 'Catálogo',
  frontendTitle: 'Runtime frontend',
  backendTitle: 'Backend',
  operationalTitle: 'Operativo',
  capabilitiesTitle: 'Capacidades',
  nodeKindsTitle: 'Tipos de nodo',
  noCapabilities: 'No hay capacidades declaradas.',
  noNodeKinds: 'No hay tipos de nodo registrados localmente.',
  searchPlaceholder: 'Buscar plugins, capacidades o tipos de nodo',
  backendFilterAll: 'Todos los estados backend',
  backendFilterAvailable: 'Backend disponible',
  backendFilterBlocked: 'Backend bloqueado',
  backendFilterDegraded: 'Backend degradado',
  backendFilterPending: 'Backend pendiente',
  backendFilterNotRequired: 'Backend no requerido',
  frontendFilterAll: 'Todos los estados frontend',
  frontendFilterRegistered: 'Frontend registrado',
  frontendFilterNotRegistered: 'Frontend no registrado',
  frontendFilterUnbound: 'Sin vincular',
  pluginColumn: 'Plugin',
  frontendColumn: 'Frontend',
  backendColumn: 'Backend',
  operationalColumn: 'Operativo',
  routesColumn: 'Rutas',
  versionLabel: 'Versión',
  noPluginMatches: 'Ningún plugin del catálogo coincide con los filtros.',
  checkingLabel: 'Comprobando',
  probeUnavailableLabel: 'Sonda no disponible',
  availableLabel: 'Disponible',
  unavailableLabel: 'No disponible',
  cataloguedLabel: 'En catálogo',
  loadedLabel: 'Cargado',
  notRegisteredLabel: 'No registrado',
  notRequiredLabel: 'No requerido',
  notBoundLabel: 'Sin vincular',
  readyLabel: 'Listo',
  pendingLabel: 'Pendiente',
  degradedLabel: 'Degradado',
  unknownLabel: 'Desconocido',
  blockedLabel: 'Bloqueado',
  unboundLabel: 'Sin vincular',
  runtimeShapeFrontendOnly: 'Solo frontend',
  runtimeShapeFrontendAndBackend: 'Frontend + backend',
  runtimeShapeBackendOnly: 'Solo backend',
  runtimeShapeUnbound: 'Sin vincular',
  frontendNotRegisteredDetail:
    'No hay un módulo frontend local registrado para esta entrada del catálogo DB.',
  backendNotRequiredDetail: 'Este plugin solo frontend no requiere una sonda backend.',
  frontendOnlyReadyDetail: 'La contribución frontend registrada está lista.',
  unboundBackendDetail: 'La entrada no tiene contribución frontend ni vínculo backend.',
  unboundOperationalDetail: 'La entrada está sin vincular y no puede figurar como lista.',
  backendCheckingDetail: 'Esperando la consulta de capacidades backend.',
  backendPendingDetail: 'La disponibilidad depende de la consulta de capacidades backend.',
  backendProbeUnavailableDetail: 'La consulta falló y el estado backend es desconocido.',
  operationalProbeUnavailableDetail: 'No se puede confirmar la disponibilidad operativa.',
  operationalUnknownDetail: 'El backend no publicó una capacidad coincidente.',
  operationalReadyDetail: 'El registro frontend y la disponibilidad backend están confirmados.',
  backendOnlyReadyDetail:
    'La entrada solo backend está disponible sin afirmar que existe un módulo frontend cargado.',
  operationalBlockedDetail: 'La indisponibilidad backend bloquea esta entrada.',
  localOnlyDiagnosticTitle: 'Desajuste del registro local',
  catalogEntryDetail: (pluginId) =>
    `La entrada DB "${pluginId}" controla la pertenencia al catálogo de producto.`,
  frontendLoadedDetail: (envFlag, envValue) =>
    envFlag
      ? `Hay una contribución frontend local cargada. Regla ${envFlag} = ${envValue ?? 'sin valor'}.`
      : 'Hay una contribución frontend local cargada.',
  backendUnknownDetail: (backendPluginId) =>
    `No se recibió una capacidad para el plugin backend "${backendPluginId}".`,
  backendAvailableDetail: (backendPluginId) =>
    `El plugin backend "${backendPluginId}" está disponible.`,
  backendUnavailableDetail: (backendPluginId) =>
    `El plugin backend "${backendPluginId}" no está disponible.`,
  localOnlyDiagnosticDescription: (count) =>
    `${count} contribución${count === 1 ? '' : 'es'} local${count === 1 ? '' : 'es'} no figura${count === 1 ? '' : 'n'} en el catálogo DB y no se muestra${count === 1 ? '' : 'n'} como fila${count === 1 ? '' : 's'}.`,
};

function detectPluginsViewLocale(): string {
  if (typeof navigator !== 'undefined' && navigator.language) {
    return navigator.language;
  }
  return 'en';
}

export function resolvePluginsViewCopy(
  locale: string = detectPluginsViewLocale()
): PluginsViewCopy {
  return locale.trim().toLowerCase().startsWith('es') ? ES_COPY : EN_COPY;
}
