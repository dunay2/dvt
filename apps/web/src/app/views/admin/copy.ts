/** Own Admin presentation strings, including the security directory in the active language. */
import type { ApplicationLanguage } from '../../stores/applicationLanguageStore';

export const adminViewCopy = {
  title: {
    key: 'navigation.admin.title',
    fallback: 'Admin & RBAC',
    translations: { es: 'Administración' },
  },
  tabs: {
    platform: 'Platform',
    roles: 'Roles',
    permissions: 'Permissions',
    audit: 'Audit Log',
  },
  sections: {
    backendProbeTitle: 'Backend probe details',
    backendProbeSubtitle: 'What is up, what responded, and which base URL the shell is using.',
    capabilitiesTitle: 'Capabilities in use',
    capabilitiesSubtitle: 'What the backend reports as available for this frontend.',
    rolesSubtitle: 'Manage user roles and permissions',
    permissionMatrixTitle: 'Permission Matrix',
  },
  labels: {
    backendStatus: 'Backend status',
    version: 'API service version',
    databaseReadiness: 'Database readiness',
    readiness: 'Readiness',
    dataTransport: 'Data transport',
    frontendCompatibility: 'Frontend compatibility',
    pluginAvailability: 'Plugin availability',
    apiBaseUrl: 'API base URL',
    observedAt: 'Observed at',
    role: 'Role',
    timestamp: 'Timestamp',
    user: 'User',
    action: 'Action',
    resource: 'Resource',
    details: 'Details',
    status: 'Status',
  },
  states: {
    capabilitiesLoading: 'Loading capabilities...',
    capabilitiesError: 'Capabilities endpoint unavailable.',
    capabilitiesEmpty: 'No capability data.',
    capabilitiesStale: 'Capabilities refresh failed. Showing the last received capability facts.',
    notObserved: 'not observed',
    notResolved: 'not resolved',
    noSnapshot: 'No platform snapshot observed.',
    refreshing: 'Refreshing platform observations…',
  },
  actions: {
    createRole: 'Create Role',
    edit: 'Edit',
  },
  filters: {
    auditPlaceholder: 'Search audit log...',
  },
} as const;

export type AdminNavigationCopy = Readonly<{
  title: string;
  tabs: Readonly<Record<keyof typeof adminViewCopy.tabs, string>>;
}>;

export const adminNavigationCopy = {
  en: { title: 'Security', tabs: adminViewCopy.tabs },
  es: {
    title: 'Seguridad',
    tabs: {
      platform: 'Plataforma',
      roles: 'Roles',
      permissions: 'Permisos',
      audit: 'Registro de auditoría',
    },
  },
} as const satisfies Record<ApplicationLanguage, AdminNavigationCopy>;
