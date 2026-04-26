import type { LocalizableString } from '../../plugins/contracts/PluginManifest';
import type { CanvasViewCopy } from './canvasCopy.types';

type CanvasCopySection = Partial<Record<keyof CanvasViewCopy, LocalizableString>>;

export const canvasViewAuthoringCopyByKey = {
  connectionIncompleteMessage: {
    key: 'canvas.connection.incompleteMessage',
    fallback: 'Connection is incomplete.',
  },
  nodeNotFoundInGraphMessage: {
    key: 'canvas.connection.nodeNotFoundMessage',
    fallback: 'Node not found in graph.',
  },
  nodeAlreadyOnCanvasMessage: {
    key: 'canvas.node.alreadyOnCanvasMessage',
    fallback: 'Node already on canvas',
  },
  nodeKindUnavailableForCanvasMessage: {
    key: 'canvas.node.kindUnavailableForCanvasMessage',
    fallback: 'This node kind is not available for the active canvas.',
  },
  transformationConnectionOrderMessage: {
    key: 'canvas.transformation.connectionOrderMessage',
    fallback: 'Plan edges must follow source -> sql_transform -> sink.',
  },
  transformationConnectionEdgeCountMessage: {
    key: 'canvas.transformation.connectionEdgeCountMessage',
    fallback:
      'Plan requires exactly 2 edges: source -> sql_transform and sql_transform -> sink.',
  },
  transformationConnectionDuplicateMessage: {
    key: 'canvas.transformation.connectionDuplicateMessage',
    fallback: 'Dependency already exists in this transformation draft.',
  },
  transformationRequiresThreeNodesMessage: {
    key: 'canvas.transformation.requiresThreeNodesMessage',
    fallback: 'Plan requires exactly 3 nodes: source, sql_transform, and sink.',
  },
  transformationUnsupportedRolesMessage: {
    key: 'canvas.transformation.unsupportedRolesMessage',
    fallback: 'Plan supports only input, transform, and output nodes in this vertical.',
  },
  transformationRequiresOneOfEachRoleMessage: {
    key: 'canvas.transformation.requiresOneOfEachRoleMessage',
    fallback: 'Plan requires exactly 1 source, 1 sql_transform, and 1 sink.',
  },
  transformationDraftValidMessage: {
    key: 'canvas.transformation.validMessage',
    fallback: 'Transformation draft is valid for preview.',
  },
  connectionSelfNotAllowedMessage: {
    key: 'canvas.connection.selfNotAllowedMessage',
    fallback: 'Self-connections are not allowed.',
  },
  connectionAlreadyExistsMessage: {
    key: 'canvas.connection.alreadyExistsMessage',
    fallback: 'Connection already exists.',
  },
  connectionCycleDetectedMessage: {
    key: 'canvas.connection.cycleDetectedMessage',
    fallback: 'Would create a cycle in the DAG.',
  },
  connectionPluginRuleBlockedFallbackMessage: {
    key: 'canvas.connection.pluginRuleBlockedFallbackMessage',
    fallback: 'Connection is not permitted by plugin rules.',
  },
  connectionCrossPluginBridgeMissingPrefix: {
    key: 'canvas.connection.crossPluginBridgeMissingPrefix',
    fallback: 'No compatible data port bridge between',
  },
  limitedAccessMessagePrefix: {
    key: 'canvas.readOnly.limitedAccessMessagePrefix',
    fallback: 'You can keep inspecting the graph, but ',
  },
  limitedAccessSingularMessageSuffix: {
    key: 'canvas.readOnly.limitedAccessSingularMessageSuffix',
    fallback: ' is unavailable in this context.',
  },
  limitedAccessPluralMessageSuffix: {
    key: 'canvas.readOnly.limitedAccessPluralMessageSuffix',
    fallback: ' are unavailable in this context.',
  },
  capabilityPlanPreview: {
    key: 'canvas.readOnly.capabilityPlanPreview',
    fallback: 'plan preview',
  },
  capabilityRunStart: {
    key: 'canvas.readOnly.capabilityRunStart',
    fallback: 'run start',
  },
  capabilityGraphEdits: {
    key: 'canvas.readOnly.capabilityGraphEdits',
    fallback: 'graph edits',
  },
  conjunctionAnd: {
    key: 'canvas.list.conjunctionAnd',
    fallback: 'and',
  },
  serialConjunctionAnd: {
    key: 'canvas.list.serialConjunctionAnd',
    fallback: 'and',
  },
  nodeAddedPrefix: {
    key: 'canvas.node.addedPrefix',
    fallback: 'Added',
  },
  nodeAddedSuffix: {
    key: 'canvas.node.addedSuffix',
    fallback: 'to canvas',
  },
  nodeRemovedPrefix: {
    key: 'canvas.node.removedPrefix',
    fallback: 'Removed',
  },
  nodeRemovedSuffix: {
    key: 'canvas.node.removedSuffix',
    fallback: '',
  },
} satisfies CanvasCopySection;
