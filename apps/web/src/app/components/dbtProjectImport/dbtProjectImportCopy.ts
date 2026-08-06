/** Owned concern: localize the dbt project import dialog chrome. */
import type { ApplicationLanguage } from '../../stores/applicationLanguageStore';
import type { DbtProjectImportPhase } from './dbtProjectImportPresentationModel';

export type DbtProjectImportCopy = Readonly<{
  title: string;
  description: string;
  closeLabel: string;
  cancelLabel: string;
  adapterLabel: string;
  filesLabel: string;
  fileCountTemplate: string;
  includedLabel: string;
  excludedLabel: string;
  projectSizeLabel: string;
  inventoryTitle: string;
  pathLabel: string;
  classificationLabel: string;
  decisionLabel: string;
  sizeLabel: string;
  diagnosticsTitle: string;
  requestFailedTitle: string;
  authorityEstablishedTitle: string;
  projectedResourcesTemplate: string;
  canvasLabel: string;
  revisionLabel: string;
  projectRootLabel: string;
  projectRootHelp: string;
  canvasIdLabel: string;
  canvasIdHelp: string;
  validateLabel: string;
  importLabel: string;
  statusByPhase: Readonly<Record<DbtProjectImportPhase, string>>;
}>;

const COPY_BY_LANGUAGE: Record<ApplicationLanguage, DbtProjectImportCopy> = {
  en: {
    title: 'Import dbt project',
    description: 'Validate a workspace project before establishing file-backed Canvas authority.',
    closeLabel: 'Close dbt project import',
    cancelLabel: 'Cancel',
    adapterLabel: 'Adapter',
    filesLabel: 'Files',
    fileCountTemplate: '{count} files',
    includedLabel: 'Included',
    excludedLabel: 'Excluded',
    projectSizeLabel: 'Project size',
    inventoryTitle: 'Project inventory',
    pathLabel: 'Path',
    classificationLabel: 'Classification',
    decisionLabel: 'Decision',
    sizeLabel: 'Size',
    diagnosticsTitle: 'Diagnostics',
    requestFailedTitle: 'Import request failed',
    authorityEstablishedTitle: 'Project authority established',
    projectedResourcesTemplate: '{count} projected resources',
    canvasLabel: 'Canvas',
    revisionLabel: 'Revision',
    projectRootLabel: 'Project root',
    projectRootHelp: 'Workspace-relative directory containing dbt_project.yml.',
    canvasIdLabel: 'Canvas ID',
    canvasIdHelp: 'New Canvas identity; an existing graph-owned Canvas is rejected.',
    validateLabel: 'Validate project',
    importLabel: 'Import project',
    statusByPhase: {
      idle: 'Not validated',
      validating: 'Validating project',
      accepted: 'Ready to import',
      rejected: 'Validation rejected',
      importing: 'Importing project',
      imported: 'Imported',
      failed: 'Operation failed',
    },
  },
  es: {
    title: 'Importar proyecto dbt',
    description: 'Valida un proyecto del workspace antes de establecer la autoridad de Canvas.',
    closeLabel: 'Cerrar importación de proyecto dbt',
    cancelLabel: 'Cancelar',
    adapterLabel: 'Adaptador',
    filesLabel: 'Archivos',
    fileCountTemplate: '{count} archivos',
    includedLabel: 'Incluidos',
    excludedLabel: 'Excluidos',
    projectSizeLabel: 'Tamaño del proyecto',
    inventoryTitle: 'Inventario del proyecto',
    pathLabel: 'Ruta',
    classificationLabel: 'Clasificación',
    decisionLabel: 'Decisión',
    sizeLabel: 'Tamaño',
    diagnosticsTitle: 'Diagnósticos',
    requestFailedTitle: 'Falló la solicitud de importación',
    authorityEstablishedTitle: 'Autoridad del proyecto establecida',
    projectedResourcesTemplate: '{count} recursos proyectados',
    canvasLabel: 'Canvas',
    revisionLabel: 'Revisión',
    projectRootLabel: 'Raíz del proyecto',
    projectRootHelp: 'Directorio relativo al workspace que contiene dbt_project.yml.',
    canvasIdLabel: 'ID de Canvas',
    canvasIdHelp: 'Identidad del nuevo Canvas; se rechaza un Canvas ya gobernado por el grafo.',
    validateLabel: 'Validar proyecto',
    importLabel: 'Importar proyecto',
    statusByPhase: {
      idle: 'Sin validar',
      validating: 'Validando proyecto',
      accepted: 'Listo para importar',
      rejected: 'Validación rechazada',
      importing: 'Importando proyecto',
      imported: 'Importado',
      failed: 'Operación fallida',
    },
  },
};

export function resolveDbtProjectImportCopy(language: ApplicationLanguage): DbtProjectImportCopy {
  return COPY_BY_LANGUAGE[language];
}
