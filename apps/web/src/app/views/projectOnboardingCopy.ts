/** Owned concern: provide locale-aware first-project onboarding presentation copy. */
import type { ApplicationLanguage } from '../stores/applicationLanguageStore';

export type ProjectOnboardingCopy = Readonly<{
  workspaceLabel: string;
  title: string;
  description: string;
  availableProjectsTitle: string;
  createProjectTitle: string;
  loadingMessage: string;
  tenantLabel: string;
  projectNameLabel: string;
  projectNamePlaceholder: string;
  creationUnavailableMessage: string;
  createProjectLabel: string;
  refreshProjectsLabel: string;
  openProjectLabel: string;
  noProjectsMessage: string;
  failureMessage: string;
}>;

const COPY_BY_LANGUAGE: Record<ApplicationLanguage, ProjectOnboardingCopy> = {
  en: {
    workspaceLabel: 'Workspace',
    title: 'Choose or create a project',
    description: 'Open an authorized project or create a governed project for your Canvas work.',
    availableProjectsTitle: 'Available projects',
    createProjectTitle: 'Create a project',
    loadingMessage: 'Loading project access…',
    tenantLabel: 'Tenant',
    projectNameLabel: 'Project name',
    projectNamePlaceholder: 'Orders',
    creationUnavailableMessage: 'Project creation is not granted for this tenant.',
    createProjectLabel: 'Create project',
    refreshProjectsLabel: 'Refresh projects',
    openProjectLabel: 'Open project',
    noProjectsMessage: 'No projects are available for this account.',
    failureMessage: 'Project onboarding failed.',
  },
  es: {
    workspaceLabel: 'Espacio de trabajo',
    title: 'Elige o crea un proyecto',
    description: 'Abre un proyecto autorizado o crea uno gobernado para trabajar en Canvas.',
    availableProjectsTitle: 'Proyectos disponibles',
    createProjectTitle: 'Crear un proyecto',
    loadingMessage: 'Cargando acceso a proyectos…',
    tenantLabel: 'Tenant',
    projectNameLabel: 'Nombre del proyecto',
    projectNamePlaceholder: 'Pedidos',
    creationUnavailableMessage: 'No tienes permiso para crear proyectos en este tenant.',
    createProjectLabel: 'Crear proyecto',
    refreshProjectsLabel: 'Actualizar proyectos',
    openProjectLabel: 'Abrir proyecto',
    noProjectsMessage: 'No hay proyectos disponibles para esta cuenta.',
    failureMessage: 'No se pudo preparar la selección de proyecto.',
  },
};

export function resolveProjectOnboardingCopy(language: ApplicationLanguage): ProjectOnboardingCopy {
  return COPY_BY_LANGUAGE[language];
}
