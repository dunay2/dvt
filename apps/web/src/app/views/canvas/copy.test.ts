import { describe, expect, it } from 'vitest';

import { resolveCanvasViewCopy } from './canvasCopyCatalog';
import type { CanvasInspectorNodeDraftErrorCode } from './canvasInspectorAuthoringErrorCodes';
import type { CanvasViewCopy } from './canvasCopy.types';
import {
  canvasViewCopy,
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
    expect(canvasViewCopy.inspectorDbtModelSqlUnavailableMessage).toBe(
      'Connect this model to a DBT source or model before generating an executable artifact.'
    );
    expect(canvasViewCopy.inspectorErrorDbtPackageRequired).toBe('Package is required.');
    expect(spanishCopy.inspectorDbtPackageLabel).toBe('Paquete');
    expect(spanishCopy.inspectorDbtModelSqlUnavailableMessage).toBe(
      'Conecta este modelo a un source o modelo DBT antes de generar un artefacto ejecutable.'
    );
    expect(spanishCopy.inspectorErrorDbtPackageRequired).toBe('El paquete es obligatorio.');
    expect(spanishCopy.inspectorDvtWriteModeLabel).toBe('Modo de escritura');
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
});
