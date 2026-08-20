import type { CanvasConnectionRejection } from './canvasConnectionAggregate';
import type { CanvasInspectorNodeDraftErrorCode } from './canvasInspectorAuthoringErrorCodes';
import type { TransformationGraphValidationSummaryCode } from './transformationGraphValidation';
import type { CanvasDisabledCapability, CanvasViewCopy } from './canvasCopy.types';
import { resolveCanvasViewCopy } from './canvasCopyCatalog';

export function formatCanvasCopyTemplate(
  template: string,
  values: Readonly<Record<string, string>>
): string {
  return Object.entries(values).reduce(
    (resolved, [key, value]) => resolved.replaceAll(`{${key}}`, value),
    template
  );
}

function resolveCanvasDisabledCapabilityLabel(
  capability: CanvasDisabledCapability,
  copy: CanvasViewCopy
): string {
  switch (capability) {
    case 'plan_preview':
      return copy.capabilityPlanPreview;
    case 'run_start':
      return copy.capabilityRunStart;
    case 'graph_edits':
      return copy.capabilityGraphEdits;
  }
}

function formatCanvasCapabilityList(
  capabilities: readonly CanvasDisabledCapability[],
  copy: CanvasViewCopy
): string {
  const labels = capabilities.map((capability) =>
    resolveCanvasDisabledCapabilityLabel(capability, copy)
  );

  if (labels.length === 0) {
    return '';
  }

  if (labels.length === 1) {
    return labels[0] ?? '';
  }

  if (labels.length === 2) {
    return `${labels[0]} ${copy.conjunctionAnd} ${labels[1]}`;
  }

  return `${labels.slice(0, -1).join(', ')}, ${copy.serialConjunctionAnd} ${labels.at(-1)}`;
}

export function formatCanvasLimitedAccessMessage(
  capabilities: readonly CanvasDisabledCapability[],
  locale?: string
): string {
  const copy = resolveCanvasViewCopy(locale);
  const capabilityList = formatCanvasCapabilityList(capabilities, copy);
  const suffix =
    capabilities.length === 1
      ? copy.limitedAccessSingularMessageSuffix
      : copy.limitedAccessPluralMessageSuffix;

  return `${copy.limitedAccessMessagePrefix}${capabilityList}${suffix}`;
}

export function formatCanvasNodeAddedMessage(nodeName: string, locale?: string): string {
  const copy = resolveCanvasViewCopy(locale);
  return `${copy.nodeAddedPrefix} ${nodeName} ${copy.nodeAddedSuffix}`.trim();
}

export function formatCanvasNodeRemovedMessage(nodeName: string, locale?: string): string {
  const copy = resolveCanvasViewCopy(locale);
  return `${copy.nodeRemovedPrefix} ${nodeName} ${copy.nodeRemovedSuffix}`.trim();
}

export function formatCanvasInspectorNodeDraftError(
  errorCode: CanvasInspectorNodeDraftErrorCode,
  copy: CanvasViewCopy
): string {
  switch (errorCode) {
    case 'node_name_required':
      return copy.inspectorErrorNodeNameRequired;
    case 'dbt_package_required':
      return copy.inspectorErrorDbtPackageRequired;
    case 'dbt_source_required':
      return copy.inspectorErrorDbtSourceRequired;
    case 'dbt_schema_required':
      return copy.inspectorErrorDbtSchemaRequired;
    case 'dbt_table_required':
      return copy.inspectorErrorDbtTableRequired;
    case 'dbt_materialization_invalid':
      return copy.inspectorErrorDbtMaterializationInvalid;
    case 'dbt_test_type_invalid':
      return copy.inspectorErrorDbtTestTypeInvalid;
    case 'dbt_test_target_required':
      return copy.inspectorErrorDbtTestTargetRequired;
    case 'dbt_test_column_invalid':
      return copy.inspectorErrorDbtTestColumnInvalid;
    case 'dbt_test_column_not_declared':
      return copy.inspectorErrorDbtTestColumnNotDeclared;
    case 'dbt_test_severity_invalid':
      return copy.inspectorErrorDbtTestSeverityInvalid;
    case 'dvt_schema_required':
      return copy.inspectorErrorDvtSchemaRequired;
    case 'dvt_table_required':
      return copy.inspectorErrorDvtTableRequired;
    case 'dvt_alias_required':
      return copy.inspectorErrorDvtAliasRequired;
    case 'dvt_connection_required':
      return copy.inspectorErrorDvtConnectionRequired;
    case 'dvt_visual_recipe_invalid':
      return copy.inspectorErrorDvtVisualRecipeInvalid;
    case 'dvt_materialization_invalid':
      return copy.inspectorErrorDvtMaterializationInvalid;
    case 'dvt_write_mode_invalid':
      return copy.inspectorErrorDvtWriteModeInvalid;
    case 'object_file_storage_uri_invalid':
      return copy.inspectorErrorObjectFileStorageUriInvalid;
    case 'object_file_sha256_invalid':
      return copy.inspectorErrorObjectFileSha256Invalid;
    case 'object_file_size_invalid':
      return copy.inspectorErrorObjectFileSizeInvalid;
    case 'object_file_max_bytes_invalid':
      return copy.inspectorErrorObjectFileMaxBytesInvalid;
    case 'object_file_source_credential_ref_invalid':
      return copy.inspectorErrorObjectFileSourceCredentialInvalid;
    case 'object_file_target_relation_invalid':
      return copy.inspectorErrorObjectFileTargetRelationInvalid;
    case 'object_file_target_credential_ref_invalid':
      return copy.inspectorErrorObjectFileTargetCredentialInvalid;
    case 'object_file_column_mapping_invalid':
      return copy.inspectorErrorObjectFileColumnMappingInvalid;
    case 'http_json_endpoint_ref_invalid':
      return copy.inspectorErrorHttpJsonEndpointRefInvalid;
    case 'http_json_auth_credential_ref_invalid':
      return copy.inspectorErrorHttpJsonAuthCredentialRefInvalid;
    case 'http_json_sha256_invalid':
      return copy.inspectorErrorHttpJsonSha256Invalid;
    case 'http_json_size_invalid':
      return copy.inspectorErrorHttpJsonSizeInvalid;
    case 'http_json_max_bytes_invalid':
      return copy.inspectorErrorHttpJsonMaxBytesInvalid;
    case 'http_json_storage_uri_invalid':
      return copy.inspectorErrorHttpJsonStorageUriInvalid;
    case 'http_json_artifact_credential_ref_invalid':
      return copy.inspectorErrorHttpJsonArtifactCredentialRefInvalid;
    case 'http_json_connect_timeout_invalid':
      return copy.inspectorErrorHttpJsonConnectTimeoutInvalid;
    case 'http_json_request_timeout_invalid':
      return copy.inspectorErrorHttpJsonRequestTimeoutInvalid;
    case 'http_json_redirect_limit_invalid':
      return copy.inspectorErrorHttpJsonRedirectLimitInvalid;
  }
}

