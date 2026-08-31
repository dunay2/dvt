import type { LocalizableString } from '../../plugins/contracts/PluginManifest';
import type { CanvasViewCopy } from './canvasCopy.types';

type CanvasCopySection = Partial<Record<keyof CanvasViewCopy, LocalizableString>>;

export const canvasViewAuthoringCopyByKey = {
  columnMappingAddedMessage: {
    key: 'canvas.columnMapping.addedMessage',
    fallback: 'Column mapping added.',
  },
  columnMappingRemovedMessage: {
    key: 'canvas.columnMapping.removedMessage',
    fallback: 'Column mapping removed.',
  },
  columnMappingSourceSelectedTemplate: {
    key: 'canvas.columnMapping.sourceSelectedTemplate',
    fallback: 'Selected {column}. Choose a Model target column.',
  },
  columnMappingAutomapSummaryTemplate: {
    key: 'canvas.columnMapping.automapSummaryTemplate',
    fallback: 'Mapped {count} compatible columns.',
  },
  columnMappingRequiresDependencyMessage: {
    key: 'canvas.columnMapping.requiresDependencyMessage',
    fallback: 'Connect the Source to this Model before mapping columns.',
  },
  columnMappingSqlAuthorityMessage: {
    key: 'canvas.columnMapping.sqlAuthorityMessage',
    fallback:
      'This Model contains authored SQL. Convert it to visual editing before mapping columns.',
  },
  columnMappingComplexExpressionMessage: {
    key: 'canvas.columnMapping.complexExpressionMessage',
    fallback:
      'Edit this calculated column in Model properties instead of replacing its inputs here.',
  },
  columnMappingUnavailableMessage: {
    key: 'canvas.columnMapping.unavailableMessage',
    fallback: 'This column mapping is not available for the selected nodes.',
  },
  columnMappingNoCompatibleColumnsMessage: {
    key: 'canvas.columnMapping.noCompatibleColumnsMessage',
    fallback: 'No unique exact-name columns with known compatible types were found.',
  },
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
  nodeDropPayloadInvalidMessage: {
    key: 'canvas.node.dropPayloadInvalidMessage',
    fallback: 'The dropped node could not be read. The canvas was not changed.',
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
  transformationRequiresPostgresConnectionMessage: {
    key: 'canvas.transformation.requiresPostgresConnectionMessage',
    fallback: 'Select a governed PostgreSQL connection on the source before previewing.',
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
  connectionPluginPolicyUnavailableTemplate: {
    key: 'canvas.connection.pluginPolicyUnavailableTemplate',
    fallback: 'Connection policy is unavailable for plugin {plugin}.',
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
    fallback: 'Inherited: 0 · Declared: {count}',
  },
  nodePresentationInheritedColumnsDetailTemplate: {
    key: 'canvas.nodePresentation.inheritedColumnsDetailTemplate',
    fallback: 'Inherited: {count} · Declared: 0',
  },
  nodePresentationMixedColumnsDetailTemplate: {
    key: 'canvas.nodePresentation.mixedColumnsDetailTemplate',
    fallback: 'Inherited: {available} · Declared: {declared}',
  },
  nodePresentationNoColumnsDetail: {
    key: 'canvas.nodePresentation.noColumnsDetail',
    fallback: 'Inherited: 0 · Declared: 0',
  },
  nodePresentationCodeLabel: {
    key: 'canvas.nodePresentation.codeLabel',
    fallback: 'Code',
  },
  nodePresentationWorkspaceCodeDetailTemplate: {
    key: 'canvas.nodePresentation.workspaceCodeDetailTemplate',
    fallback: 'Code is stored in workspace file {path}. Open Code to inspect or edit it.',
  },
  nodePresentationGeneratedCodeDetailTemplate: {
    key: 'canvas.nodePresentation.generatedCodeDetailTemplate',
    fallback: 'Generated DBT artifact at {path}. Edit Code to make it authored.',
  },
  nodePresentationCodeUnavailableMessage: {
    key: 'canvas.nodePresentation.codeUnavailableMessage',
    fallback: 'No inline code or workspace file is recorded for this node.',
  },
  nodePresentationActionsLabel: {
    key: 'canvas.nodePresentation.actionsLabel',
    fallback: 'More node actions',
  },
  nodePresentationReadyStatusLabel: {
    key: 'canvas.nodePresentation.readyStatusLabel',
    fallback: 'Ready',
  },
  nodePresentationDraftStatusLabel: {
    key: 'canvas.nodePresentation.draftStatusLabel',
    fallback: 'Draft',
  },
  nodePresentationAuthoringTagLabel: {
    key: 'canvas.nodePresentation.authoringTagLabel',
    fallback: 'Authoring',
  },
  nodePresentationSourceKindLabel: {
    key: 'canvas.nodePresentation.sourceKindLabel',
    fallback: 'Source',
  },
  nodePresentationModelKindLabel: {
    key: 'canvas.nodePresentation.modelKindLabel',
    fallback: 'Model',
  },
  nodePresentationTestKindLabel: {
    key: 'canvas.nodePresentation.testKindLabel',
    fallback: 'Test',
  },
  canvasNodeAccessibleLabelTemplate: {
    key: 'canvas.a11y.nodeLabelTemplate',
    fallback: '{name}, {kind}',
  },
  canvasEdgeAccessibleLabelTemplate: {
    key: 'canvas.a11y.edgeLabelTemplate',
    fallback: 'Edge from {source} to {target}',
  },
  reactFlowNodeDescription: {
    key: 'canvas.a11y.nodeDescription',
    fallback: 'Press Enter or Space to select a node. Use arrow keys to move it.',
  },
  reactFlowNodeKeyboardDisabledDescription: {
    key: 'canvas.a11y.nodeKeyboardDisabledDescription',
    fallback: 'This node cannot be moved with the keyboard.',
  },
  reactFlowNodeMovedTemplate: {
    key: 'canvas.a11y.nodeMovedTemplate',
    fallback: 'Moved {direction}. Position: {x}, {y}.',
  },
  reactFlowEdgeDescription: {
    key: 'canvas.a11y.edgeDescription',
    fallback: 'Press Delete to remove this connection.',
  },
  reactFlowControlsLabel: {
    key: 'canvas.a11y.controlsLabel',
    fallback: 'Canvas controls',
  },
  reactFlowZoomInLabel: {
    key: 'canvas.a11y.zoomInLabel',
    fallback: 'Zoom in',
  },
  reactFlowZoomOutLabel: {
    key: 'canvas.a11y.zoomOutLabel',
    fallback: 'Zoom out',
  },
  reactFlowFitViewLabel: {
    key: 'canvas.a11y.fitViewLabel',
    fallback: 'Fit graph to view',
  },
  reactFlowInteractiveLabel: {
    key: 'canvas.a11y.interactiveLabel',
    fallback: 'Toggle graph interaction',
  },
  reactFlowMinimapLabel: {
    key: 'canvas.a11y.minimapLabel',
    fallback: 'Canvas minimap',
  },
  reactFlowHandleLabel: {
    key: 'canvas.a11y.handleLabel',
    fallback: 'Connection port',
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
  sqlContextWorkbenchProjectTitle: {
    key: 'canvas.sqlContextWorkbench.projectTitle',
    fallback: 'Project code',
  },
  sqlContextWorkbenchProjectDescription: {
    key: 'canvas.sqlContextWorkbench.projectDescription',
    fallback: 'Workspace files in the active project scope.',
  },
  sqlContextWorkbenchMoveLabel: {
    key: 'canvas.sqlContextWorkbench.moveLabel',
    fallback: 'Move code workbench',
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
  inspectorVisualTransformConvertToSqlLabel: {
    key: 'canvas.inspector.authoring.visualTransformConvertToSqlLabel',
    fallback: 'Convert to SQL',
  },
  inspectorVisualTransformConvertToSqlTitle: {
    key: 'canvas.inspector.authoring.visualTransformConvertToSqlTitle',
    fallback: 'Convert this visual transform to SQL?',
  },
  inspectorVisualTransformConvertToSqlDescription: {
    key: 'canvas.inspector.authoring.visualTransformConvertToSqlDescription',
    fallback:
      'This replaces the visual recipe as the editing authority. Returning from SQL to Visual is not automatic.',
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
  inspectorDbtOriginPlaceholder: {
    key: 'canvas.inspector.authoring.dbtOriginPlaceholder',
    fallback: 'Select a connected origin',
  },
  inspectorDbtModelSqlLabel: {
    key: 'canvas.inspector.authoring.dbtModelSqlLabel',
    fallback: 'Model SQL',
  },
  inspectorDbtModelSqlGeneratedDetailTemplate: {
    key: 'canvas.inspector.authoring.dbtModelSqlGeneratedDetailTemplate',
    fallback: 'Generated DBT artifact: {path}. Edit to take ownership.',
  },
  inspectorDbtModelSqlAuthoredDetailTemplate: {
    key: 'canvas.inspector.authoring.dbtModelSqlAuthoredDetailTemplate',
    fallback: 'Authored DBT SQL: {path}.',
  },
  inspectorDbtNoConnectedOriginsMessage: {
    key: 'canvas.inspector.authoring.dbtNoConnectedOriginsMessage',
    fallback: 'No connected dbt origins.',
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
  inspectorDbtTestTitle: {
    key: 'canvas.inspector.authoring.dbtTestTitle',
    fallback: 'DBT validation',
  },
  inspectorDbtTestTypeLabel: {
    key: 'canvas.inspector.authoring.dbtTestTypeLabel',
    fallback: 'Validation rule',
  },
  inspectorDbtTestTargetLabel: {
    key: 'canvas.inspector.authoring.dbtTestTargetLabel',
    fallback: 'Connected model',
  },
  inspectorDbtTestColumnLabel: {
    key: 'canvas.inspector.authoring.dbtTestColumnLabel',
    fallback: 'Target column',
  },
  inspectorDbtTestSeverityLabel: {
    key: 'canvas.inspector.authoring.dbtTestSeverityLabel',
    fallback: 'Severity',
  },
  inspectorDbtTestNotNullLabel: {
    key: 'canvas.inspector.authoring.dbtTestNotNullLabel',
    fallback: 'Required value (not null)',
  },
  inspectorDbtTestUniqueLabel: {
    key: 'canvas.inspector.authoring.dbtTestUniqueLabel',
    fallback: 'Unique value',
  },
  inspectorDbtTestSeverityErrorLabel: {
    key: 'canvas.inspector.authoring.dbtTestSeverityErrorLabel',
    fallback: 'Block execution',
  },
  inspectorDbtTestSeverityWarnLabel: {
    key: 'canvas.inspector.authoring.dbtTestSeverityWarnLabel',
    fallback: 'Report warning',
  },
  inspectorDbtTestNoConnectedTargetMessage: {
    key: 'canvas.inspector.authoring.dbtTestNoConnectedTargetMessage',
    fallback: 'Connect this validation to a DBT model before configuring it.',
  },
  inspectorDvtSourceTitle: {
    key: 'canvas.inspector.authoring.dvtSourceTitle',
    fallback: 'DVT source',
  },
  inspectorDvtConnectionLabel: {
    key: 'canvas.inspector.authoring.dvtConnectionLabel',
    fallback: 'Connection',
  },
  inspectorDvtConnectionPlaceholder: {
    key: 'canvas.inspector.authoring.dvtConnectionPlaceholder',
    fallback: 'Select a governed connection',
  },
  inspectorDvtConnectionLoadingLabel: {
    key: 'canvas.inspector.authoring.dvtConnectionLoadingLabel',
    fallback: 'Loading connections…',
  },
  inspectorDvtConnectionLoadFailedMessage: {
    key: 'canvas.inspector.authoring.dvtConnectionLoadFailedMessage',
    fallback: 'Connections could not be loaded.',
  },
  inspectorDvtConnectionTestLabel: {
    key: 'canvas.inspector.authoring.dvtConnectionTestLabel',
    fallback: 'Test connection',
  },
  inspectorDvtConnectionTestPassedMessage: {
    key: 'canvas.inspector.authoring.dvtConnectionTestPassedMessage',
    fallback: 'Connection available.',
  },
  inspectorDvtConnectionTestFailedMessage: {
    key: 'canvas.inspector.authoring.dvtConnectionTestFailedMessage',
    fallback: 'Connection unavailable.',
  },
  inspectorDvtInheritedConnectionLabel: {
    key: 'canvas.inspector.authoring.dvtInheritedConnectionLabel',
    fallback: 'Inherited connection',
  },
  inspectorDvtSqlTransformTitle: {
    key: 'canvas.inspector.authoring.dvtSqlTransformTitle',
    fallback: 'DVT SQL transform',
  },
  inspectorDvtSubstraitInnerJoinAction: {
    key: 'canvas.inspector.authoring.dvtSubstraitInnerJoinAction',
    fallback: 'INNER JOIN',
  },
  inspectorDvtSubstraitInnerJoinTitle: {
    key: 'canvas.inspector.authoring.dvtSubstraitInnerJoinTitle',
    fallback: 'Substrait INNER JOIN',
  },
  inspectorDvtSubstraitJoinConditionLabel: {
    key: 'canvas.inspector.authoring.dvtSubstraitJoinConditionLabel',
    fallback: 'Join condition',
  },
  inspectorDvtSubstraitAppendInputTitle: {
    key: 'canvas.inspector.authoring.dvtSubstraitAppendInputTitle',
    fallback: 'Add connected input',
  },
  inspectorDvtSubstraitExistingFieldLabel: {
    key: 'canvas.inspector.authoring.dvtSubstraitExistingFieldLabel',
    fallback: 'Existing field',
  },
  inspectorDvtSubstraitConnectedFieldLabel: {
    key: 'canvas.inspector.authoring.dvtSubstraitConnectedFieldLabel',
    fallback: 'Connected input field',
  },
  inspectorDvtSubstraitAppendInputAction: {
    key: 'canvas.inspector.authoring.dvtSubstraitAppendInputAction',
    fallback: 'Add input',
  },
  inspectorDvtSubstraitSelectedFieldsLabel: {
    key: 'canvas.inspector.authoring.dvtSubstraitSelectedFieldsLabel',
    fallback: 'Selected fields',
  },
  inspectorDvtSubstraitMoveFieldUpLabel: {
    key: 'canvas.inspector.authoring.dvtSubstraitMoveFieldUpLabel',
    fallback: 'Move field up',
  },
  inspectorDvtSubstraitMoveFieldDownLabel: {
    key: 'canvas.inspector.authoring.dvtSubstraitMoveFieldDownLabel',
    fallback: 'Move field down',
  },
  inspectorDvtSubstraitUnionAllAction: {
    key: 'canvas.inspector.authoring.dvtSubstraitUnionAllAction',
    fallback: 'Union all',
  },
  inspectorDvtSubstraitUnionAllTitle: {
    key: 'canvas.inspector.authoring.dvtSubstraitUnionAllTitle',
    fallback: 'Substrait UNION ALL',
  },
  inspectorDvtSubstraitUnionAllInputsLabel: {
    key: 'canvas.inspector.authoring.dvtSubstraitUnionAllInputsLabel',
    fallback: 'Inputs',
  },
  inspectorDvtSubstraitUnionAllFieldsLabel: {
    key: 'canvas.inspector.authoring.dvtSubstraitUnionAllFieldsLabel',
    fallback: 'Compatible fields',
  },
  inspectorDvtSubstraitAggregationTitle: {
    key: 'canvas.inspector.authoring.dvtSubstraitAggregationTitle',
    fallback: 'Grain and summary',
  },
  inspectorDvtSubstraitGrainFieldLabel: {
    key: 'canvas.inspector.authoring.dvtSubstraitGrainFieldLabel',
    fallback: 'Grain field',
  },
  inspectorDvtSubstraitCountOutputLabel: {
    key: 'canvas.inspector.authoring.dvtSubstraitCountOutputLabel',
    fallback: 'Row count output',
  },
  inspectorDvtSubstraitApplyAggregationLabel: {
    key: 'canvas.inspector.authoring.dvtSubstraitApplyAggregationLabel',
    fallback: 'Summarize',
  },
  inspectorDvtSubstraitRemoveAggregationLabel: {
    key: 'canvas.inspector.authoring.dvtSubstraitRemoveAggregationLabel',
    fallback: 'Remove summary',
  },
  inspectorDvtSubstraitAggregateWindowTitle: {
    key: 'canvas.inspector.authoring.dvtSubstraitAggregateWindowTitle',
    fallback: 'Rank grouped rows',
  },
  inspectorDvtSubstraitAggregateWindowOrderLabel: {
    key: 'canvas.inspector.authoring.dvtSubstraitAggregateWindowOrderLabel',
    fallback: 'Order grouped rows by',
  },
  inspectorDvtSubstraitApplyAggregateWindowLabel: {
    key: 'canvas.inspector.authoring.dvtSubstraitApplyAggregateWindowLabel',
    fallback: 'Rank groups',
  },
  inspectorDvtSubstraitRemoveAggregateWindowLabel: {
    key: 'canvas.inspector.authoring.dvtSubstraitRemoveAggregateWindowLabel',
    fallback: 'Remove group ranking',
  },
  inspectorDvtSubstraitWindowTitle: {
    key: 'canvas.inspector.authoring.dvtSubstraitWindowTitle',
    fallback: 'Partition and order',
  },
  inspectorDvtSubstraitWindowPartitionFieldLabel: {
    key: 'canvas.inspector.authoring.dvtSubstraitWindowPartitionFieldLabel',
    fallback: 'Partition field',
  },
  inspectorDvtSubstraitWindowOrderFieldLabel: {
    key: 'canvas.inspector.authoring.dvtSubstraitWindowOrderFieldLabel',
    fallback: 'Order field',
  },
  inspectorDvtSubstraitWindowOutputLabel: {
    key: 'canvas.inspector.authoring.dvtSubstraitWindowOutputLabel',
    fallback: 'Row number output',
  },
  inspectorDvtSubstraitApplyWindowLabel: {
    key: 'canvas.inspector.authoring.dvtSubstraitApplyWindowLabel',
    fallback: 'Add row numbers',
  },
  inspectorDvtSubstraitRemoveWindowLabel: {
    key: 'canvas.inspector.authoring.dvtSubstraitRemoveWindowLabel',
    fallback: 'Remove row numbers',
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
  inspectorDvtSqlValidationCheckingLabel: {
    key: 'canvas.inspector.authoring.dvtSqlValidationCheckingLabel',
    fallback: 'Checking SQL…',
  },
  inspectorDvtSqlValidationValidLabel: {
    key: 'canvas.inspector.authoring.dvtSqlValidationValidLabel',
    fallback: 'SQL is ready for Preview.',
  },
  inspectorDvtSqlValidationUnavailableLabel: {
    key: 'canvas.inspector.authoring.dvtSqlValidationUnavailableLabel',
    fallback: 'SQL could not be checked with the governed connection.',
  },
  inspectorDvtSqlRequiredMessage: {
    key: 'canvas.inspector.authoring.dvtSqlRequiredMessage',
    fallback: 'Enter a SQL query.',
  },
  inspectorDvtSqlSyntaxErrorMessage: {
    key: 'canvas.inspector.authoring.dvtSqlSyntaxErrorMessage',
    fallback: 'Fix the PostgreSQL syntax.',
  },
  inspectorDvtSqlMultipleStatementsMessage: {
    key: 'canvas.inspector.authoring.dvtSqlMultipleStatementsMessage',
    fallback: 'Use a single SQL statement.',
  },
  inspectorDvtSqlUnsupportedStatementMessage: {
    key: 'canvas.inspector.authoring.dvtSqlUnsupportedStatementMessage',
    fallback: 'Use a SELECT statement.',
  },
  inspectorDvtSqlUndefinedTableMessage: {
    key: 'canvas.inspector.authoring.dvtSqlUndefinedTableMessage',
    fallback: 'PostgreSQL cannot find this table.',
  },
  inspectorDvtSqlUndefinedColumnMessage: {
    key: 'canvas.inspector.authoring.dvtSqlUndefinedColumnMessage',
    fallback: 'PostgreSQL cannot find this column.',
  },
  inspectorDvtSqlPostgresErrorMessage: {
    key: 'canvas.inspector.authoring.dvtSqlPostgresErrorMessage',
    fallback: 'PostgreSQL rejected this query.',
  },
  inspectorDvtVisualRecipeTitle: {
    key: 'canvas.inspector.authoring.dvtVisualRecipeTitle',
    fallback: 'Visual recipe',
  },
  inspectorDvtVisualOutputLabel: {
    key: 'canvas.inspector.authoring.dvtVisualOutputLabel',
    fallback: 'Output',
  },
  inspectorDvtVisualOutputNameLabel: {
    key: 'canvas.inspector.authoring.dvtVisualOutputNameLabel',
    fallback: 'Output name',
  },
  inspectorDvtVisualInputsLabel: {
    key: 'canvas.inspector.authoring.dvtVisualInputsLabel',
    fallback: 'Input columns',
  },
  inspectorDvtVisualOperationsLabel: {
    key: 'canvas.inspector.authoring.dvtVisualOperationsLabel',
    fallback: 'Operations',
  },
  inspectorDvtVisualOperationLabel: {
    key: 'canvas.inspector.authoring.dvtVisualOperationLabel',
    fallback: 'Operation',
  },
  inspectorDvtVisualAddOutputLabel: {
    key: 'canvas.inspector.authoring.dvtVisualAddOutputLabel',
    fallback: 'Add output',
  },
  inspectorDvtVisualExcludeOutputLabel: {
    key: 'canvas.inspector.authoring.dvtVisualExcludeOutputLabel',
    fallback: 'Exclude output',
  },
  inspectorDvtVisualAddOperationLabel: {
    key: 'canvas.inspector.authoring.dvtVisualAddOperationLabel',
    fallback: 'Add operation',
  },
  inspectorDvtVisualRemoveOperationLabel: {
    key: 'canvas.inspector.authoring.dvtVisualRemoveOperationLabel',
    fallback: 'Remove operation',
  },
  inspectorDvtVisualMoveOperationUpLabel: {
    key: 'canvas.inspector.authoring.dvtVisualMoveOperationUpLabel',
    fallback: 'Move operation up',
  },
  inspectorDvtVisualMoveOperationDownLabel: {
    key: 'canvas.inspector.authoring.dvtVisualMoveOperationDownLabel',
    fallback: 'Move operation down',
  },
  inspectorDvtVisualPassthroughLabel: {
    key: 'canvas.inspector.authoring.dvtVisualPassthroughLabel',
    fallback: 'Direct',
  },
  inspectorDvtVisualConstantLabel: {
    key: 'canvas.inspector.authoring.dvtVisualConstantLabel',
    fallback: 'Constant',
  },
  inspectorDvtVisualCastTypeLabel: {
    key: 'canvas.inspector.authoring.dvtVisualCastTypeLabel',
    fallback: 'Cast type',
  },
  inspectorDvtVisualArgumentLabel: {
    key: 'canvas.inspector.authoring.dvtVisualArgumentLabel',
    fallback: 'Argument',
  },
  inspectorDvtVisualFiltersLabel: {
    key: 'canvas.inspector.authoring.dvtVisualFiltersLabel',
    fallback: 'Filters',
  },
  inspectorDvtVisualAddFilterLabel: {
    key: 'canvas.inspector.authoring.dvtVisualAddFilterLabel',
    fallback: 'Add filter',
  },
  inspectorDvtVisualRemoveFilterLabel: {
    key: 'canvas.inspector.authoring.dvtVisualRemoveFilterLabel',
    fallback: 'Remove filter',
  },
  inspectorDvtVisualFilterColumnLabel: {
    key: 'canvas.inspector.authoring.dvtVisualFilterColumnLabel',
    fallback: 'Filter column',
  },
  inspectorDvtVisualFilterOperatorLabel: {
    key: 'canvas.inspector.authoring.dvtVisualFilterOperatorLabel',
    fallback: 'Filter operator',
  },
  inspectorDvtVisualFilterValueLabel: {
    key: 'canvas.inspector.authoring.dvtVisualFilterValueLabel',
    fallback: 'Filter value',
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
  inspectorErrorDbtTestTypeInvalid: {
    key: 'canvas.inspector.authoring.errorDbtTestTypeInvalid',
    fallback: 'Choose a supported DBT validation rule.',
  },
  inspectorErrorDbtTestTargetRequired: {
    key: 'canvas.inspector.authoring.errorDbtTestTargetRequired',
    fallback: 'Connect and select the DBT model validated by this test.',
  },
  inspectorErrorDbtTestColumnInvalid: {
    key: 'canvas.inspector.authoring.errorDbtTestColumnInvalid',
    fallback: 'Enter a valid target column identifier.',
  },
  inspectorErrorDbtTestColumnNotDeclared: {
    key: 'canvas.inspector.authoring.errorDbtTestColumnNotDeclared',
    fallback: 'Select a column declared by the connected DBT model.',
  },
  inspectorErrorDbtTestSeverityInvalid: {
    key: 'canvas.inspector.authoring.errorDbtTestSeverityInvalid',
    fallback: 'Severity must block execution or report a warning.',
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
  inspectorErrorDvtConnectionRequired: {
    key: 'canvas.inspector.authoring.errorDvtConnectionRequired',
    fallback: 'Select a PostgreSQL connection.',
  },
  inspectorErrorDvtVisualRecipeInvalid: {
    key: 'canvas.inspector.authoring.errorDvtVisualRecipeInvalid',
    fallback: 'Complete every visual output before applying the recipe.',
  },
  inspectorErrorDvtMaterializationInvalid: {
    key: 'canvas.inspector.authoring.errorDvtMaterializationInvalid',
    fallback: 'Materialization must be table or view.',
  },
  inspectorErrorDvtWriteModeInvalid: {
    key: 'canvas.inspector.authoring.errorDvtWriteModeInvalid',
    fallback: 'Write mode must be replace or append.',
  },
  inspectorHttpJsonTitle: {
    key: 'canvas.inspector.httpJson.title',
    fallback: 'HTTP JSON acquisition',
  },
  inspectorHttpJsonDescription: {
    key: 'canvas.inspector.httpJson.description',
    fallback:
      'Fetch immutable JSON or JSON Lines through opaque endpoint and credential references.',
  },
  inspectorHttpJsonEndpointRefLabel: {
    key: 'canvas.inspector.httpJson.endpointRefLabel',
    fallback: 'Endpoint reference',
  },
  inspectorHttpJsonAuthCredentialRefLabel: {
    key: 'canvas.inspector.httpJson.authCredentialRefLabel',
    fallback: 'Authentication credential reference (optional)',
  },
  inspectorHttpJsonFormatLabel: {
    key: 'canvas.inspector.httpJson.formatLabel',
    fallback: 'Format',
  },
  inspectorHttpJsonExpectedSha256Label: {
    key: 'canvas.inspector.httpJson.expectedSha256Label',
    fallback: 'Expected SHA-256',
  },
  inspectorHttpJsonExpectedSizeBytesLabel: {
    key: 'canvas.inspector.httpJson.expectedSizeBytesLabel',
    fallback: 'Expected size (bytes)',
  },
  inspectorHttpJsonMaxBytesLabel: {
    key: 'canvas.inspector.httpJson.maxBytesLabel',
    fallback: 'Maximum admitted size (bytes)',
  },
  inspectorHttpJsonStorageUriLabel: {
    key: 'canvas.inspector.httpJson.storageUriLabel',
    fallback: 'Content-addressed S3 URI',
  },
  inspectorHttpJsonArtifactCredentialRefLabel: {
    key: 'canvas.inspector.httpJson.artifactCredentialRefLabel',
    fallback: 'Object-store credential reference',
  },
  inspectorHttpJsonConnectTimeoutLabel: {
    key: 'canvas.inspector.httpJson.connectTimeoutLabel',
    fallback: 'Connection timeout (ms)',
  },
  inspectorHttpJsonRequestTimeoutLabel: {
    key: 'canvas.inspector.httpJson.requestTimeoutLabel',
    fallback: 'Request timeout (ms)',
  },
  inspectorHttpJsonMaxRedirectsLabel: {
    key: 'canvas.inspector.httpJson.maxRedirectsLabel',
    fallback: 'Maximum redirects',
  },
  inspectorErrorHttpJsonEndpointRefInvalid: {
    key: 'canvas.inspector.httpJson.errorEndpointRefInvalid',
    fallback: 'Use an opaque http-endpoint:<id> reference.',
  },
  inspectorErrorHttpJsonAuthCredentialRefInvalid: {
    key: 'canvas.inspector.httpJson.errorAuthCredentialRefInvalid',
    fallback: 'Use an opaque http-auth:<id> reference or leave it empty.',
  },
  inspectorErrorHttpJsonSha256Invalid: {
    key: 'canvas.inspector.httpJson.errorSha256Invalid',
    fallback: 'SHA-256 must contain exactly 64 hexadecimal characters.',
  },
  inspectorErrorHttpJsonSizeInvalid: {
    key: 'canvas.inspector.httpJson.errorSizeInvalid',
    fallback:
      'Expected size must be a positive integer, no greater than 50000000 bytes, and no greater than maximum size.',
  },
  inspectorErrorHttpJsonMaxBytesInvalid: {
    key: 'canvas.inspector.httpJson.errorMaxBytesInvalid',
    fallback:
      'Maximum size must be a positive integer, no greater than 50000000 bytes, and not smaller than expected size.',
  },
  inspectorErrorHttpJsonStorageUriInvalid: {
    key: 'canvas.inspector.httpJson.errorStorageUriInvalid',
    fallback: 'Use s3://<bucket>/tenants/<tenant>/<sha256> for the immutable artifact.',
  },
  inspectorErrorHttpJsonArtifactCredentialRefInvalid: {
    key: 'canvas.inspector.httpJson.errorArtifactCredentialRefInvalid',
    fallback: 'Use an opaque object-store:<id> credential reference.',
  },
  inspectorErrorHttpJsonConnectTimeoutInvalid: {
    key: 'canvas.inspector.httpJson.errorConnectTimeoutInvalid',
    fallback:
      'Connection timeout must be an integer between 100 and 30000 ms and not exceed request timeout.',
  },
  inspectorErrorHttpJsonRequestTimeoutInvalid: {
    key: 'canvas.inspector.httpJson.errorRequestTimeoutInvalid',
    fallback: 'Request timeout must be an integer between 100 and 60000 ms.',
  },
  inspectorErrorHttpJsonRedirectLimitInvalid: {
    key: 'canvas.inspector.httpJson.errorRedirectLimitInvalid',
    fallback: 'Maximum redirects must be an integer between 0 and 5.',
  },
  inspectorObjectFileTitle: {
    key: 'canvas.inspector.objectFile.title',
    fallback: 'Object-file load',
  },
  inspectorObjectFileDescription: {
    key: 'canvas.inspector.objectFile.description',
    fallback: 'Load one immutable CSV or JSON Lines object into governed PostgreSQL staging.',
  },
  inspectorObjectFileStorageUriLabel: {
    key: 'canvas.inspector.objectFile.storageUriLabel',
    fallback: 'Content-addressed storage URI',
  },
  inspectorObjectFileSha256Label: {
    key: 'canvas.inspector.objectFile.sha256Label',
    fallback: 'SHA-256 digest',
  },
  inspectorObjectFileSizeBytesLabel: {
    key: 'canvas.inspector.objectFile.sizeBytesLabel',
    fallback: 'Object size (bytes)',
  },
  inspectorObjectFileMaxBytesLabel: {
    key: 'canvas.inspector.objectFile.maxBytesLabel',
    fallback: 'Maximum admitted size (bytes)',
  },
  inspectorObjectFileFormatLabel: {
    key: 'canvas.inspector.objectFile.formatLabel',
    fallback: 'Format',
  },
  inspectorObjectFileCsvLabel: {
    key: 'canvas.inspector.objectFile.csvLabel',
    fallback: 'CSV with header',
  },
  inspectorObjectFileJsonLinesLabel: {
    key: 'canvas.inspector.objectFile.jsonLinesLabel',
    fallback: 'JSON Lines',
  },
  inspectorObjectFileSourceCredentialLabel: {
    key: 'canvas.inspector.objectFile.sourceCredentialLabel',
    fallback: 'Object-store credential reference',
  },
  inspectorObjectFileTargetTitle: {
    key: 'canvas.inspector.objectFile.targetTitle',
    fallback: 'PostgreSQL target',
  },
  inspectorObjectFileTargetSummary: {
    key: 'canvas.inspector.objectFile.targetSummary',
    fallback: 'staging schema · replace mode',
  },
  inspectorObjectFileTargetRelationLabel: {
    key: 'canvas.inspector.objectFile.targetRelationLabel',
    fallback: 'Staging relation',
  },
  inspectorObjectFileTargetCredentialLabel: {
    key: 'canvas.inspector.objectFile.targetCredentialLabel',
    fallback: 'PostgreSQL credential reference',
  },
  inspectorObjectFileColumnsTitle: {
    key: 'canvas.inspector.objectFile.columnsTitle',
    fallback: 'Column mappings',
  },
  inspectorObjectFileAddColumnLabel: {
    key: 'canvas.inspector.objectFile.addColumnLabel',
    fallback: 'Add column mapping',
  },
  inspectorObjectFileRemoveColumnLabel: {
    key: 'canvas.inspector.objectFile.removeColumnLabel',
    fallback: 'Remove column mapping',
  },
  inspectorObjectFileSourceFieldLabel: {
    key: 'canvas.inspector.objectFile.sourceFieldLabel',
    fallback: 'Source field',
  },
  inspectorObjectFileTargetColumnLabel: {
    key: 'canvas.inspector.objectFile.targetColumnLabel',
    fallback: 'Target column',
  },
  inspectorObjectFileDataTypeLabel: {
    key: 'canvas.inspector.objectFile.dataTypeLabel',
    fallback: 'PostgreSQL type',
  },
  inspectorObjectFileNullableLabel: {
    key: 'canvas.inspector.objectFile.nullableLabel',
    fallback: 'Nullable',
  },
  inspectorErrorObjectFileStorageUriInvalid: {
    key: 'canvas.inspector.objectFile.errorStorageUriInvalid',
    fallback: 'Use s3://<bucket>/tenants/<tenant>/<sha256> for the immutable object.',
  },
  inspectorErrorObjectFileSha256Invalid: {
    key: 'canvas.inspector.objectFile.errorSha256Invalid',
    fallback: 'SHA-256 must contain exactly 64 hexadecimal characters.',
  },
  inspectorErrorObjectFileSizeInvalid: {
    key: 'canvas.inspector.objectFile.errorSizeInvalid',
    fallback:
      'Object size must be a positive integer, no greater than 50000000 bytes, and no greater than maximum size.',
  },
  inspectorErrorObjectFileMaxBytesInvalid: {
    key: 'canvas.inspector.objectFile.errorMaxBytesInvalid',
    fallback:
      'Maximum size must be a positive integer, no greater than 50000000 bytes, and at least object size.',
  },
  inspectorErrorObjectFileSourceCredentialInvalid: {
    key: 'canvas.inspector.objectFile.errorSourceCredentialInvalid',
    fallback: 'Use an opaque object-store:<id> credential reference.',
  },
  inspectorErrorObjectFileTargetRelationInvalid: {
    key: 'canvas.inspector.objectFile.errorTargetRelationInvalid',
    fallback: 'Staging relation must be a valid lowercase PostgreSQL identifier.',
  },
  inspectorErrorObjectFileTargetCredentialInvalid: {
    key: 'canvas.inspector.objectFile.errorTargetCredentialInvalid',
    fallback: 'Use an opaque postgres:<id> credential reference.',
  },
  inspectorErrorObjectFileColumnMappingInvalid: {
    key: 'canvas.inspector.objectFile.errorColumnMappingInvalid',
    fallback: 'Add at least one unique, valid source-to-target column mapping.',
  },
} satisfies CanvasCopySection;
