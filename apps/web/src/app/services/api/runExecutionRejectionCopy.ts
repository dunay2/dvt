/** Owned concern: localize Run admission rejections without rendering diagnostic strings. */
import { RUN_REJECTIONS, type RunExecutionRejection } from '@dvt/contracts';
import type { ApplicationLanguage } from '../../stores/applicationLanguageStore';

const RUN_COPY: Record<
  ApplicationLanguage,
  Record<RunExecutionRejection['messageKey'] | 'unknown', string>
> = {
  en: {
    [RUN_REJECTIONS.callerContextProvided.messageKey]:
      'The execution context must be prepared by the server. Preview again before Run.',
    [RUN_REJECTIONS.contextStoreUnavailable.messageKey]:
      'Execution context storage is unavailable. Contact your administrator.',
    [RUN_REJECTIONS.dbtTargetRequired.messageKey]:
      'Configure a server-owned DBT execution target before Run.',
    [RUN_REJECTIONS.dbtAdapterMismatch.messageKey]:
      'The selected executor does not match the configured DBT target.',
    [RUN_REJECTIONS.dbtProvenanceInvalid.messageKey]:
      'The saved plan provenance is invalid. Preview again.',
    [RUN_REJECTIONS.dbtProvenanceNotProject.messageKey]:
      'The saved plan does not describe a DBT project.',
    [RUN_REJECTIONS.dbtTargetChanged.messageKey]:
      'The DBT target changed after Preview. Preview again.',
    [RUN_REJECTIONS.dbtConnectionNotFound.messageKey]:
      'The Preview-bound DBT connection is unavailable in this workspace.',
    [RUN_REJECTIONS.dbtConnectionInvalid.messageKey]:
      'The Preview-bound DBT connection does not match the authorized connection.',
    [RUN_REJECTIONS.dbtProfileMismatch.messageKey]:
      'The DBT profile does not match the authorized connection. Review its configuration.',
    [RUN_REJECTIONS.bundleStoreUnavailable.messageKey]:
      'DBT bundle storage is not configured. Contact your administrator.',
    [RUN_REJECTIONS.bundleStoreUnsupported.messageKey]:
      'The configured storage cannot create DBT execution bundles.',
    [RUN_REJECTIONS.projectUnavailable.messageKey]: 'The authorized DBT project is unavailable.',
    [RUN_REJECTIONS.projectUnreadable.messageKey]: 'The DBT project could not be prepared safely.',
    [RUN_REJECTIONS.projectRevisionMismatch.messageKey]:
      'The DBT project changed after Preview. Preview again before Run.',
    unknown: 'Execution could not be prepared. Review its configuration and preview again.',
  },
  es: {
    [RUN_REJECTIONS.callerContextProvided.messageKey]:
      'El servidor debe preparar el contexto de ejecución. Repite la vista previa antes de ejecutar.',
    [RUN_REJECTIONS.contextStoreUnavailable.messageKey]:
      'El almacenamiento del contexto de ejecución no está disponible. Contacta con tu administrador.',
    [RUN_REJECTIONS.dbtTargetRequired.messageKey]:
      'Configura un destino de ejecución DBT en el servidor antes de ejecutar.',
    [RUN_REJECTIONS.dbtAdapterMismatch.messageKey]:
      'El ejecutor seleccionado no coincide con el destino DBT configurado.',
    [RUN_REJECTIONS.dbtProvenanceInvalid.messageKey]:
      'El origen del plan guardado no es válido. Repite la vista previa.',
    [RUN_REJECTIONS.dbtProvenanceNotProject.messageKey]:
      'El plan guardado no corresponde a un proyecto DBT.',
    [RUN_REJECTIONS.dbtTargetChanged.messageKey]:
      'El destino DBT cambió tras la vista previa. Repite la vista previa.',
    [RUN_REJECTIONS.dbtConnectionNotFound.messageKey]:
      'La conexión DBT de la vista previa no está disponible en este espacio de trabajo.',
    [RUN_REJECTIONS.dbtConnectionInvalid.messageKey]:
      'La conexión DBT de la vista previa no coincide con la conexión autorizada.',
    [RUN_REJECTIONS.dbtProfileMismatch.messageKey]:
      'El perfil DBT no corresponde a la conexión autorizada. Revisa su configuración.',
    [RUN_REJECTIONS.bundleStoreUnavailable.messageKey]:
      'El almacenamiento de paquetes DBT no está configurado. Contacta con tu administrador.',
    [RUN_REJECTIONS.bundleStoreUnsupported.messageKey]:
      'El almacenamiento configurado no permite crear paquetes DBT de ejecución.',
    [RUN_REJECTIONS.projectUnavailable.messageKey]:
      'El proyecto DBT autorizado no está disponible.',
    [RUN_REJECTIONS.projectUnreadable.messageKey]:
      'No se pudo preparar el proyecto DBT de forma segura.',
    [RUN_REJECTIONS.projectRevisionMismatch.messageKey]:
      'El proyecto DBT cambió tras la vista previa. Repite la vista previa antes de ejecutar.',
    unknown: 'No se pudo preparar la ejecución. Revisa su configuración y repite la vista previa.',
  },
};

export function resolveRunExecutionRejectionCopy(
  cause: string | null | undefined,
  language: ApplicationLanguage
): string | null {
  const copy = RUN_COPY[language];
  const definition = Object.values(RUN_REJECTIONS).find((entry) => entry.cause === cause);
  if (definition !== undefined) return copy[definition.messageKey];
  return cause?.startsWith('run_execution_context') || cause?.startsWith('run_dbt_')
    ? copy.unknown
    : null;
}
