import { describe, expect, it } from 'vitest';

import { resolveCanvasViewCopy } from './canvasCopyCatalog';
import type { CanvasInspectorNodeDraftErrorCode } from './canvasInspectorAuthoringErrorCodes';
import type { CanvasViewCopy } from './canvasCopy.types';
import {
  canvasViewCopy,
  formatCanvasConnectionRejection,
  formatCanvasInspectorNodeDraftError,
  formatTransformationGraphValidationSummary,
} from './copy';

const INSPECTOR_DRAFT_ERROR_COPY_KEYS = [
  ['node_name_required', 'inspectorErrorNodeNameRequired'],
  ['dbt_package_required', 'inspectorErrorDbtPackageRequired'],
  ['dbt_source_required', 'inspectorErrorDbtSourceRequired'],
  ['dbt_schema_required', 'inspectorErrorDbtSchemaRequired'],
  ['dbt_table_required', 'inspectorErrorDbtTableRequired'],
  ['dbt_materialization_invalid', 'inspectorErrorDbtMaterializationInvalid'],
  ['dvt_schema_required', 'inspectorErrorDvtSchemaRequired'],
  ['dvt_table_required', 'inspectorErrorDvtTableRequired'],
  ['dvt_alias_required', 'inspectorErrorDvtAliasRequired'],
  ['dvt_materialization_invalid', 'inspectorErrorDvtMaterializationInvalid'],
  ['dvt_write_mode_invalid', 'inspectorErrorDvtWriteModeInvalid'],
  ['object_file_storage_uri_invalid', 'inspectorErrorObjectFileStorageUriInvalid'],
  ['object_file_sha256_invalid', 'inspectorErrorObjectFileSha256Invalid'],
  ['object_file_size_invalid', 'inspectorErrorObjectFileSizeInvalid'],
  ['object_file_max_bytes_invalid', 'inspectorErrorObjectFileMaxBytesInvalid'],
  ['object_file_source_credential_ref_invalid', 'inspectorErrorObjectFileSourceCredentialInvalid'],
  ['object_file_target_relation_invalid', 'inspectorErrorObjectFileTargetRelationInvalid'],
  ['object_file_target_credential_ref_invalid', 'inspectorErrorObjectFileTargetCredentialInvalid'],
  ['object_file_column_mapping_invalid', 'inspectorErrorObjectFileColumnMappingInvalid'],
  ['http_json_endpoint_ref_invalid', 'inspectorErrorHttpJsonEndpointRefInvalid'],
  ['http_json_auth_credential_ref_invalid', 'inspectorErrorHttpJsonAuthCredentialRefInvalid'],
  ['http_json_sha256_invalid', 'inspectorErrorHttpJsonSha256Invalid'],
  ['http_json_size_invalid', 'inspectorErrorHttpJsonSizeInvalid'],
  ['http_json_max_bytes_invalid', 'inspectorErrorHttpJsonMaxBytesInvalid'],
  ['http_json_storage_uri_invalid', 'inspectorErrorHttpJsonStorageUriInvalid'],
  [
    'http_json_artifact_credential_ref_invalid',
    'inspectorErrorHttpJsonArtifactCredentialRefInvalid',
  ],
  ['http_json_connect_timeout_invalid', 'inspectorErrorHttpJsonConnectTimeoutInvalid'],
  ['http_json_request_timeout_invalid', 'inspectorErrorHttpJsonRequestTimeoutInvalid'],
  ['http_json_redirect_limit_invalid', 'inspectorErrorHttpJsonRedirectLimitInvalid'],
] as const satisfies readonly (readonly [
  CanvasInspectorNodeDraftErrorCode,
  keyof CanvasViewCopy,
])[];

