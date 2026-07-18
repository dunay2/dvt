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
    fallback: 'Execution Preview edges must follow source -> sql_transform -> sink.',
  },
  transformationConnectionEdgeCountMessage: {
    key: 'canvas.transformation.connectionEdgeCountMessage',
    fallback:
      'Execution Preview requires exactly 2 edges: source -> sql_transform and sql_transform -> sink.',
  },
  transformationConnectionDuplicateMessage: {
    key: 'canvas.transformation.connectionDuplicateMessage',
    fallback: 'Dependency already exists in this transformation draft.',
  },
  transformationRequiresThreeNodesMessage: {
    key: 'canvas.transformation.requiresThreeNodesMessage',
    fallback: 'Execution Preview requires source, sql_transform, and sink nodes.',
  },
  transformationAmbiguousExecutablePathMessage: {
    key: 'canvas.transformation.ambiguousExecutablePathMessage',
    fallback: 'Execution Preview requires one selected source -> sql_transform -> sink path.',
  },
  transformationRequiresExecutablePathMessage: {
    key: 'canvas.transformation.requiresExecutablePathMessage',
    fallback: 'Execution Preview requires a connected source -> sql_transform -> sink path.',
  },
  transformationUnsupportedRolesMessage: {
    key: 'canvas.transformation.unsupportedRolesMessage',
    fallback:
      'Execution Preview supports only input, transform, and output nodes in this vertical.',
  },
  transformationRequiresOneOfEachRoleMessage: {
    key: 'canvas.transformation.requiresOneOfEachRoleMessage',
    fallback: 'Execution Preview requires one source, one sql_transform, and one sink.',
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
  nodePresentationColumnsLabel: {
    key: 'canvas.nodePresentation.columnsLabel',
    fallback: 'Columns',
  },
  nodePresentationDeclaredColumnsDetailTemplate: {
    key: 'canvas.nodePresentation.declaredColumnsDetailTemplate',
    fallback: '{count} columns declared by this node.',
  },
  nodePresentationInheritedColumnsDetailTemplate: {
    key: 'canvas.nodePresentation.inheritedColumnsDetailTemplate',
    fallback: '{count} columns inherited from connected inputs; none declared by this node.',
  },
  nodePresentationNoColumnsDetail: {
    key: 'canvas.nodePresentation.noColumnsDetail',
    fallback: 'No declared or inherited columns are available for this node.',
  },
  nodePresentationCodeLabel: {
    key: 'canvas.nodePresentation.codeLabel',
    fallback: 'Code',
  },
  nodePresentationWorkspaceCodeDetailTemplate: {
    key: 'canvas.nodePresentation.workspaceCodeDetailTemplate',
    fallback: 'Code is stored in workspace file {path}. Open Code to inspect or edit it.',
  },
  nodePresentationCodeUnavailableMessage: {
    key: 'canvas.nodePresentation.codeUnavailableMessage',
    fallback: 'No inline code or workspace file is recorded for this node.',
  },
  nodeWorkbenchCloseLabel: {
    key: 'canvas.nodeWorkbench.closeLabel',
    fallback: 'Close',
  },
  nodeWorkbenchMoveLabel: {
    key: 'canvas.nodeWorkbench.moveLabel',
    fallback: 'Move node workbench',
  },
  nodeWorkbenchMoreLabel: {
    key: 'canvas.nodeWorkbench.moreLabel',
    fallback: 'More',
  },
  sqlContextWorkbenchNodeTitle: {
    key: 'canvas.sqlContextWorkbench.nodeTitle',
    fallback: 'Node code',
  },
  sqlContextWorkbenchProjectTitle: {
    key: 'canvas.sqlContextWorkbench.projectTitle',
    fallback: 'Project code',
  },
  sqlContextWorkbenchProjectDescription: {
    key: 'canvas.sqlContextWorkbench.projectDescription',
    fallback: 'Workspace files in the active project scope.',
  },
  sqlContextWorkbenchLoadingMessage: {
    key: 'canvas.sqlContextWorkbench.loadingMessage',
    fallback: 'Loading code...',
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
  inspectorDvtDatabaseLabel: {
    key: 'canvas.inspector.authoring.dvtDatabaseLabel',
    fallback: 'Database',
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
  inspectorDvtSourceTargetLabel: {
    key: 'canvas.inspector.authoring.dvtSourceTargetLabel',
    fallback: 'Source target',
  },
  inspectorDvtSqlBodyLabel: {
    key: 'canvas.inspector.authoring.dvtSqlBodyLabel',
    fallback: 'SQL body',
  },
  inspectorDvtSqlLineSingularLabel: {
    key: 'canvas.inspector.authoring.dvtSqlLineSingularLabel',
    fallback: 'line',
  },
  inspectorDvtSqlLinePluralLabel: {
    key: 'canvas.inspector.authoring.dvtSqlLinePluralLabel',
    fallback: 'lines',
  },
  inspectorDvtDestinationTargetLabel: {
    key: 'canvas.inspector.authoring.dvtDestinationTargetLabel',
    fallback: 'Destination target',
  },
  inspectorDvtPartitionStrategyLabel: {
    key: 'canvas.inspector.authoring.dvtPartitionStrategyLabel',
    fallback: 'Partition strategy',
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
  dvtFlowGuideTitle: {
    key: 'canvas.dvtFlowGuide.title',
    fallback: 'Professional DVT flow',
  },
  dvtFlowGuideReadyLabel: {
    key: 'canvas.dvtFlowGuide.readyLabel',
    fallback: 'Ready to preview',
  },
  dvtFlowGuideNeedsWorkLabel: {
    key: 'canvas.dvtFlowGuide.needsWorkLabel',
    fallback: 'Needs work',
  },
  dvtFlowGuideRowsUnknownLabel: {
    key: 'canvas.dvtFlowGuide.rowsUnknownLabel',
    fallback: 'Rows unknown',
  },
  dvtFlowGuideRowLabel: {
    key: 'canvas.dvtFlowGuide.rowLabel',
    fallback: 'row',
  },
  dvtFlowGuideRowsLabel: {
    key: 'canvas.dvtFlowGuide.rowsLabel',
    fallback: 'rows',
  },
  dvtFlowGuideColumnLabel: {
    key: 'canvas.dvtFlowGuide.columnLabel',
    fallback: 'column',
  },
  dvtFlowGuideColumnsLabel: {
    key: 'canvas.dvtFlowGuide.columnsLabel',
    fallback: 'columns',
  },
  dvtFlowGuideNullableLabel: {
    key: 'canvas.dvtFlowGuide.nullableLabel',
    fallback: 'nullable',
  },
  dvtFlowGuideRequiredLabel: {
    key: 'canvas.dvtFlowGuide.requiredLabel',
    fallback: 'required',
  },
  dvtFlowGuideSourceMissingMessage: {
    key: 'canvas.dvtFlowGuide.sourceMissingMessage',
    fallback: 'Source missing',
  },
  dvtFlowGuideTransformMissingMessage: {
    key: 'canvas.dvtFlowGuide.transformMissingMessage',
    fallback: 'Transform missing',
  },
  dvtFlowGuideSqlMissingMessage: {
    key: 'canvas.dvtFlowGuide.sqlMissingMessage',
    fallback: 'SQL missing',
  },
  dvtFlowGuideDestinationMissingMessage: {
    key: 'canvas.dvtFlowGuide.destinationMissingMessage',
    fallback: 'Destination missing',
  },
  dvtFlowGuideColumnsMissingMessage: {
    key: 'canvas.dvtFlowGuide.columnsMissingMessage',
    fallback: 'Column metadata unavailable',
  },
  dbtFlowGuideTitle: {
    key: 'canvas.dbtFlowGuide.title',
    fallback: 'Professional dbt flow',
  },
  dbtFlowGuideReadyLabel: {
    key: 'canvas.dbtFlowGuide.readyLabel',
    fallback: 'Ready to preview',
  },
  dbtFlowGuideNeedsWorkLabel: {
    key: 'canvas.dbtFlowGuide.needsWorkLabel',
    fallback: 'Needs work',
  },
  dbtFlowGuideSummary: {
    key: 'canvas.dbtFlowGuide.summary',
    fallback: 'Review source metadata, model SQL, and dbt validation before planning.',
  },
  dbtFlowGuideSourceTitle: {
    key: 'canvas.dbtFlowGuide.sourceTitle',
    fallback: 'dbt source',
  },
  dbtFlowGuideModelTitle: {
    key: 'canvas.dbtFlowGuide.modelTitle',
    fallback: 'dbt model',
  },
  dbtFlowGuideTestTitle: {
    key: 'canvas.dbtFlowGuide.testTitle',
    fallback: 'dbt validation',
  },
  dbtFlowGuideRowsUnknownLabel: {
    key: 'canvas.dbtFlowGuide.rowsUnknownLabel',
    fallback: 'Rows unknown',
  },
  dbtFlowGuideRowLabel: {
    key: 'canvas.dbtFlowGuide.rowLabel',
    fallback: 'row',
  },
  dbtFlowGuideRowsLabel: {
    key: 'canvas.dbtFlowGuide.rowsLabel',
    fallback: 'rows',
  },
  dbtFlowGuideColumnLabel: {
    key: 'canvas.dbtFlowGuide.columnLabel',
    fallback: 'column',
  },
  dbtFlowGuideColumnsLabel: {
    key: 'canvas.dbtFlowGuide.columnsLabel',
    fallback: 'columns',
  },
  dbtFlowGuideNullableLabel: {
    key: 'canvas.dbtFlowGuide.nullableLabel',
    fallback: 'nullable',
  },
  dbtFlowGuideRequiredLabel: {
    key: 'canvas.dbtFlowGuide.requiredLabel',
    fallback: 'required',
  },
  dbtFlowGuideSourceMissingMessage: {
    key: 'canvas.dbtFlowGuide.sourceMissingMessage',
    fallback: 'Source missing',
  },
  dbtFlowGuideModelMissingMessage: {
    key: 'canvas.dbtFlowGuide.modelMissingMessage',
    fallback: 'Model missing',
  },
  dbtFlowGuideSqlMissingMessage: {
    key: 'canvas.dbtFlowGuide.sqlMissingMessage',
    fallback: 'SQL missing',
  },
  dbtFlowGuideTestMissingMessage: {
    key: 'canvas.dbtFlowGuide.testMissingMessage',
    fallback: 'Validation missing',
  },
  dbtFlowGuideTestSeverityUnknownLabel: {
    key: 'canvas.dbtFlowGuide.testSeverityUnknownLabel',
    fallback: 'severity unknown',
  },
  dbtFlowGuideColumnsMissingMessage: {
    key: 'canvas.dbtFlowGuide.columnsMissingMessage',
    fallback: 'Column metadata unavailable',
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
