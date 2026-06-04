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
    fallback: 'Plan requires exactly 2 edges: source -> sql_transform and sql_transform -> sink.',
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
    fallback: 'Current scope disables ',
  },
  limitedAccessSingularMessageSuffix: {
    key: 'canvas.readOnly.limitedAccessSingularMessageSuffix',
    fallback: '.',
  },
  limitedAccessPluralMessageSuffix: {
    key: 'canvas.readOnly.limitedAccessPluralMessageSuffix',
    fallback: '.',
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
    fallback: 'graph editing',
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
  inspectorEditablePropertiesTitle: {
    key: 'canvas.inspector.authoring.editablePropertiesTitle',
    fallback: 'Editable properties',
  },
  inspectorEditablePropertiesDescription: {
    key: 'canvas.inspector.authoring.editablePropertiesDescription',
    fallback: 'Name, tags, and description saved with this canvas.',
  },
  inspectorNodeNameLabel: {
    key: 'canvas.inspector.authoring.nodeNameLabel',
    fallback: 'Name',
  },
  inspectorNodeTagsLabel: {
    key: 'canvas.inspector.authoring.nodeTagsLabel',
    fallback: 'Tags',
  },
  inspectorNodeTagsPlaceholder: {
    key: 'canvas.inspector.authoring.nodeTagsPlaceholder',
    fallback: 'finance, critical',
  },
  inspectorNodeDescriptionLabel: {
    key: 'canvas.inspector.authoring.nodeDescriptionLabel',
    fallback: 'Description',
  },
  inspectorNodeReadOnlyMessage: {
    key: 'canvas.inspector.authoring.nodeReadOnlyMessage',
    fallback: 'Node details are read-only for this workspace state.',
  },
  inspectorCancelLabel: {
    key: 'canvas.inspector.authoring.cancelLabel',
    fallback: 'Cancel',
  },
  inspectorApplyLabel: {
    key: 'canvas.inspector.authoring.applyLabel',
    fallback: 'Apply',
  },
  inspectorDbtCardTitle: {
    key: 'canvas.inspector.authoring.dbtCardTitle',
    fallback: 'dbt card',
  },
  inspectorDbtPackageLabel: {
    key: 'canvas.inspector.authoring.dbtPackageLabel',
    fallback: 'Package',
  },
  inspectorDbtSourceLabel: {
    key: 'canvas.inspector.authoring.dbtSourceLabel',
    fallback: 'Source',
  },
  inspectorDbtSchemaLabel: {
    key: 'canvas.inspector.authoring.dbtSchemaLabel',
    fallback: 'Schema',
  },
  inspectorDbtTableLabel: {
    key: 'canvas.inspector.authoring.dbtTableLabel',
    fallback: 'Table',
  },
  inspectorDbtMaterializedLabel: {
    key: 'canvas.inspector.authoring.dbtMaterializedLabel',
    fallback: 'Materialized',
  },
  inspectorDbtOriginLabel: {
    key: 'canvas.inspector.authoring.dbtOriginLabel',
    fallback: 'Origin',
  },
  inspectorDbtGeneratedSqlLabel: {
    key: 'canvas.inspector.authoring.dbtGeneratedSqlLabel',
    fallback: 'Generated SQL',
  },
  inspectorDbtNoConnectedOriginsMessage: {
    key: 'canvas.inspector.authoring.dbtNoConnectedOriginsMessage',
    fallback: 'No connected dbt origins.',
  },
  inspectorDbtGeneratedSqlUnavailableMessage: {
    key: 'canvas.inspector.authoring.dbtGeneratedSqlUnavailableMessage',
    fallback:
      'Connect this model to a dbt source or model to preview the SQL generated by the dbt plugin.',
  },
  inspectorDbtOriginKindSourceLabel: {
    key: 'canvas.inspector.authoring.dbtOriginKindSourceLabel',
    fallback: 'source',
  },
  inspectorDbtOriginKindModelLabel: {
    key: 'canvas.inspector.authoring.dbtOriginKindModelLabel',
    fallback: 'model',
  },
  inspectorDbtMaterializedViewLabel: {
    key: 'canvas.inspector.authoring.dbtMaterializedViewLabel',
    fallback: 'view',
  },
  inspectorDbtMaterializedTableLabel: {
    key: 'canvas.inspector.authoring.dbtMaterializedTableLabel',
    fallback: 'table',
  },
  inspectorDbtMaterializedIncrementalLabel: {
    key: 'canvas.inspector.authoring.dbtMaterializedIncrementalLabel',
    fallback: 'incremental',
  },
  inspectorDbtMaterializedEphemeralLabel: {
    key: 'canvas.inspector.authoring.dbtMaterializedEphemeralLabel',
    fallback: 'ephemeral',
  },
  inspectorDvtSourceTitle: {
    key: 'canvas.inspector.authoring.dvtSourceTitle',
    fallback: 'DVT source',
  },
  inspectorDvtSqlTransformTitle: {
    key: 'canvas.inspector.authoring.dvtSqlTransformTitle',
    fallback: 'DVT SQL transform',
  },
  inspectorDvtSinkTitle: {
    key: 'canvas.inspector.authoring.dvtSinkTitle',
    fallback: 'DVT sink',
  },
  inspectorDvtSchemaLabel: {
    key: 'canvas.inspector.authoring.dvtSchemaLabel',
    fallback: 'Schema',
  },
  inspectorDvtTableLabel: {
    key: 'canvas.inspector.authoring.dvtTableLabel',
    fallback: 'Table',
  },
  inspectorDvtAliasLabel: {
    key: 'canvas.inspector.authoring.dvtAliasLabel',
    fallback: 'Alias',
  },
  inspectorDvtSqlLabel: {
    key: 'canvas.inspector.authoring.dvtSqlLabel',
    fallback: 'SQL',
  },
  inspectorDvtMaterializationLabel: {
    key: 'canvas.inspector.authoring.dvtMaterializationLabel',
    fallback: 'Materialization',
  },
  inspectorDvtWriteModeLabel: {
    key: 'canvas.inspector.authoring.dvtWriteModeLabel',
    fallback: 'Write mode',
  },
  inspectorDvtMaterializationTableLabel: {
    key: 'canvas.inspector.authoring.dvtMaterializationTableLabel',
    fallback: 'table',
  },
  inspectorDvtMaterializationViewLabel: {
    key: 'canvas.inspector.authoring.dvtMaterializationViewLabel',
    fallback: 'view',
  },
  inspectorDvtWriteModeReplaceLabel: {
    key: 'canvas.inspector.authoring.dvtWriteModeReplaceLabel',
    fallback: 'replace',
  },
  inspectorDvtWriteModeAppendLabel: {
    key: 'canvas.inspector.authoring.dvtWriteModeAppendLabel',
    fallback: 'append',
  },
  inspectorErrorNodeNameRequired: {
    key: 'canvas.inspector.authoring.errorNodeNameRequired',
    fallback: 'Node name is required.',
  },
  inspectorErrorDbtPackageRequired: {
    key: 'canvas.inspector.authoring.errorDbtPackageRequired',
    fallback: 'Package is required.',
  },
  inspectorErrorDbtSourceRequired: {
    key: 'canvas.inspector.authoring.errorDbtSourceRequired',
    fallback: 'Source is required.',
  },
  inspectorErrorDbtSchemaRequired: {
    key: 'canvas.inspector.authoring.errorDbtSchemaRequired',
    fallback: 'Schema is required.',
  },
  inspectorErrorDbtTableRequired: {
    key: 'canvas.inspector.authoring.errorDbtTableRequired',
    fallback: 'Table is required.',
  },
  inspectorErrorDbtMaterializationInvalid: {
    key: 'canvas.inspector.authoring.errorDbtMaterializationInvalid',
    fallback: 'Materialization must be view, table, incremental, or ephemeral.',
  },
  inspectorErrorDvtSchemaRequired: {
    key: 'canvas.inspector.authoring.errorDvtSchemaRequired',
    fallback: 'Schema is required.',
  },
  inspectorErrorDvtTableRequired: {
    key: 'canvas.inspector.authoring.errorDvtTableRequired',
    fallback: 'Table is required.',
  },
  inspectorErrorDvtAliasRequired: {
    key: 'canvas.inspector.authoring.errorDvtAliasRequired',
    fallback: 'Alias is required.',
  },
  inspectorErrorDvtMaterializationInvalid: {
    key: 'canvas.inspector.authoring.errorDvtMaterializationInvalid',
    fallback: 'Materialization must be table or view.',
  },
  inspectorErrorDvtWriteModeInvalid: {
    key: 'canvas.inspector.authoring.errorDvtWriteModeInvalid',
    fallback: 'Write mode must be replace or append.',
  },
} satisfies CanvasCopySection;