describe('canvas copy catalog', () => {
  it('exposes draft access posture copy in English and Spanish', () => {
    expect(canvasViewCopy.sessionRequiredDraftLabel).toBe('Session required');
    expect(canvasViewCopy.readOnlyDraftLabel).toBe('Read-only draft');
    expect(canvasViewCopy.refreshSessionActionLabel).toBe('Refresh session');
    expect(resolveCanvasViewCopy('es').sessionRequiredDraftLabel).toBe('Sesion requerida');
  });

  it('resolves Canvas workbench and autosave chrome from one locale catalog', () => {
    const spanishCopy = resolveCanvasViewCopy('es-ES');

    expect(canvasViewCopy.routeNeedsCanvasTitle).toBe('Create canvas in this workspace');
    expect(canvasViewCopy.routeNeedsCanvasTemplateLabel).toBe('Choose a canvas template');
    expect(spanishCopy.routeNeedsCanvasTitle).toBe('Crear canvas en este workspace');
    expect(spanishCopy.routeNeedsCanvasTemplateLabel).toBe('Elige una plantilla de canvas');
    expect(spanishCopy.toolbarLayoutLabel).toBe('Disposición');
    expect(spanishCopy.workspaceProjectActionsMenuLabel).toBe('Acciones del proyecto');
    expect(spanishCopy.toolbarProjectSnapshotMenuLabel).toBe('Instantáneas del proyecto');
    expect(canvasViewCopy.canvasNodePortTargetLabel).toBe('Connect incoming port');
    expect(canvasViewCopy.canvasNodePortSourceLabel).toBe('Connect outgoing port');
    expect(canvasViewCopy.canvasNodePortCompatibleWithPrefix).toBe('Compatible with');
    expect(canvasViewCopy.canvasNodePortBlockedMessage).toBe(
      'Compatible nodes are blocked by the current graph policy'
    );
    expect(spanishCopy.canvasNodePortTargetLabel).toBe('Conectar puerto de entrada');
    expect(spanishCopy.canvasNodePortSourceLabel).toBe('Conectar puerto de salida');
    expect(spanishCopy.canvasNodePortCompatibleWithPrefix).toBe('Compatible con');
    expect(spanishCopy.canvasNodePortNoCompatibleNodesMessage).toBe(
      'No hay nodos compatibles disponibles'
    );
    expect(spanishCopy.canvasNodePortBlockedMessage).toBe(
      'Los nodos compatibles están bloqueados por la política actual del grafo'
    );
    expect(spanishCopy.canvasAddNodeCatalogSeedDescription).toBe(
      'Agrega un dataset seed estático gestionado por el proyecto.'
    );
    expect(spanishCopy.draftSyncedLabel).toBe('Borrador sincronizado');
    expect(spanishCopy.draftSavedLabel).toBe('Borrador guardado');
    expect(spanishCopy.draftSaveFailedLabel).toBe('Guardado del borrador fallido');
    expect(spanishCopy.newCanvasLabel).toBe('Nuevo canvas');
    expect(canvasViewCopy.selectionRecoveryRequestedRootsLabel).toBe('Requested roots');
    expect(spanishCopy.selectionRecoveryRequestedRootsLabel).toBe('Raíces solicitadas');
    expect(spanishCopy.selectionRecoveryUseWorkspaceScopeAction).toBe('Usar alcance del workspace');
  });

  it('resolves Canvas Inspector authoring copy in English and Spanish', () => {
    const spanishCopy = resolveCanvasViewCopy('es-ES');

    expect(canvasViewCopy.inspectorDbtPackageLabel).toBe('Package');
    expect(canvasViewCopy.inspectorErrorDbtPackageRequired).toBe('Package is required.');
    expect(canvasViewCopy.inspectorDvtConnectionLabel).toBe('Connection');
    expect(canvasViewCopy.inspectorDvtInheritedConnectionLabel).toBe('Inherited connection');
    expect(spanishCopy.inspectorDbtPackageLabel).toBe('Paquete');
    expect(spanishCopy.inspectorErrorDbtPackageRequired).toBe('El paquete es obligatorio.');
    expect(spanishCopy.inspectorDvtConnectionLabel).toBe('Conexión');
    expect(spanishCopy.inspectorDvtInheritedConnectionLabel).toBe('Conexión heredada');
    expect(spanishCopy.inspectorDvtWriteModeLabel).toBe('Modo de escritura');
    expect(canvasViewCopy.inspectorErrorObjectFileSizeInvalid).toBe(
      'Object size must be positive, no greater than 50000000 bytes, and no greater than maximum size.'
    );
    expect(canvasViewCopy.inspectorErrorObjectFileMaxBytesInvalid).toBe(
      'Maximum size must be positive, no greater than 50000000 bytes, and at least object size.'
    );
    expect(spanishCopy.inspectorErrorObjectFileSizeInvalid).toBe(
      'El tamaño del objeto debe ser positivo, no superar 50000000 bytes y no superar el tamaño máximo.'
    );
    expect(spanishCopy.inspectorErrorObjectFileMaxBytesInvalid).toBe(
      'El tamaño máximo debe ser positivo, no superar 50000000 bytes y ser al menos el tamaño del objeto.'
    );
    expect(canvasViewCopy.inspectorErrorHttpJsonSizeInvalid).toBe(
      'Expected size must be a positive integer, no greater than 50000000 bytes, and no greater than maximum size.'
    );
    expect(spanishCopy.inspectorErrorHttpJsonSizeInvalid).toBe(
      'El tamaño esperado debe ser un número entero positivo, no superar 50000000 bytes y no superar el tamaño máximo.'
    );

    expect(
      [
        canvasViewCopy.inspectorDvtConnectionLabel,
        canvasViewCopy.inspectorDvtInheritedConnectionLabel,
        spanishCopy.inspectorDvtConnectionLabel,
        spanishCopy.inspectorDvtInheritedConnectionLabel,
      ].join(' ')
    ).not.toMatch(/PostgreSQL/iu);
  });

  it('formats Canvas Inspector authoring validation errors from locale copy', () => {
    const englishCopy = resolveCanvasViewCopy('en-US');
    const spanishCopy = resolveCanvasViewCopy('es-ES');
    const coveredErrorCodes = new Set<CanvasInspectorNodeDraftErrorCode>();

    for (const [errorCode, copyKey] of INSPECTOR_DRAFT_ERROR_COPY_KEYS) {
      coveredErrorCodes.add(errorCode);
      expect(formatCanvasInspectorNodeDraftError(errorCode, englishCopy)).toBe(
        englishCopy[copyKey]
      );
      expect(formatCanvasInspectorNodeDraftError(errorCode, spanishCopy)).toBe(
        spanishCopy[copyKey]
      );
    }

    expect(coveredErrorCodes.size).toBe(INSPECTOR_DRAFT_ERROR_COPY_KEYS.length);
  });

  it('formats transformation graph validation summaries from locale copy', () => {
    expect(formatTransformationGraphValidationSummary('requires_executable_path', 'en-US')).toBe(
      'Execution Preview requires a connected source -> sql_transform -> sink path.'
    );
    expect(formatTransformationGraphValidationSummary('ambiguous_executable_paths', 'en-US')).toBe(
      'Execution Preview requires one selected source -> sql_transform -> sink path.'
    );
    expect(formatTransformationGraphValidationSummary('requires_executable_path', 'es-ES')).toBe(
      'El Execution Preview requiere una ruta conectada source -> sql_transform -> sink.'
    );
    expect(formatTransformationGraphValidationSummary('ambiguous_executable_paths', 'es-ES')).toBe(
      'El Execution Preview requiere seleccionar una única ruta source -> sql_transform -> sink.'
    );
  });

  it('formats a missing plugin connection policy from locale copy', () => {
    const rejection = { code: 'plugin_policy_missing', pluginId: 'dbt' } as const;

    expect(formatCanvasConnectionRejection(rejection, 'en-US')).toBe(
      'Connection policy is unavailable for plugin dbt.'
    );
    expect(formatCanvasConnectionRejection(rejection, 'es-ES')).toBe(
      'La política de conexiones no está disponible para el plugin dbt.'
    );
  });
});