export function formatUnsupportedCanvasKindMessage(canvasKind: string, locale?: string): string {
  const copy = resolveCanvasViewCopy(locale);
  return `${copy.unsupportedCanvasKindMessagePrefix}"${canvasKind}"${copy.unsupportedCanvasKindMessageSuffix}`;
}

export function formatDisabledCanvasPluginMessage(canvasKind: string, locale?: string): string {
  const copy = resolveCanvasViewCopy(locale);
  return `${copy.disabledCanvasPluginMessagePrefix}"${canvasKind}"${copy.disabledCanvasPluginMessageSuffix}`;
}

export function formatTransformationGraphValidationSummary(
  summaryCode: TransformationGraphValidationSummaryCode,
  locale?: string
): string {
  const copy = resolveCanvasViewCopy(locale);

  switch (summaryCode) {
    case 'valid':
      return copy.transformationDraftValidMessage;
    case 'ambiguous_executable_paths':
      return copy.transformationAmbiguousExecutablePathMessage;
    case 'requires_executable_path':
      return copy.transformationRequiresExecutablePathMessage;
    case 'requires_postgres_connection':
      return copy.transformationRequiresPostgresConnectionMessage;
    case 'requires_three_nodes':
      return copy.transformationRequiresThreeNodesMessage;
    case 'unsupported_roles':
      return copy.transformationUnsupportedRolesMessage;
    case 'requires_one_of_each_role':
      return copy.transformationRequiresOneOfEachRoleMessage;
    case 'requires_two_edges':
      return copy.transformationConnectionEdgeCountMessage;
    case 'invalid_edge_order':
      return copy.transformationConnectionOrderMessage;
  }
}

export function formatCanvasConnectionRejection(
  rejection: CanvasConnectionRejection,
  locale?: string
): string {
  const copy = resolveCanvasViewCopy(locale);

  switch (rejection.code) {
    case 'connection_incomplete':
      return copy.connectionIncompleteMessage;
    case 'node_not_found_in_graph':
      return copy.nodeNotFoundInGraphMessage;
    case 'plugin_policy_missing':
      return formatCanvasCopyTemplate(copy.connectionPluginPolicyUnavailableTemplate, {
        plugin: rejection.pluginId,
      });
    case 'self_connection':
      return copy.connectionSelfNotAllowedMessage;
    case 'duplicate_edge':
      return copy.connectionAlreadyExistsMessage;
    case 'cycle_detected':
      return copy.connectionCycleDetectedMessage;
    case 'plugin_rule_blocked':
      return rejection.reason ?? copy.connectionPluginRuleBlockedFallbackMessage;
    case 'cross_plugin_bridge_missing':
      return `${copy.connectionCrossPluginBridgeMissingPrefix} ${rejection.sourcePluginId} (${rejection.sourceRole}) ${copy.conjunctionAnd} ${rejection.targetPluginId} (${rejection.targetRole}).`;
  }
}
