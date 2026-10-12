/**
 * Owned concern: localize DVT admission rejections without rendering diagnostic strings.
 * @baseline ADR-0044: Diagnostic prose is not a presentation contract.
 * @decision Resolve named DVT definitions through exhaustive EN/ES copy.
 * @consequence Unknown DVT causes receive a localized fallback, never provider prose.
 * @version 1.0.0
 */
import { DVT_REJECTIONS, type DvtOperationalRejection } from '@dvt/contracts';
import type { ApplicationLanguage } from '../../stores/applicationLanguageStore';

const COPY: Record<
  ApplicationLanguage,
  Record<DvtOperationalRejection['messageKey'] | 'unknown', string>
> = {
  en: {
    [DVT_REJECTIONS.runWorkloadCountInvalid.messageKey]:
      'Run requires one executable workload. Review the selection and preview again.',
    [DVT_REJECTIONS.runIntentRequired.messageKey]:
      'This plan is not configured for Run. Configure an output and preview again.',
    [DVT_REJECTIONS.runConnectionUnavailable.messageKey]:
      'The execution connection is unavailable. Check its credentials and permissions.',
    [DVT_REJECTIONS.runPublicationUnavailable.messageKey]:
      'Result publication is not configured. Contact your administrator.',
    [DVT_REJECTIONS.runConnectionNotFound.messageKey]:
      'The execution connection is not available in this workspace.',
    [DVT_REJECTIONS.runTargetUnmanaged.messageKey]:
      'DVT does not manage this output table. Choose another destination.',
    [DVT_REJECTIONS.runSchemaMismatch.messageKey]:
      'The output table changed after Preview. Review the destination and preview again.',
    [DVT_REJECTIONS.previewScopeIncomplete.messageKey]:
      'Select an authorized project and environment before previewing.',
    [DVT_REJECTIONS.previewCanvasMismatch.messageKey]:
      'The active canvas changed. Refresh it and preview again.',
    [DVT_REJECTIONS.previewTargetProjectionFailed.messageKey]:
      'The model cannot be prepared for its database. Check its inputs and supported operations.',
    [DVT_REJECTIONS.previewWorkloadProjectionFailed.messageKey]:
      'The model cannot be prepared for execution. Check its inputs, connections and output.',
    [DVT_REJECTIONS.projectionStale.messageKey]:
      'The model or its connection changed. Preview again before Run.',
    [DVT_REJECTIONS.runSchemaDigestRequired.messageKey]:
      'The output schema has not been verified. Preview again before Run.',
    [DVT_REJECTIONS.runConfigInvalid.messageKey]:
      'The model configuration is invalid. Review its properties.',
    [DVT_REJECTIONS.runDispositionUnsupported.messageKey]:
      'Run currently requires a table output. Change the output type.',
    [DVT_REJECTIONS.runTargetInvalid.messageKey]:
      'Configure a valid output connection, schema and table before Run.',
    unknown: 'This model cannot run. Review its configuration and preview again.',
  },
  es: {
    [DVT_REJECTIONS.runWorkloadCountInvalid.messageKey]:
      'La ejecución requiere una única carga ejecutable. Revisa la selección y repite la vista previa.',
    [DVT_REJECTIONS.runIntentRequired.messageKey]:
      'Este plan no está configurado para ejecutar. Configura una salida y repite la vista previa.',
    [DVT_REJECTIONS.runConnectionUnavailable.messageKey]:
      'La conexión de ejecución no está disponible. Comprueba sus credenciales y permisos.',
    [DVT_REJECTIONS.runPublicationUnavailable.messageKey]:
      'La publicación de resultados no está configurada. Contacta con tu administrador.',
    [DVT_REJECTIONS.runConnectionNotFound.messageKey]:
      'La conexión de ejecución no está disponible en este espacio de trabajo.',
    [DVT_REJECTIONS.runTargetUnmanaged.messageKey]:
      'DVT no gestiona esta tabla de salida. Elige otro destino.',
    [DVT_REJECTIONS.runSchemaMismatch.messageKey]:
      'La tabla de salida cambió tras la vista previa. Revisa el destino y repite la vista previa.',
    [DVT_REJECTIONS.previewScopeIncomplete.messageKey]:
      'Selecciona un proyecto y un entorno autorizados antes de obtener la vista previa.',
    [DVT_REJECTIONS.previewCanvasMismatch.messageKey]:
      'El lienzo activo cambió. Actualízalo y repite la vista previa.',
    [DVT_REJECTIONS.previewTargetProjectionFailed.messageKey]:
      'No se puede preparar el modelo para su base de datos. Comprueba sus entradas y las operaciones admitidas.',
    [DVT_REJECTIONS.previewWorkloadProjectionFailed.messageKey]:
      'No se puede preparar el modelo para ejecutar. Revisa sus entradas, conexiones y salida.',
    [DVT_REJECTIONS.projectionStale.messageKey]:
      'El modelo o su conexión cambió. Repite la vista previa antes de ejecutar.',
    [DVT_REJECTIONS.runSchemaDigestRequired.messageKey]:
      'El esquema de salida no está verificado. Repite la vista previa antes de ejecutar.',
    [DVT_REJECTIONS.runConfigInvalid.messageKey]:
      'La configuración del modelo no es válida. Revisa sus propiedades.',
    [DVT_REJECTIONS.runDispositionUnsupported.messageKey]:
      'La ejecución requiere una salida de tipo tabla. Cambia el tipo de salida.',
    [DVT_REJECTIONS.runTargetInvalid.messageKey]:
      'Configura una conexión, un esquema y una tabla de salida válidos antes de ejecutar.',
    unknown: 'No se puede ejecutar este modelo. Revisa su configuración y repite la vista previa.',
  },
};

export function resolveDvtOperationalRejectionCopy(
  cause: string | null | undefined,
  language: ApplicationLanguage
): string | null {
  const copy = COPY[language];
  const definition = Object.values(DVT_REJECTIONS).find((entry) => entry.cause === cause);
  if (definition !== undefined) return copy[definition.messageKey];
  return cause?.startsWith('dvt_') ? copy.unknown : null;
}
