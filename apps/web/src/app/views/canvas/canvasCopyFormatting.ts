import type { CanvasConnectionRejection } from './canvasConnectionAggregate';
import type { TransformationGraphValidationSummaryCode } from './transformationGraphValidation';
import type { CanvasDisabledCapability, CanvasViewCopy } from './canvasCopy.types';
import { resolveCanvasViewCopy } from './canvasCopyCatalog';

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

export function formatUnsupportedCanvasKindMessage(
  canvasKind: string,
  locale?: string
): string {
  const copy = resolveCanvasViewCopy(locale);
  return `${copy.unsupportedCanvasKindMessagePrefix}"${canvasKind}"${copy.unsupportedCanvasKindMessageSuffix}`;
}

export function formatTransformationGraphValidationSummary(
  summaryCode: TransformationGraphValidationSummaryCode,
  locale?: string
): string {
  const copy = resolveCanvasViewCopy(locale);

  switch (summaryCode) {
    case 'valid':
      return copy.transformationDraftValidMessage;
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
    case 'transformation_invalid_edge_order':
      return copy.transformationConnectionOrderMessage;
    case 'transformation_edge_count_exceeded':
      return copy.transformationConnectionEdgeCountMessage;
    case 'transformation_duplicate_edge':
      return copy.transformationConnectionDuplicateMessage;
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
