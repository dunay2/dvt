/** Presentation copy for DVT rejection causes; server prose is diagnostic only. */
import type { DvtOperationalRejectionCause } from '@dvt/contracts';
import type { ApplicationLanguage } from '../../stores/applicationLanguageStore';

const COPY: Record<
  ApplicationLanguage,
  Record<DvtOperationalRejectionCause | 'unknown', string>
> = {
  en: {
    dvt_run_workload_count_invalid:
      'Run requires one executable workload. Review the selection and preview again.',
    dvt_run_intent_required:
      'This plan is not configured for Run. Configure an output and preview again.',
    dvt_run_connection_unavailable:
      'The execution connection is unavailable. Check its credentials and permissions.',
    dvt_run_publication_unavailable:
      'Result publication is not configured. Contact your administrator.',
    dvt_run_connection_not_found: 'The execution connection is not available in this workspace.',
    dvt_run_target_unmanaged: 'DVT does not manage this output table. Choose another destination.',
    dvt_run_schema_mismatch:
      'The output table changed after Preview. Review the destination and preview again.',
    run_execution_context_caller_ref_rejected:
      'The execution context must be prepared by the server. Preview again before Run.',
    run_execution_context_store_unavailable:
      'Execution context storage is unavailable. Contact your administrator.',
    dvt_preview_scope_incomplete: 'Select an authorized project and environment before previewing.',
    dvt_preview_canvas_mismatch: 'The active canvas changed. Refresh it and preview again.',
    dvt_preview_target_projection_failed:
      'The model cannot be prepared for its database. Check its inputs and supported operations.',
    dvt_preview_workload_projection_failed:
      'The model cannot be prepared for execution. Check its inputs, connections and output.',
    dvt_projection_stale: 'The model or its connection changed. Preview again before Run.',
    dvt_run_schema_digest_required:
      'The output schema has not been verified. Preview again before Run.',
    dvt_run_config_invalid: 'The model configuration is invalid. Review its properties.',
    dvt_run_disposition_unsupported:
      'Run currently requires a table output. Change the output type.',
    dvt_run_target_invalid: 'Configure a valid output connection, schema and table before Run.',
    unknown: 'This model cannot run. Review its configuration and preview again.',
  },
  es: {
    dvt_run_workload_count_invalid:
      'La ejecución requiere una única carga ejecutable. Revisa la selección y repite la vista previa.',
    dvt_run_intent_required:
      'Este plan no está configurado para ejecutar. Configura una salida y repite la vista previa.',
    dvt_run_connection_unavailable:
      'La conexión de ejecución no está disponible. Comprueba sus credenciales y permisos.',
    dvt_run_publication_unavailable:
      'La publicación de resultados no está configurada. Contacta con tu administrador.',
    dvt_run_connection_not_found:
      'La conexión de ejecución no está disponible en este espacio de trabajo.',
    dvt_run_target_unmanaged: 'DVT no gestiona esta tabla de salida. Elige otro destino.',
    dvt_run_schema_mismatch:
      'La tabla de salida cambió tras la vista previa. Revisa el destino y repite la vista previa.',
    run_execution_context_caller_ref_rejected:
      'El servidor debe preparar el contexto de ejecución. Repite la vista previa antes de ejecutar.',
    run_execution_context_store_unavailable:
      'El almacenamiento del contexto de ejecución no está disponible. Contacta con tu administrador.',
    dvt_preview_scope_incomplete:
      'Selecciona un proyecto y un entorno autorizados antes de obtener la vista previa.',
    dvt_preview_canvas_mismatch: 'El lienzo activo cambió. Actualízalo y repite la vista previa.',
    dvt_preview_target_projection_failed:
      'No se puede preparar el modelo para su base de datos. Comprueba sus entradas y las operaciones admitidas.',
    dvt_preview_workload_projection_failed:
      'No se puede preparar el modelo para ejecutar. Revisa sus entradas, conexiones y salida.',
    dvt_projection_stale:
      'El modelo o su conexión cambió. Repite la vista previa antes de ejecutar.',
    dvt_run_schema_digest_required:
      'El esquema de salida no está verificado. Repite la vista previa antes de ejecutar.',
    dvt_run_config_invalid: 'La configuración del modelo no es válida. Revisa sus propiedades.',
    dvt_run_disposition_unsupported:
      'La ejecución requiere una salida de tipo tabla. Cambia el tipo de salida.',
    dvt_run_target_invalid:
      'Configura una conexión, un esquema y una tabla de salida válidos antes de ejecutar.',
    unknown: 'No se puede ejecutar este modelo. Revisa su configuración y repite la vista previa.',
  },
};

export function resolveDvtOperationalRejectionCopy(
  cause: string | null | undefined,
  language: ApplicationLanguage
): string | null {
  const copy = COPY[language];
  if (cause != null && Object.hasOwn(copy, cause)) return copy[cause as keyof typeof copy];
  return cause?.startsWith('dvt_') || cause?.startsWith('run_execution_context')
    ? copy.unknown
    : null;
}
