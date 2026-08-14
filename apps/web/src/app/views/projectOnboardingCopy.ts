/** Owned concern: provide locale-aware first-project onboarding presentation copy. */
import type { ApplicationLanguage } from '../stores/applicationLanguageStore';

export type ProjectOnboardingCopy = Readonly<{
  workspaceLabel: string;
  title: string;
  description: string;
  availableProjectsTitle: string;
  createProjectTitle: string;
  loadingMessage: string;
  organizationLabel: string;
  projectNameLabel: string;
  projectNamePlaceholder: string;
  creationUnavailableMessage: string;
  createProjectLabel: string;
  refreshProjectsLabel: string;
  openProjectLabel: string;
  noProjectsMessage: string;
  failureMessage: string;
  duplicateProjectNameMessage: string;
  projectCreationConflictMessage: string;
  projectCreationFailureMessage: string;
  projectActivationFailureMessage: string;
  newProjectActionLabel: string;
  newProjectDialogTitle: string;
  newProjectDialogDescription: string;
  cancelActionLabel: string;
  closeProjectDialogLabel: string;
}>;

const COPY_BY_LANGUAGE: Record<ApplicationLanguage, ProjectOnboardingCopy> = {
  en: {
    workspaceLabel: 'Workspace',
    title: 'Choose or create a project',
    description: 'Open an authorized project or create a governed project for your Canvas work.',
    availableProjectsTitle: 'Available projects',
    createProjectTitle: 'Create a project',
    loadingMessage: 'Loading project access…',
    organizationLabel: 'Organization',
    projectNameLabel: 'Project name',
    projectNamePlaceholder: 'Orders',
    creationUnavailableMessage: 'Project creation is not granted for this organization.',
    createProjectLabel: 'Create project',
    refreshProjectsLabel: 'Refresh projects',
    openProjectLabel: 'Open project',
    noProjectsMessage: 'No projects are available for this account.',
    failureMessage: 'Project onboarding failed.',
    duplicateProjectNameMessage:
      'A project with that name already exists in this organization. Choose another name.',
    projectCreationConflictMessage:
      'This project creation request can no longer be confirmed. Close the dialog and try again.',
    projectCreationFailureMessage: 'The project could not be created. Try again.',
    projectActivationFailureMessage:
      'The project was created, but it could not be opened. Refresh projects and open it from the list.',
    newProjectActionLabel: 'New project…',
    newProjectDialogTitle: 'Create a new project',
    newProjectDialogDescription:
      'Choose an authorized organization and give the project a recognizable name.',
    cancelActionLabel: 'Cancel',
    closeProjectDialogLabel: 'Close new project dialog',
  },
  es: {
    workspaceLabel: 'Espacio de trabajo',
    title: 'Elige o crea un proyecto',
    description: 'Abre un proyecto autorizado o crea uno gobernado para trabajar en Canvas.',
    availableProjectsTitle: 'Proyectos disponibles',
    createProjectTitle: 'Crear un proyecto',
    loadingMessage: 'Cargando acceso a proyectos…',
    organizationLabel: 'Organización',
    projectNameLabel: 'Nombre del proyecto',
    projectNamePlaceholder: 'Pedidos',
    creationUnavailableMessage: 'No tienes permiso para crear proyectos en esta organización.',
    createProjectLabel: 'Crear proyecto',
    refreshProjectsLabel: 'Actualizar proyectos',
    openProjectLabel: 'Abrir proyecto',
    noProjectsMessage: 'No hay proyectos disponibles para esta cuenta.',
    failureMessage: 'No se pudo preparar la selección de proyecto.',
    duplicateProjectNameMessage:
      'Ya existe un proyecto con ese nombre en esta organización. Elige otro nombre.',
    projectCreationConflictMessage:
      'Ya no se puede confirmar esta solicitud de creación. Cierra el diálogo e inténtalo de nuevo.',
    projectCreationFailureMessage: 'No se pudo crear el proyecto. Inténtalo de nuevo.',
    projectActivationFailureMessage:
      'El proyecto se creó, pero no se pudo abrir. Actualiza los proyectos y ábrelo desde la lista.',
    newProjectActionLabel: 'Nuevo proyecto…',
    newProjectDialogTitle: 'Crea un proyecto',
    newProjectDialogDescription:
      'Elige una organización autorizada y asigna al proyecto un nombre reconocible.',
    cancelActionLabel: 'Cancelar',
    closeProjectDialogLabel: 'Cerrar el diálogo de nuevo proyecto',
  },
};

export function resolveProjectOnboardingCopy(language: ApplicationLanguage): ProjectOnboardingCopy {
  return COPY_BY_LANGUAGE[language];
}
