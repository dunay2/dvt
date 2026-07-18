-- Complete the DB-first feature mechanization for the hard-Fowler DBT YAML
-- description vertical. The feature owns three canonical CQ rails; shared
-- symbols declare the rails they support without recreating the superseded
-- transaction component.

-- Keep the original command-created rows because their operation history is
-- the audit authority. Migration 736 added parallel #implemented rows without
-- operations; those rows are duplicate identities for the same three intents.
delete from planning_query_store.feature_mechanization_local_rails duplicate
where duplicate.feature_id = 'E-DBT-PROJECT-ROUNDTRIP-P5-YAML-DESCRIPTION-1'
  and duplicate.rail_id like '%#implemented'
  and exists (
    select 1
    from planning_query_store.feature_mechanization_local_rails canonical
    where canonical.feature_id = duplicate.feature_id
      and canonical.rail_name = duplicate.rail_name
      and canonical.rail_type = duplicate.rail_type
      and canonical.rail_id <> duplicate.rail_id
      and canonical.rail_id not like '%#implemented'
  );

with symbol_catalog as (
  select entry.path as symbol_path, entry.name as symbol_name
  from jsonb_to_recordset($symbols$
[
  {
    "path": "apps/api/src/application/ports/dbtYamlDescriptionEdit.ts",
    "name": "ApplyDbtYamlDescriptionEditInput"
  },
  {
    "path": "apps/api/src/application/ports/dbtYamlDescriptionEdit.ts",
    "name": "DbtYamlDescriptionDocumentInvalidError"
  },
  {
    "path": "apps/api/src/application/ports/dbtYamlDescriptionEdit.ts",
    "name": "DbtYamlDescriptionMutation"
  },
  {
    "path": "apps/api/src/application/ports/dbtYamlDescriptionEdit.ts",
    "name": "DbtYamlDescriptionPersistenceInvariantError"
  },
  {
    "path": "apps/api/src/application/ports/dbtYamlDescriptionEdit.ts",
    "name": "DbtYamlDescriptionProposalMismatchError"
  },
  {
    "path": "apps/api/src/application/ports/dbtYamlDescriptionEdit.ts",
    "name": "DbtYamlDescriptionReceiptInvalidError"
  },
  {
    "path": "apps/api/src/application/ports/dbtYamlDescriptionEdit.ts",
    "name": "DbtYamlDescriptionResourceAmbiguousError"
  },
  {
    "path": "apps/api/src/application/ports/dbtYamlDescriptionEdit.ts",
    "name": "DbtYamlDescriptionResourceContext"
  },
  {
    "path": "apps/api/src/application/ports/dbtYamlDescriptionEdit.ts",
    "name": "DbtYamlDescriptionResourceNotFoundError"
  },
  {
    "path": "apps/api/src/application/ports/dbtYamlDescriptionEdit.ts",
    "name": "DbtYamlDescriptionResourceUnsupportedError"
  },
  {
    "path": "apps/api/src/application/ports/dbtYamlDescriptionEdit.ts",
    "name": "DbtYamlDescriptionRevisionConflictError"
  },
  {
    "path": "apps/api/src/application/ports/dbtYamlDescriptionEdit.ts",
    "name": "IApplyDbtYamlDescriptionEditCommand"
  },
  {
    "path": "apps/api/src/application/ports/dbtYamlDescriptionEdit.ts",
    "name": "IDbtYamlDescriptionMutator"
  },
  {
    "path": "apps/api/src/application/ports/dbtYamlDescriptionEdit.ts",
    "name": "IDbtYamlDescriptionReceiptStore"
  },
  {
    "path": "apps/api/src/application/ports/dbtYamlDescriptionEdit.ts",
    "name": "IDbtYamlDescriptionResourceResolver"
  },
  {
    "path": "apps/api/src/application/ports/dbtYamlDescriptionEdit.ts",
    "name": "IProposeDbtYamlDescriptionEditQuery"
  },
  {
    "path": "apps/api/src/application/ports/dbtYamlDescriptionEdit.ts",
    "name": "IRevertDbtYamlDescriptionEditCommand"
  },
  {
    "path": "apps/api/src/application/ports/dbtYamlDescriptionEdit.ts",
    "name": "ProposeDbtYamlDescriptionEditInput"
  },
  {
    "path": "apps/api/src/application/ports/dbtYamlDescriptionEdit.ts",
    "name": "RevertDbtYamlDescriptionEditInput"
  },
  {
    "path": "apps/api/src/application/services/dbtYamlDescriptionEdit/ApplyDbtYamlDescriptionEditCommand.ts",
    "name": "apply"
  },
  {
    "path": "apps/api/src/application/services/dbtYamlDescriptionEdit/ApplyDbtYamlDescriptionEditCommand.ts",
    "name": "ApplyDbtYamlDescriptionEditCommand"
  },
  {
    "path": "apps/api/src/application/services/dbtYamlDescriptionEdit/dbtYamlDescriptionEditIntegrity.ts",
    "name": "analysisReceipt"
  },
  {
    "path": "apps/api/src/application/services/dbtYamlDescriptionEdit/dbtYamlDescriptionEditIntegrity.ts",
    "name": "assertProposalIntegrity"
  },
  {
    "path": "apps/api/src/application/services/dbtYamlDescriptionEdit/dbtYamlDescriptionEditIntegrity.ts",
    "name": "batchIdempotencyKey"
  },
  {
    "path": "apps/api/src/application/services/dbtYamlDescriptionEdit/dbtYamlDescriptionEditIntegrity.ts",
    "name": "buildFocusedUnifiedDiff"
  },
  {
    "path": "apps/api/src/application/services/dbtYamlDescriptionEdit/dbtYamlDescriptionEditIntegrity.ts",
    "name": "canonicalJson"
  },
  {
    "path": "apps/api/src/application/services/dbtYamlDescriptionEdit/dbtYamlDescriptionEditIntegrity.ts",
    "name": "canonicalJsonValue"
  },
  {
    "path": "apps/api/src/application/services/dbtYamlDescriptionEdit/dbtYamlDescriptionEditIntegrity.ts",
    "name": "operationReceiptId"
  },
  {
    "path": "apps/api/src/application/services/dbtYamlDescriptionEdit/dbtYamlDescriptionEditIntegrity.ts",
    "name": "operationRequestHash"
  },
  {
    "path": "apps/api/src/application/services/dbtYamlDescriptionEdit/dbtYamlDescriptionEditIntegrity.ts",
    "name": "proposalDigest"
  },
  {
    "path": "apps/api/src/application/services/dbtYamlDescriptionEdit/dbtYamlDescriptionEditIntegrity.ts",
    "name": "sha256"
  },
  {
    "path": "apps/api/src/application/services/dbtYamlDescriptionEdit/DbtYamlDescriptionResourceResolver.ts",
    "name": "DbtYamlDescriptionResourceResolver"
  },
  {
    "path": "apps/api/src/application/services/dbtYamlDescriptionEdit/DbtYamlDescriptionResourceResolver.ts",
    "name": "EDITABLE_RESOURCE_TYPES"
  },
  {
    "path": "apps/api/src/application/services/dbtYamlDescriptionEdit/DbtYamlDescriptionResourceResolver.ts",
    "name": "isEditableResourceType"
  },
  {
    "path": "apps/api/src/application/services/dbtYamlDescriptionEdit/DbtYamlDescriptionResourceResolver.ts",
    "name": "joinProjectPath"
  },
  {
    "path": "apps/api/src/application/services/dbtYamlDescriptionEdit/ProposeDbtYamlDescriptionEditQuery.ts",
    "name": "propose"
  },
  {
    "path": "apps/api/src/application/services/dbtYamlDescriptionEdit/ProposeDbtYamlDescriptionEditQuery.ts",
    "name": "ProposeDbtYamlDescriptionEditQuery"
  },
  {
    "path": "apps/api/src/application/services/dbtYamlDescriptionEdit/RevertDbtYamlDescriptionEditCommand.ts",
    "name": "revert"
  },
  {
    "path": "apps/api/src/application/services/dbtYamlDescriptionEdit/RevertDbtYamlDescriptionEditCommand.ts",
    "name": "RevertDbtYamlDescriptionEditCommand"
  },
  {
    "path": "apps/api/src/application/services/projectDbtGraphFromFilesUseCase.ts",
    "name": "resolveVisualEditability"
  },
  {
    "path": "apps/api/src/entrypoints/http/dbtProjectFileRouteAuthorization.ts",
    "name": "authorizeDbtProjectFileRequest"
  },
  {
    "path": "apps/api/src/entrypoints/http/dbtProjectFileRouteAuthorization.ts",
    "name": "DbtProjectFileRouteAuthDeps"
  },
  {
    "path": "apps/api/src/entrypoints/http/dbtProjectFileRouteAuthorization.ts",
    "name": "DbtProjectFileScopeQuery"
  },
  {
    "path": "apps/api/src/entrypoints/http/dbtProjectFileRouteAuthorization.ts",
    "name": "parseDbtProjectFileScope"
  },
  {
    "path": "apps/api/src/entrypoints/http/dbtYamlDescriptionEditRouteGroup.ts",
    "name": "registerProtectedDbtYamlDescriptionEditRouteGroup"
  },
  {
    "path": "apps/api/src/entrypoints/http/dbtYamlDescriptionEditRoutes.ts",
    "name": "authorizeRequest"
  },
  {
    "path": "apps/api/src/entrypoints/http/dbtYamlDescriptionEditRoutes.ts",
    "name": "DbtYamlDescriptionEditRouteDeps"
  },
  {
    "path": "apps/api/src/entrypoints/http/dbtYamlDescriptionEditRoutes.ts",
    "name": "registerDbtYamlDescriptionEditRoutes"
  },
  {
    "path": "apps/api/src/entrypoints/http/dbtYamlDescriptionEditRoutes.ts",
    "name": "resolveConflictReason"
  },
  {
    "path": "apps/api/src/entrypoints/http/dbtYamlDescriptionEditRoutes.ts",
    "name": "resolveUnprocessableReason"
  },
  {
    "path": "apps/api/src/entrypoints/http/dbtYamlDescriptionEditRoutes.ts",
    "name": "respondDomainError"
  },
  {
    "path": "apps/api/src/entrypoints/http/dbtYamlDescriptionEditRoutes.ts",
    "name": "respondInvalidRequest"
  },
  {
    "path": "apps/api/src/infrastructure/dbt/dbtManifestProjection.ts",
    "name": "isYamlPath"
  },
  {
    "path": "apps/api/src/infrastructure/dbt/dbtManifestProjection.ts",
    "name": "parseDbtOwnedPath"
  },
  {
    "path": "apps/api/src/infrastructure/dbt/dbtManifestProjection.ts",
    "name": "resolveDescriptionFilePath"
  },
  {
    "path": "apps/api/src/infrastructure/dbtYamlDescriptionEdit/WorkspaceMetadataDbtYamlDescriptionReceiptStore.ts",
    "name": "RECEIPT_ROOT"
  },
  {
    "path": "apps/api/src/infrastructure/dbtYamlDescriptionEdit/WorkspaceMetadataDbtYamlDescriptionReceiptStore.ts",
    "name": "receiptPath"
  },
  {
    "path": "apps/api/src/infrastructure/dbtYamlDescriptionEdit/WorkspaceMetadataDbtYamlDescriptionReceiptStore.ts",
    "name": "WorkspaceMetadataDbtYamlDescriptionReceiptStore"
  },
  {
    "path": "apps/api/src/infrastructure/dbtYamlDescriptionEdit/YamlCstDbtDescriptionMutator.ts",
    "name": "assertPatchedDescription"
  },
  {
    "path": "apps/api/src/infrastructure/dbtYamlDescriptionEdit/YamlCstDbtDescriptionMutator.ts",
    "name": "findLineStart"
  },
  {
    "path": "apps/api/src/infrastructure/dbtYamlDescriptionEdit/YamlCstDbtDescriptionMutator.ts",
    "name": "findPair"
  },
  {
    "path": "apps/api/src/infrastructure/dbtYamlDescriptionEdit/YamlCstDbtDescriptionMutator.ts",
    "name": "formatScalar"
  },
  {
    "path": "apps/api/src/infrastructure/dbtYamlDescriptionEdit/YamlCstDbtDescriptionMutator.ts",
    "name": "insertDescription"
  },
  {
    "path": "apps/api/src/infrastructure/dbtYamlDescriptionEdit/YamlCstDbtDescriptionMutator.ts",
    "name": "LocatedResource"
  },
  {
    "path": "apps/api/src/infrastructure/dbtYamlDescriptionEdit/YamlCstDbtDescriptionMutator.ts",
    "name": "locateResource"
  },
  {
    "path": "apps/api/src/infrastructure/dbtYamlDescriptionEdit/YamlCstDbtDescriptionMutator.ts",
    "name": "locateSourceTables"
  },
  {
    "path": "apps/api/src/infrastructure/dbtYamlDescriptionEdit/YamlCstDbtDescriptionMutator.ts",
    "name": "locateTopLevelResources"
  },
  {
    "path": "apps/api/src/infrastructure/dbtYamlDescriptionEdit/YamlCstDbtDescriptionMutator.ts",
    "name": "namedMaps"
  },
  {
    "path": "apps/api/src/infrastructure/dbtYamlDescriptionEdit/YamlCstDbtDescriptionMutator.ts",
    "name": "patchDescription"
  },
  {
    "path": "apps/api/src/infrastructure/dbtYamlDescriptionEdit/YamlCstDbtDescriptionMutator.ts",
    "name": "readDescription"
  },
  {
    "path": "apps/api/src/infrastructure/dbtYamlDescriptionEdit/YamlCstDbtDescriptionMutator.ts",
    "name": "readPairValue"
  },
  {
    "path": "apps/api/src/infrastructure/dbtYamlDescriptionEdit/YamlCstDbtDescriptionMutator.ts",
    "name": "requiredRange"
  },
  {
    "path": "apps/api/src/infrastructure/dbtYamlDescriptionEdit/YamlCstDbtDescriptionMutator.ts",
    "name": "resolvePairLineRange"
  },
  {
    "path": "apps/api/src/infrastructure/dbtYamlDescriptionEdit/YamlCstDbtDescriptionMutator.ts",
    "name": "RESOURCE_COLLECTION_BY_TYPE"
  },
  {
    "path": "apps/api/src/infrastructure/dbtYamlDescriptionEdit/YamlCstDbtDescriptionMutator.ts",
    "name": "scalarString"
  },
  {
    "path": "apps/api/src/infrastructure/dbtYamlDescriptionEdit/YamlCstDbtDescriptionMutator.ts",
    "name": "YamlCstDbtDescriptionMutator"
  },
  {
    "path": "apps/web/cypress/e2e/dbt/dbt-project-yaml-description-edit-live.cy.ts",
    "name": "CANVAS_ID"
  },
  {
    "path": "apps/web/cypress/e2e/dbt/dbt-project-yaml-description-edit-live.cy.ts",
    "name": "closeContextualWorkbench"
  },
  {
    "path": "apps/web/cypress/e2e/dbt/dbt-project-yaml-description-edit-live.cy.ts",
    "name": "closeModelWorkbench"
  },
  {
    "path": "apps/web/cypress/e2e/dbt/dbt-project-yaml-description-edit-live.cy.ts",
    "name": "editAndApplyDescription"
  },
  {
    "path": "apps/web/cypress/e2e/dbt/dbt-project-yaml-description-edit-live.cy.ts",
    "name": "expectAuthoritativeDescription"
  },
  {
    "path": "apps/web/cypress/e2e/dbt/dbt-project-yaml-description-edit-live.cy.ts",
    "name": "LiveRunEvents"
  },
  {
    "path": "apps/web/cypress/e2e/dbt/dbt-project-yaml-description-edit-live.cy.ts",
    "name": "LiveRunSnapshot"
  },
  {
    "path": "apps/web/cypress/e2e/dbt/dbt-project-yaml-description-edit-live.cy.ts",
    "name": "MODEL_PROJECT_PATH"
  },
  {
    "path": "apps/web/cypress/e2e/dbt/dbt-project-yaml-description-edit-live.cy.ts",
    "name": "MODEL_SQL_PATH"
  },
  {
    "path": "apps/web/cypress/e2e/dbt/dbt-project-yaml-description-edit-live.cy.ts",
    "name": "MODEL_UNIQUE_ID"
  },
  {
    "path": "apps/web/cypress/e2e/dbt/dbt-project-yaml-description-edit-live.cy.ts",
    "name": "ObservedRequest"
  },
  {
    "path": "apps/web/cypress/e2e/dbt/dbt-project-yaml-description-edit-live.cy.ts",
    "name": "openModelWorkbench"
  },
  {
    "path": "apps/web/cypress/e2e/dbt/dbt-project-yaml-description-edit-live.cy.ts",
    "name": "ORIGINAL_DESCRIPTION"
  },
  {
    "path": "apps/web/cypress/e2e/dbt/dbt-project-yaml-description-edit-live.cy.ts",
    "name": "PROJECT_FILES"
  },
  {
    "path": "apps/web/cypress/e2e/dbt/dbt-project-yaml-description-edit-live.cy.ts",
    "name": "PROJECT_ROOT"
  },
  {
    "path": "apps/web/cypress/e2e/dbt/dbt-project-yaml-description-edit-live.cy.ts",
    "name": "proveModelWorkbenchMovement"
  },
  {
    "path": "apps/web/cypress/e2e/dbt/dbt-project-yaml-description-edit-live.cy.ts",
    "name": "REVERT_PROOF_DESCRIPTION"
  },
  {
    "path": "apps/web/cypress/e2e/dbt/dbt-project-yaml-description-edit-live.cy.ts",
    "name": "RUN_DESCRIPTION"
  },
  {
    "path": "apps/web/cypress/e2e/dbt/dbt-project-yaml-description-edit-live.cy.ts",
    "name": "SCHEMA_CONTENT"
  },
  {
    "path": "apps/web/cypress/e2e/dbt/dbt-project-yaml-description-edit-live.cy.ts",
    "name": "SCHEMA_PATH"
  },
  {
    "path": "apps/web/cypress/e2e/dbt/dbt-project-yaml-description-edit-live.cy.ts",
    "name": "UPDATED_MODEL_SQL"
  },
  {
    "path": "apps/web/cypress/e2e/dbt/dbt-project-yaml-description-edit-live.cy.ts",
    "name": "visitProject"
  },
  {
    "path": "apps/web/cypress/e2e/dbt/dbt-project-yaml-description-edit-live.cy.ts",
    "name": "waitForCompletedRun"
  },
  {
    "path": "apps/web/cypress/support/liveProtectedRuntime.ts",
    "name": "waitForLiveWorkspaceFileContent"
  },
  {
    "path": "apps/web/src/app/components/dbtYamlDescriptionEditor/dbtYamlDescriptionAnalysisPresentation.ts",
    "name": "DbtYamlDescriptionAnalysisPresentation"
  },
  {
    "path": "apps/web/src/app/components/dbtYamlDescriptionEditor/dbtYamlDescriptionAnalysisPresentation.ts",
    "name": "DbtYamlDescriptionAnalysisTone"
  },
  {
    "path": "apps/web/src/app/components/dbtYamlDescriptionEditor/dbtYamlDescriptionAnalysisPresentation.ts",
    "name": "resolveDbtYamlDescriptionAnalysisPresentation"
  },
  {
    "path": "apps/web/src/app/components/dbtYamlDescriptionEditor/DbtYamlDescriptionEditor.tsx",
    "name": "DbtYamlDescriptionEditor"
  },
  {
    "path": "apps/web/src/app/components/dbtYamlDescriptionEditor/DbtYamlDescriptionEditor.tsx",
    "name": "DbtYamlDescriptionEditorProps"
  },
  {
    "path": "apps/web/src/app/components/dbtYamlDescriptionEditor/dbtYamlDescriptionEditorCopy.ts",
    "name": "COPY_BY_KEY"
  },
  {
    "path": "apps/web/src/app/components/dbtYamlDescriptionEditor/dbtYamlDescriptionEditorCopy.ts",
    "name": "DbtYamlDescriptionEditorCopy"
  },
  {
    "path": "apps/web/src/app/components/dbtYamlDescriptionEditor/dbtYamlDescriptionEditorCopy.ts",
    "name": "resolveDbtYamlDescriptionEditorCopy"
  },
  {
    "path": "apps/web/src/app/components/dbtYamlDescriptionEditor/dbtYamlDescriptionEditorCopy.ts",
    "name": "SPANISH_COPY"
  },
  {
    "path": "apps/web/src/app/components/dbtYamlDescriptionEditor/dbtYamlDescriptionEditorModel.ts",
    "name": "createDbtYamlDescriptionEditorState"
  },
  {
    "path": "apps/web/src/app/components/dbtYamlDescriptionEditor/dbtYamlDescriptionEditorModel.ts",
    "name": "DbtYamlDescriptionEditorPhase"
  },
  {
    "path": "apps/web/src/app/components/dbtYamlDescriptionEditor/dbtYamlDescriptionEditorModel.ts",
    "name": "DbtYamlDescriptionEditorState"
  },
  {
    "path": "apps/web/src/app/components/dbtYamlDescriptionEditor/dbtYamlDescriptionEditorModel.ts",
    "name": "hasDbtYamlDescriptionChanges"
  },
  {
    "path": "apps/web/src/app/components/dbtYamlDescriptionEditor/dbtYamlDescriptionEditorModel.ts",
    "name": "isDbtYamlDescriptionEditorBusy"
  },
  {
    "path": "apps/web/src/app/components/dbtYamlDescriptionEditor/dbtYamlDescriptionEditorModel.ts",
    "name": "normalizeDbtYamlDescriptionDraft"
  },
  {
    "path": "apps/web/src/app/components/dbtYamlDescriptionEditor/DbtYamlDescriptionEditorView.tsx",
    "name": "abbreviateReference"
  },
  {
    "path": "apps/web/src/app/components/dbtYamlDescriptionEditor/DbtYamlDescriptionEditorView.tsx",
    "name": "AppliedReceiptView"
  },
  {
    "path": "apps/web/src/app/components/dbtYamlDescriptionEditor/DbtYamlDescriptionEditorView.tsx",
    "name": "DbtYamlDescriptionEditorView"
  },
  {
    "path": "apps/web/src/app/components/dbtYamlDescriptionEditor/DbtYamlDescriptionEditorView.tsx",
    "name": "DbtYamlDescriptionEditorViewProps"
  },
  {
    "path": "apps/web/src/app/components/dbtYamlDescriptionEditor/DbtYamlDescriptionEditorView.tsx",
    "name": "ReceiptReference"
  },
  {
    "path": "apps/web/src/app/components/dbtYamlDescriptionEditor/dbtYamlDescriptionEditorVisualTokens.ts",
    "name": "dbtYamlDescriptionEditorVisualTokens"
  },
  {
    "path": "apps/web/src/app/components/dbtYamlDescriptionEditor/useDbtYamlDescriptionEditor.ts",
    "name": "apply"
  },
  {
    "path": "apps/web/src/app/components/dbtYamlDescriptionEditor/useDbtYamlDescriptionEditor.ts",
    "name": "presentFailure"
  },
  {
    "path": "apps/web/src/app/components/dbtYamlDescriptionEditor/useDbtYamlDescriptionEditor.ts",
    "name": "readErrorReason"
  },
  {
    "path": "apps/web/src/app/components/dbtYamlDescriptionEditor/useDbtYamlDescriptionEditor.ts",
    "name": "revert"
  },
  {
    "path": "apps/web/src/app/components/dbtYamlDescriptionEditor/useDbtYamlDescriptionEditor.ts",
    "name": "review"
  },
  {
    "path": "apps/web/src/app/components/dbtYamlDescriptionEditor/useDbtYamlDescriptionEditor.ts",
    "name": "useDbtYamlDescriptionEditor"
  },
  {
    "path": "apps/web/src/app/components/dbtYamlDescriptionEditor/useDbtYamlDescriptionEditor.ts",
    "name": "UseDbtYamlDescriptionEditorOptions"
  },
  {
    "path": "apps/web/src/app/components/inspector/nodePropertiesReadModel.ts",
    "name": "NODE_PROPERTY_ROW_ID"
  },
  {
    "path": "apps/web/src/app/components/inspector/nodePropertiesReadModel.ts",
    "name": "NodePropertyRowId"
  },
  {
    "path": "apps/web/src/app/ports/dbtYamlDescriptionEdit.ts",
    "name": "IDbtYamlDescriptionEditPort"
  },
  {
    "path": "apps/web/src/app/services/AppServicesContext.tsx",
    "name": "useDbtYamlDescriptionEditPort"
  },
  {
    "path": "apps/web/src/app/services/dbtProject/dbtYamlDescriptionEdit.api.ts",
    "name": "buildScopedEndpoint"
  },
  {
    "path": "apps/web/src/app/services/dbtProject/dbtYamlDescriptionEdit.api.ts",
    "name": "createApiDbtYamlDescriptionEditPort"
  },
  {
    "path": "apps/web/src/app/services/dbtProject/dbtYamlDescriptionEdit.api.ts",
    "name": "DBT_YAML_DESCRIPTION_EDIT_ENDPOINT"
  },
  {
    "path": "apps/web/src/app/services/dbtProject/dbtYamlDescriptionEdit.api.ts",
    "name": "DBT_YAML_DESCRIPTION_EDIT_HTTP_REASON"
  },
  {
    "path": "apps/web/src/app/views/canvas/canvasNodeFloatingToolbarModel.ts",
    "name": "CanvasNodeFloatingToolbarActionTone"
  },
  {
    "path": "apps/web/src/app/views/canvas/canvasNodeFloatingToolbarModel.ts",
    "name": "CanvasNodeFloatingToolbarCopy"
  },
  {
    "path": "apps/web/src/app/views/canvas/canvasNodeFloatingToolbarModel.ts",
    "name": "resolveToolbarCopy"
  },
  {
    "path": "apps/web/src/app/views/canvas/canvasNodeWorkbenchContribution.ts",
    "name": "appendContribution"
  },
  {
    "path": "apps/web/src/app/views/canvas/canvasNodeWorkbenchContribution.ts",
    "name": "CanvasNodeWorkbenchContribution"
  },
  {
    "path": "apps/web/src/app/views/canvas/canvasNodeWorkbenchContribution.ts",
    "name": "CanvasNodeWorkbenchContributionModel"
  },
  {
    "path": "apps/web/src/app/views/canvas/canvasNodeWorkbenchContribution.ts",
    "name": "resolveCanvasNodeWorkbenchContributions"
  },
  {
    "path": "apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.tsx",
    "name": "buildContributionChildrenBySection"
  },
  {
    "path": "apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.tsx",
    "name": "DVT_SINK_TARGET_ROW_IDS"
  },
  {
    "path": "apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.tsx",
    "name": "DVT_SOURCE_TARGET_ROW_IDS"
  },
  {
    "path": "apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.tsx",
    "name": "GENERAL_WORKBENCH_ALWAYS_EDITED_ROW_IDS"
  },
  {
    "path": "apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.tsx",
    "name": "renderWorkbenchContributions"
  },
  {
    "path": "apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.tsx",
    "name": "resolveNodeWorkbenchHiddenGeneralRowIds"
  },
  {
    "path": "apps/web/src/app/views/canvas/canvasNodeWorkbenchPositionModel.ts",
    "name": "CANVAS_NODE_WORKBENCH_DEFAULT_TOP"
  },
  {
    "path": "apps/web/src/app/views/canvas/canvasNodeWorkbenchPositionModel.ts",
    "name": "CANVAS_NODE_WORKBENCH_INSET"
  },
  {
    "path": "apps/web/src/app/views/canvas/canvasNodeWorkbenchPositionModel.ts",
    "name": "CanvasNodeWorkbenchBounds"
  },
  {
    "path": "apps/web/src/app/views/canvas/canvasNodeWorkbenchPositionModel.ts",
    "name": "CanvasNodeWorkbenchDelta"
  },
  {
    "path": "apps/web/src/app/views/canvas/canvasNodeWorkbenchPositionModel.ts",
    "name": "CanvasNodeWorkbenchPosition"
  },
  {
    "path": "apps/web/src/app/views/canvas/canvasNodeWorkbenchPositionModel.ts",
    "name": "clamp"
  },
  {
    "path": "apps/web/src/app/views/canvas/canvasNodeWorkbenchPositionModel.ts",
    "name": "clampCanvasNodeWorkbenchPosition"
  },
  {
    "path": "apps/web/src/app/views/canvas/canvasNodeWorkbenchPositionModel.ts",
    "name": "moveCanvasNodeWorkbenchPosition"
  },
  {
    "path": "apps/web/src/app/views/canvas/canvasNodeWorkbenchPositionModel.ts",
    "name": "resolveDefaultCanvasNodeWorkbenchPosition"
  },
  {
    "path": "apps/web/src/app/views/canvas/canvasNodeWorkbenchVisualTokens.ts",
    "name": "canvasNodeWorkbenchVisualTokens"
  },
  {
    "path": "apps/web/src/app/views/canvas/CanvasViewport.tsx",
    "name": "NodeFloatingToolbarAnchor"
  },
  {
    "path": "apps/web/src/app/views/canvas/dbtProjectFileCodeWorkbench.tsx",
    "name": "buildDbtProjectFileCodeWorkbench"
  },
  {
    "path": "apps/web/src/app/views/canvas/dbtProjectFileCodeWorkbench.tsx",
    "name": "DbtProjectFileCodeWorkbenchCopy"
  },
  {
    "path": "apps/web/src/app/views/canvas/dbtYamlDescriptionWorkbenchContribution.tsx",
    "name": "BuildDbtYamlDescriptionWorkbenchContributionOptions"
  },
  {
    "path": "apps/web/src/app/views/canvas/dbtYamlDescriptionWorkbenchContribution.tsx",
    "name": "buildDbtYamlDescriptionWorkbenchContributions"
  },
  {
    "path": "apps/web/src/app/views/canvas/dbtYamlDescriptionWorkbenchContribution.tsx",
    "name": "readDescriptionFilePath"
  },
  {
    "path": "apps/web/src/app/views/canvas/SqlContextWorkbench.tsx",
    "name": "CodeView"
  },
  {
    "path": "apps/web/src/app/views/canvas/SqlContextWorkbench.tsx",
    "name": "SqlContextWorkbench"
  },
  {
    "path": "apps/web/src/app/views/canvas/SqlContextWorkbench.tsx",
    "name": "SqlContextWorkbenchHandle"
  },
  {
    "path": "apps/web/src/app/views/canvas/SqlContextWorkbench.tsx",
    "name": "SqlContextWorkbenchProps"
  },
  {
    "path": "apps/web/src/app/views/canvas/sqlContextWorkbenchModel.ts",
    "name": "SqlContextWorkbenchTarget"
  },
  {
    "path": "apps/web/src/app/views/canvas/sqlContextWorkbenchVisualTokens.ts",
    "name": "sqlContextWorkbenchVisualTokens"
  },
  {
    "path": "apps/web/src/app/views/canvas/useCanvasNodeWorkbenchPosition.ts",
    "name": "CanvasNodeWorkbenchDragState"
  },
  {
    "path": "apps/web/src/app/views/canvas/useCanvasNodeWorkbenchPosition.ts",
    "name": "CanvasNodeWorkbenchPositionController"
  },
  {
    "path": "apps/web/src/app/views/canvas/useCanvasNodeWorkbenchPosition.ts",
    "name": "captureActivePointer"
  },
  {
    "path": "apps/web/src/app/views/canvas/useCanvasNodeWorkbenchPosition.ts",
    "name": "DEFAULT_SURFACE_HEIGHT"
  },
  {
    "path": "apps/web/src/app/views/canvas/useCanvasNodeWorkbenchPosition.ts",
    "name": "DEFAULT_SURFACE_WIDTH"
  },
  {
    "path": "apps/web/src/app/views/canvas/useCanvasNodeWorkbenchPosition.ts",
    "name": "KEYBOARD_MOVE_LARGE_STEP"
  },
  {
    "path": "apps/web/src/app/views/canvas/useCanvasNodeWorkbenchPosition.ts",
    "name": "KEYBOARD_MOVE_STEP"
  },
  {
    "path": "apps/web/src/app/views/canvas/useCanvasNodeWorkbenchPosition.ts",
    "name": "preservePositionReference"
  },
  {
    "path": "apps/web/src/app/views/canvas/useCanvasNodeWorkbenchPosition.ts",
    "name": "readWorkbenchBounds"
  },
  {
    "path": "apps/web/src/app/views/canvas/useCanvasNodeWorkbenchPosition.ts",
    "name": "resolveDimension"
  },
  {
    "path": "apps/web/src/app/views/canvas/useCanvasNodeWorkbenchPosition.ts",
    "name": "resolveKeyboardDelta"
  },
  {
    "path": "apps/web/src/app/views/canvas/useCanvasNodeWorkbenchPosition.ts",
    "name": "useCanvasNodeWorkbenchPosition"
  },
  {
    "path": "apps/web/src/app/views/code/CodeWorkingTreeStatus.tsx",
    "name": "ExtendedCodeWorkingTreeStatusPhase"
  },
  {
    "path": "apps/web/src/app/views/CodeView.tsx",
    "name": "CodeView"
  },
  {
    "path": "apps/web/src/app/views/CodeView.tsx",
    "name": "CodeViewHandle"
  },
  {
    "path": "apps/web/src/app/views/CodeView.tsx",
    "name": "CodeViewProps"
  },
  {
    "path": "packages/@dvt/contracts/src/contracts/dbt-project/DbtYamlDescriptionEdit.v1.ts",
    "name": "ApplyDbtYamlDescriptionEditRequest"
  },
  {
    "path": "packages/@dvt/contracts/src/contracts/dbt-project/DbtYamlDescriptionEdit.v1.ts",
    "name": "ApplyDbtYamlDescriptionEditRequestSchema"
  },
  {
    "path": "packages/@dvt/contracts/src/contracts/dbt-project/DbtYamlDescriptionEdit.v1.ts",
    "name": "DBT_YAML_DESCRIPTION_RESOURCE_TYPE"
  },
  {
    "path": "packages/@dvt/contracts/src/contracts/dbt-project/DbtYamlDescriptionEdit.v1.ts",
    "name": "DbtYamlDescriptionAnalysisReceipt"
  },
  {
    "path": "packages/@dvt/contracts/src/contracts/dbt-project/DbtYamlDescriptionEdit.v1.ts",
    "name": "DbtYamlDescriptionAnalysisReceiptSchema"
  },
  {
    "path": "packages/@dvt/contracts/src/contracts/dbt-project/DbtYamlDescriptionEdit.v1.ts",
    "name": "DbtYamlDescriptionAppliedReceipt"
  },
  {
    "path": "packages/@dvt/contracts/src/contracts/dbt-project/DbtYamlDescriptionEdit.v1.ts",
    "name": "DbtYamlDescriptionAppliedReceiptSchema"
  },
  {
    "path": "packages/@dvt/contracts/src/contracts/dbt-project/DbtYamlDescriptionEdit.v1.ts",
    "name": "DbtYamlDescriptionEditProposal"
  },
  {
    "path": "packages/@dvt/contracts/src/contracts/dbt-project/DbtYamlDescriptionEdit.v1.ts",
    "name": "DbtYamlDescriptionEditProposalSchema"
  },
  {
    "path": "packages/@dvt/contracts/src/contracts/dbt-project/DbtYamlDescriptionEdit.v1.ts",
    "name": "DbtYamlDescriptionResourceIdentity"
  },
  {
    "path": "packages/@dvt/contracts/src/contracts/dbt-project/DbtYamlDescriptionEdit.v1.ts",
    "name": "DbtYamlDescriptionResourceIdentitySchema"
  },
  {
    "path": "packages/@dvt/contracts/src/contracts/dbt-project/DbtYamlDescriptionEdit.v1.ts",
    "name": "DbtYamlDescriptionResourceType"
  },
  {
    "path": "packages/@dvt/contracts/src/contracts/dbt-project/DbtYamlDescriptionEdit.v1.ts",
    "name": "DbtYamlDescriptionRevertedReceipt"
  },
  {
    "path": "packages/@dvt/contracts/src/contracts/dbt-project/DbtYamlDescriptionEdit.v1.ts",
    "name": "DbtYamlDescriptionRevertedReceiptSchema"
  },
  {
    "path": "packages/@dvt/contracts/src/contracts/dbt-project/DbtYamlDescriptionEdit.v1.ts",
    "name": "DescriptionSchema"
  },
  {
    "path": "packages/@dvt/contracts/src/contracts/dbt-project/DbtYamlDescriptionEdit.v1.ts",
    "name": "NonBlankStringSchema"
  },
  {
    "path": "packages/@dvt/contracts/src/contracts/dbt-project/DbtYamlDescriptionEdit.v1.ts",
    "name": "ProposeDbtYamlDescriptionEditRequest"
  },
  {
    "path": "packages/@dvt/contracts/src/contracts/dbt-project/DbtYamlDescriptionEdit.v1.ts",
    "name": "ProposeDbtYamlDescriptionEditRequestSchema"
  },
  {
    "path": "packages/@dvt/contracts/src/contracts/dbt-project/DbtYamlDescriptionEdit.v1.ts",
    "name": "RevertDbtYamlDescriptionEditRequest"
  },
  {
    "path": "packages/@dvt/contracts/src/contracts/dbt-project/DbtYamlDescriptionEdit.v1.ts",
    "name": "RevertDbtYamlDescriptionEditRequestSchema"
  },
  {
    "path": "packages/@dvt/contracts/src/contracts/dbt-project/DbtYamlDescriptionEdit.v1.ts",
    "name": "Sha256HexStringSchema"
  }
]
$symbols$::jsonb) as entry(path text, name text)
),
classified_symbols as (
  select
    symbol_path,
    symbol_name,
    case
      when symbol_path like 'packages/@dvt/contracts/%'
        then 'DbtYamlDescriptionEditContract'
      when symbol_path = 'apps/api/src/application/ports/dbtYamlDescriptionEdit.ts'
        then 'DbtYamlDescriptionApplicationPorts'
      when symbol_path like '%/ProposeDbtYamlDescriptionEditQuery.ts'
        then 'ProposeDbtYamlDescriptionEdit'
      when symbol_path like '%/ApplyDbtYamlDescriptionEditCommand.ts'
        then 'ApplyDbtYamlDescriptionEdit'
      when symbol_path like '%/RevertDbtYamlDescriptionEditCommand.ts'
        then 'RevertDbtYamlDescriptionEdit'
      when symbol_path like '%/DbtYamlDescriptionResourceResolver.ts'
        then 'DbtYamlDescriptionResource'
      when symbol_path like '%/dbtYamlDescriptionEditIntegrity.ts'
        then 'DbtYamlDescriptionIntegrityPolicy'
      when symbol_path like '%/WorkspaceMetadataDbtYamlDescriptionReceiptStore.ts'
        then 'DbtYamlDescriptionReceipt'
      when symbol_path like '%/YamlCstDbtDescriptionMutator.ts'
        then 'DbtYamlDescriptionCstMutation'
      when symbol_path like '%/dbtProjectFileRouteAuthorization.ts'
        then 'DbtProjectFileAuthority'
      when symbol_path like '%/dbtYamlDescriptionEditRouteGroup.ts'
        or symbol_path like '%/dbtYamlDescriptionEditRoutes.ts'
        then 'DbtYamlDescriptionHttpAdapter'
      when symbol_path like '%/projectDbtGraphFromFilesUseCase.ts'
        or symbol_path like '%/dbtManifestProjection.ts'
        then 'DbtProjectGraphProjection'
      when symbol_path like 'apps/web/cypress/%'
        then 'DbtYamlDescriptionStrictBrowserProof'
      when symbol_path like '%/dbtYamlDescriptionEditorModel.ts'
        then 'DbtYamlDescriptionEditorState'
      when symbol_path like '%/DbtYamlDescriptionEditorView.tsx'
        or symbol_path like '%/dbtYamlDescriptionAnalysisPresentation.ts'
        or symbol_path like '%/dbtYamlDescriptionEditorCopy.ts'
        or symbol_path like '%/dbtYamlDescriptionEditorVisualTokens.ts'
        then 'DbtYamlDescriptionEditorView'
      when symbol_path like '%/DbtYamlDescriptionEditor.tsx'
        or symbol_path like '%/useDbtYamlDescriptionEditor.ts'
        then 'DbtYamlDescriptionEditor'
      when symbol_path like '%/ports/dbtYamlDescriptionEdit.ts'
        or symbol_path like '%/services/dbtProject/dbtYamlDescriptionEdit.api.ts'
        then 'DbtYamlDescriptionWebPort'
      when symbol_path like '%/AppServicesContext.tsx'
        then 'ApplicationServicesComposition'
      when symbol_path like '%/nodePropertiesReadModel.ts'
        then 'CanvasNodeWorkbenchReadModel'
      when symbol_path like '%/canvasNodeWorkbenchContribution.ts'
        or symbol_path like '%/dbtYamlDescriptionWorkbenchContribution.tsx'
        then 'CanvasNodeWorkbenchContribution'
      when symbol_path like '%/canvasNodeWorkbenchPositionModel.ts'
        or symbol_path like '%/useCanvasNodeWorkbenchPosition.ts'
        then 'CanvasNodeWorkbenchPosition'
      when symbol_path like '%/canvasNodeWorkbenchVisualTokens.ts'
        or symbol_path like '%/CanvasNodeWorkbenchPanel.tsx'
        then 'CanvasNodeWorkbench'
      when symbol_path like '%/CanvasViewport.tsx'
        or symbol_path like '%/canvasNodeFloatingToolbarModel.ts'
        then 'NodeFloatingToolbar'
      when symbol_path like '%/CodeView.tsx'
        or symbol_path like '%/SqlContextWorkbench.tsx'
        or symbol_path like '%/dbtProjectFileCodeWorkbench.tsx'
        or symbol_path like '%/sqlContextWorkbenchModel.ts'
        or symbol_path like '%/sqlContextWorkbenchVisualTokens.ts'
        or symbol_path like '%/CodeWorkingTreeStatus.tsx'
        then 'DbtProjectCodeWorkbench'
      else 'DbtYamlDescriptionEdit'
    end as ddd_owner,
    case
      when symbol_name = 'review'
        or symbol_name like 'Propose%'
        or symbol_name like 'IPropose%'
        or symbol_path like '%/ProposeDbtYamlDescriptionEditQuery.ts'
        or symbol_name in (
          'DbtYamlDescriptionDocumentInvalidError',
          'DbtYamlDescriptionResourceAmbiguousError',
          'DbtYamlDescriptionResourceNotFoundError',
          'DbtYamlDescriptionResourceUnsupportedError',
          'DbtYamlDescriptionResourceContext',
          'buildFocusedUnifiedDiff',
          'proposalDigest'
        )
        then jsonb_build_array('ProposeDbtYamlDescriptionEdit')
      when symbol_name = 'apply'
        or symbol_name like 'Apply%'
        or symbol_name like 'IApply%'
        or symbol_path like '%/ApplyDbtYamlDescriptionEditCommand.ts'
        or symbol_name in ('DbtYamlDescriptionProposalMismatchError', 'assertProposalIntegrity')
        then jsonb_build_array('ApplyDbtYamlDescriptionEdit')
      when symbol_name = 'revert'
        or symbol_name like 'Revert%'
        or symbol_name like 'IRevert%'
        or symbol_path like '%/RevertDbtYamlDescriptionEditCommand.ts'
        then jsonb_build_array('RevertDbtYamlDescriptionEdit')
      when symbol_path like '%/WorkspaceMetadataDbtYamlDescriptionReceiptStore.ts'
        or symbol_name in (
          'DbtYamlDescriptionPersistenceInvariantError',
          'DbtYamlDescriptionReceiptInvalidError',
          'DbtYamlDescriptionRevisionConflictError',
          'IDbtYamlDescriptionReceiptStore',
          'batchIdempotencyKey',
          'operationReceiptId',
          'operationRequestHash'
        )
        then jsonb_build_array(
          'ApplyDbtYamlDescriptionEdit',
          'RevertDbtYamlDescriptionEdit'
        )
      when symbol_path like '%/DbtYamlDescriptionResourceResolver.ts'
        or symbol_name = 'IDbtYamlDescriptionResourceResolver'
        then jsonb_build_array(
          'ProposeDbtYamlDescriptionEdit',
          'ApplyDbtYamlDescriptionEdit'
        )
      else jsonb_build_array(
        'ProposeDbtYamlDescriptionEdit',
        'ApplyDbtYamlDescriptionEdit',
        'RevertDbtYamlDescriptionEdit'
      )
    end as cq_rails,
    case
      when symbol_path like 'packages/@dvt/contracts/%'
        then jsonb_build_array(
          'packages/@dvt/contracts/test/dbt-yaml-description-edit.contract.test.ts'
        )
      when symbol_path = 'apps/api/src/application/ports/dbtYamlDescriptionEdit.ts'
        then jsonb_build_array(
          'apps/api/test/application/services/dbtYamlDescriptionEdit/ProposeDbtYamlDescriptionEditQuery.test.ts',
          'apps/api/test/application/services/dbtYamlDescriptionEdit/ApplyDbtYamlDescriptionEditCommand.test.ts',
          'apps/api/test/application/services/dbtYamlDescriptionEdit/RevertDbtYamlDescriptionEditCommand.test.ts'
        )
      when symbol_path like '%/ProposeDbtYamlDescriptionEditQuery.ts'
        then jsonb_build_array(
          'apps/api/test/application/services/dbtYamlDescriptionEdit/ProposeDbtYamlDescriptionEditQuery.test.ts'
        )
      when symbol_path like '%/ApplyDbtYamlDescriptionEditCommand.ts'
        then jsonb_build_array(
          'apps/api/test/application/services/dbtYamlDescriptionEdit/ApplyDbtYamlDescriptionEditCommand.test.ts'
        )
      when symbol_path like '%/RevertDbtYamlDescriptionEditCommand.ts'
        then jsonb_build_array(
          'apps/api/test/application/services/dbtYamlDescriptionEdit/RevertDbtYamlDescriptionEditCommand.test.ts'
        )
      when symbol_path like '%/DbtYamlDescriptionResourceResolver.ts'
        then jsonb_build_array(
          'apps/api/test/application/services/dbtYamlDescriptionEdit/DbtYamlDescriptionResourceResolver.test.ts'
        )
      when symbol_path like '%/dbtYamlDescriptionEditIntegrity.ts'
        then jsonb_build_array(
          'apps/api/test/application/services/dbtYamlDescriptionEdit/dbtYamlDescriptionEditIntegrity.test.ts'
        )
      when symbol_path like '%/projectDbtGraphFromFilesUseCase.ts'
        then jsonb_build_array(
          'apps/api/test/application/projectDbtGraphFromFilesUseCase.test.ts'
        )
      when symbol_path like '%/dbtProjectFileRouteAuthorization.ts'
        or symbol_path like '%/dbtYamlDescriptionEditRouteGroup.ts'
        or symbol_path like '%/dbtYamlDescriptionEditRoutes.ts'
        then jsonb_build_array(
          'apps/api/test/entrypoints/http/dbtYamlDescriptionEditRoutes.test.ts'
        )
      when symbol_path like '%/dbtManifestProjection.ts'
        then jsonb_build_array(
          'apps/api/test/infrastructure/dbt/dbtManifestProjection.test.ts'
        )
      when symbol_path like '%/WorkspaceMetadataDbtYamlDescriptionReceiptStore.ts'
        then jsonb_build_array(
          'apps/api/test/infrastructure/dbtYamlDescriptionEdit/WorkspaceMetadataDbtYamlDescriptionReceiptStore.test.ts'
        )
      when symbol_path like '%/YamlCstDbtDescriptionMutator.ts'
        then jsonb_build_array(
          'apps/api/test/infrastructure/dbtYamlDescriptionEdit/YamlCstDbtDescriptionMutator.test.ts'
        )
      when symbol_path like 'apps/web/cypress/%'
        then jsonb_build_array(
          'apps/web/cypress/e2e/dbt/dbt-project-yaml-description-edit-live.cy.ts'
        )
      when symbol_path like '%/DbtYamlDescriptionEditorView.tsx'
        then jsonb_build_array(
          'apps/web/src/app/components/dbtYamlDescriptionEditor/DbtYamlDescriptionEditorView.test.tsx'
        )
      when symbol_path like '%/dbtYamlDescriptionAnalysisPresentation.ts'
        then jsonb_build_array(
          'apps/web/src/app/components/dbtYamlDescriptionEditor/dbtYamlDescriptionAnalysisPresentation.test.ts'
        )
      when symbol_path like '%/dbtYamlDescriptionEditorCopy.ts'
        then jsonb_build_array(
          'apps/web/src/app/components/dbtYamlDescriptionEditor/dbtYamlDescriptionEditorCopy.test.ts'
        )
      when symbol_path like '%/dbtYamlDescriptionEditorModel.ts'
        then jsonb_build_array(
          'apps/web/src/app/components/dbtYamlDescriptionEditor/dbtYamlDescriptionEditorModel.test.ts'
        )
      when symbol_path like '%/DbtYamlDescriptionEditor.tsx'
        or symbol_path like '%/useDbtYamlDescriptionEditor.ts'
        or symbol_path like '%/dbtYamlDescriptionEditorVisualTokens.ts'
        then jsonb_build_array(
          'apps/web/src/app/components/dbtYamlDescriptionEditor/DbtYamlDescriptionEditor.test.tsx'
        )
      when symbol_path like '%/nodePropertiesReadModel.ts'
        then jsonb_build_array(
          'apps/web/src/app/components/inspector/NodePropertySectionView.test.tsx'
        )
      when symbol_path like '%/services/dbtProject/dbtYamlDescriptionEdit.api.ts'
        or symbol_path like '%/ports/dbtYamlDescriptionEdit.ts'
        or symbol_path like '%/AppServicesContext.tsx'
        then jsonb_build_array(
          'apps/web/src/app/services/dbtProject/dbtYamlDescriptionEdit.api.test.ts',
          'apps/web/src/app/components/dbtYamlDescriptionEditor/DbtYamlDescriptionEditor.test.tsx'
        )
      when symbol_path like '%/CodeView.tsx'
        then jsonb_build_array('apps/web/src/app/views/CodeView.test.tsx')
      when symbol_path like '%/CanvasNodeWorkbenchPanel.tsx'
        then jsonb_build_array(
          'apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.test.tsx',
          'apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.contributions.test.tsx'
        )
      when symbol_path like '%/CanvasViewport.tsx'
        then jsonb_build_array(
          'apps/web/src/app/views/canvas/CanvasViewport.nodeFloatingToolbar.test.tsx'
        )
      when symbol_path like '%/SqlContextWorkbench.tsx'
        or symbol_path like '%/sqlContextWorkbenchModel.ts'
        or symbol_path like '%/sqlContextWorkbenchVisualTokens.ts'
        then jsonb_build_array(
          'apps/web/src/app/views/canvas/SqlContextWorkbench.test.tsx'
        )
      when symbol_path like '%/canvasNodeFloatingToolbarModel.ts'
        then jsonb_build_array(
          'apps/web/src/app/views/canvas/canvasNodeFloatingToolbarModel.test.ts'
        )
      when symbol_path like '%/canvasNodeWorkbenchContribution.ts'
        then jsonb_build_array(
          'apps/web/src/app/views/canvas/canvasNodeWorkbenchContribution.test.ts'
        )
      when symbol_path like '%/canvasNodeWorkbenchPositionModel.ts'
        then jsonb_build_array(
          'apps/web/src/app/views/canvas/canvasNodeWorkbenchPositionModel.test.ts'
        )
      when symbol_path like '%/useCanvasNodeWorkbenchPosition.ts'
        or symbol_path like '%/canvasNodeWorkbenchVisualTokens.ts'
        then jsonb_build_array(
          'apps/web/src/app/views/canvas/CanvasNodeWorkbenchOverlay.test.tsx',
          'apps/web/src/app/views/canvas/canvasNodeWorkbenchPositionModel.test.ts'
        )
      when symbol_path like '%/dbtProjectFileCodeWorkbench.tsx'
        then jsonb_build_array(
          'apps/web/src/app/views/canvas/dbtProjectFileCodeWorkbench.test.tsx'
        )
      when symbol_path like '%/dbtYamlDescriptionWorkbenchContribution.tsx'
        then jsonb_build_array(
          'apps/web/src/app/views/canvas/dbtYamlDescriptionWorkbenchContribution.test.tsx'
        )
      when symbol_path like '%/CodeWorkingTreeStatus.tsx'
        then jsonb_build_array(
          'apps/web/src/app/views/code/CodeWorkingTreeStatus.test.tsx'
        )
      else jsonb_build_array(
        'apps/web/cypress/e2e/dbt/dbt-project-yaml-description-edit-live.cy.ts'
      )
    end as unit_tests,
    case
      when symbol_path like 'packages/@dvt/contracts/%'
        then 'pnpm --filter @dvt/contracts test'
      when symbol_path like 'apps/api/%'
        then 'pnpm --filter dvt-api test'
      when symbol_path like 'apps/web/cypress/%'
        then 'node scripts/run-selected-closure-live-proof.cjs --spec apps/web/cypress/e2e/dbt/dbt-project-yaml-description-edit-live.cy.ts'
      else 'pnpm --filter @dvt/web test:unit:run'
    end as architecture_guard,
    case
      when symbol_path like 'packages/@dvt/contracts/%'
        or symbol_path like '%/ports/%'
        then jsonb_build_array('boundary ownership', 'parallel contract prevention')
      when symbol_path like 'apps/api/src/application/services/%'
        then jsonb_build_array('single responsibility', 'transaction script decomposition')
      when symbol_path like 'apps/api/src/infrastructure/%'
        or symbol_path like 'apps/api/src/entrypoints/%'
        then jsonb_build_array('ports and adapters', 'boundary ownership')
      when symbol_path like 'apps/web/cypress/%'
        then jsonb_build_array('strict browser evidence', 'fake success prevention')
      when symbol_path like 'apps/web/%'
        then jsonb_build_array('presentation-domain separation', 'divergent change prevention')
      else jsonb_build_array('single responsibility', 'divergent change prevention')
    end as fowler_signals
  from symbol_catalog
),
symbol_manifest as (
  select
    jsonb_agg(
      jsonb_build_object(
        'name', symbol_name,
        'path', symbol_path,
        'dddOwner', ddd_owner,
        'cqRails', cq_rails,
        'fowlerSignals', fowler_signals,
        'architectureGuard', architecture_guard,
        'cypressCoverage', 'apps/web/cypress/e2e/dbt/dbt-project-yaml-description-edit-live.cy.ts',
        'unitTests', unit_tests
      )
      order by symbol_path, symbol_name
    ) as symbols,
    jsonb_agg(to_jsonb(symbol_path || '#' || symbol_name) order by symbol_path, symbol_name)
      as symbol_refs,
    (
      select jsonb_agg(to_jsonb(path) order by path)
      from (
        select distinct symbol_path as path
        from classified_symbols
      ) implementation_paths
    ) as implementation_refs,
    (
      select jsonb_agg(to_jsonb(path) order by path)
      from (
        select distinct symbol_path as path
        from classified_symbols
        union
        select distinct test_path.value as path
        from classified_symbols classified
        cross join lateral jsonb_array_elements_text(classified.unit_tests) test_path(value)
        union
        select 'docs/evidence/ED-20260717-dbt-yaml-description-roundtrip.md'
        union
        select 'docs/planning/proposals/mandatory/frontend-and-ux/dbt-project-roundtrip-product-plan-20260527.md'
        union
        select 'docs/risk-register/quality/R-20260717-DBT-YAML-DESCRIPTION-ROUNDTRIP.yaml'
        union
        select 'tools/planning-db/migrations/736_dbt_yaml_description_edit_component_design.sql'
        union
        select 'tools/planning-db/migrations/737_code_working_tree_dbt_reanalysis_design.sql'
        union
        select 'tools/planning-db/migrations/738_dbt_yaml_description_roundtrip_closeout.sql'
        union
        select 'tools/planning-db/migrations/739_dbt_yaml_description_component_maturity.sql'
        union
        select 'tools/planning-db/migrations/740_dbt_yaml_description_hard_fowler_corrections.sql'
        union
        select 'tools/planning-db/migrations/741_dbt_yaml_description_component_ownership_reconciliation.sql'
        union
        select 'tools/planning-db/migrations/742_dbt_yaml_description_integrity_evidence.sql'
        union
        select 'tools/planning-db/migrations/743_dbt_yaml_description_hard_fowler_closeout.sql'
        union
        select 'tools/planning-db/migrations/744_dbt_yaml_description_feature_mechanization_closeout.sql'
      ) allowed_paths
    ) as allowed_surfaces
  from classified_symbols
),
manifest_base as (
  select jsonb_build_object(
    'version', 1,
    'featureId', 'E-DBT-PROJECT-ROUNDTRIP-P5-YAML-DESCRIPTION-1',
    'mechanizationStatus', 'implemented',
    'noHumanDecisionsRemaining', true,
    'implementationPlan', 'Edit one authoritative DBT YAML description through a proposal query and explicit apply/revert commands, preserving unrelated bytes, revalidating project authority, refreshing the DBT graph, and exposing the result through one contextual workbench.',
    'componentGuides', jsonb_build_array(
      'docs/planning/proposals/mandatory/frontend-and-ux/dbt-project-roundtrip-product-plan-20260527.md',
      'docs/evidence/ED-20260717-dbt-yaml-description-roundtrip.md'
    ),
    'userStories', jsonb_build_array(
      'A DBT author can inspect and edit the selected resource description without leaving the graph or losing unrelated YAML formatting.',
      'A DBT author can review an exact proposal, apply it conditionally, run the authoritative project, reopen it, and revert through a server-owned receipt.',
      'A keyboard or pointer user can move the contextual workbench without losing access to the selected node or viewport.'
    ),
    'governingSources', jsonb_build_array(
      'AGENTS.md',
      'docs/planning/status/governance-document-rule-inventory.md',
      'docs/architecture/adr/ADR-0060-dbt-project-authoring-authority.md',
      'docs/architecture/command-query-rail-governance.md',
      'docs/architecture/fowler-opportunity-planning-governance.md',
      'docs/planning/proposals/mandatory/frontend-and-ux/dbt-project-roundtrip-product-plan-20260527.md'
    ),
    'allowedImplementationSurfaces', manifest.allowed_surfaces,
    'forbiddenImplementationSurfaces', jsonb_build_array(
      'apps/api/src/application/services/dbtYamlDescriptionEdit/DbtYamlDescriptionEditTransaction.ts',
      'apps/web/src/app/stores/**',
      'buzon/**'
    ),
    'domainObjects', jsonb_build_array(
      jsonb_build_object('name', 'ProposeDbtYamlDescriptionEdit', 'type', 'query', 'owner', 'DBT project authoring'),
      jsonb_build_object('name', 'ApplyDbtYamlDescriptionEdit', 'type', 'command', 'owner', 'DBT project authoring'),
      jsonb_build_object('name', 'RevertDbtYamlDescriptionEdit', 'type', 'command', 'owner', 'DBT project authoring'),
      jsonb_build_object('name', 'DbtYamlDescriptionResource', 'type', 'authority context', 'owner', 'DBT project authoring'),
      jsonb_build_object('name', 'DbtYamlDescriptionReceipt', 'type', 'immutable operation receipt', 'owner', 'DBT project authoring'),
      jsonb_build_object('name', 'CanvasNodeWorkbenchPosition', 'type', 'presentation model', 'owner', 'Canvas workbench')
    ),
    'fowlerSignals', jsonb_build_array(
      'transaction script decomposition',
      'divergent change prevention',
      'parallel contract prevention',
      'presentation-domain separation',
      'ports and adapters'
    ),
    'architectureGuards', jsonb_build_array(
      jsonb_build_object('name', 'contract suite', 'command', 'pnpm --filter @dvt/contracts test'),
      jsonb_build_object('name', 'API suite', 'command', 'pnpm --filter dvt-api test'),
      jsonb_build_object('name', 'web unit suite', 'command', 'pnpm --filter @dvt/web test:unit:run'),
      jsonb_build_object('name', 'feature mechanization', 'command', 'pnpm docs:feature-mechanization:implementation')
    ),
    'cypressFlows', jsonb_build_array(
      jsonb_build_object(
        'name', 'DBT YAML description strict live roundtrip',
        'command', 'node scripts/run-selected-closure-live-proof.cjs --spec apps/web/cypress/e2e/dbt/dbt-project-yaml-description-edit-live.cy.ts'
      )
    ),
    'completionGate', jsonb_build_array(
      'pnpm planning:db:migrate',
      'pnpm test:planning:db:migrations',
      'pnpm --filter @dvt/contracts test',
      'pnpm --filter dvt-api test',
      'pnpm --filter @dvt/web typecheck',
      'pnpm --filter @dvt/web lint',
      'node scripts/run-selected-closure-live-proof.cjs --spec apps/web/cypress/e2e/dbt/dbt-project-yaml-description-edit-live.cy.ts',
      'pnpm docs:feature-mechanization:implementation',
      'pnpm verify:prepush'
    ),
    'symbols', manifest.symbols
  ) as value
  from symbol_manifest manifest
)
update planning_query_store.feature_mechanization_local_rails rail
set
  symbol_refs = manifest.symbol_refs,
  implementation_refs = manifest.implementation_refs,
  documentation_refs = jsonb_build_array(
    'docs/planning/proposals/mandatory/frontend-and-ux/dbt-project-roundtrip-product-plan-20260527.md',
    'docs/evidence/ED-20260717-dbt-yaml-description-roundtrip.md'
  ),
  governing_sources = jsonb_build_array(
    'AGENTS.md',
    'docs/planning/status/governance-document-rule-inventory.md',
    'docs/architecture/adr/ADR-0060-dbt-project-authoring-authority.md',
    'docs/architecture/command-query-rail-governance.md',
    'docs/architecture/fowler-opportunity-planning-governance.md'
  ),
  allowed_implementation_surfaces = manifest.allowed_surfaces,
  architecture_guards = jsonb_build_array(
    'pnpm --filter @dvt/contracts test',
    'pnpm --filter dvt-api test',
    'pnpm --filter @dvt/web test:unit:run',
    'pnpm docs:feature-mechanization:implementation',
    'node scripts/run-selected-closure-live-proof.cjs --spec apps/web/cypress/e2e/dbt/dbt-project-yaml-description-edit-live.cy.ts'
  ),
  completion_gate = jsonb_build_array(
    'pnpm planning:db:migrate',
    'pnpm test:planning:db:migrations',
    'pnpm docs:feature-mechanization:implementation',
    'pnpm verify:prepush'
  ),
  raw_rail = coalesce(rail.raw_rail, '{}'::jsonb) || jsonb_build_object(
    'name', rail.rail_name,
    'type', rail.rail_type,
    'status', 'implemented',
    'dddOwner', rail.ddd_owner,
    'boundedContext', 'DBT project authoring',
    'applicationPort', case rail.rail_name
      when 'ProposeDbtYamlDescriptionEdit' then 'IProposeDbtYamlDescriptionEditQuery.propose'
      when 'ApplyDbtYamlDescriptionEdit' then 'IApplyDbtYamlDescriptionEditCommand.apply'
      else 'IRevertDbtYamlDescriptionEditCommand.revert'
    end,
    'adapterSurface', 'registerDbtYamlDescriptionEditRoutes',
    'authorization', 'The protected route and resource resolver revalidate workspace, canvas, root-package, file, resource, revision, and receipt authority.',
    'negativeTests', case rail.rail_name
      when 'ProposeDbtYamlDescriptionEdit' then jsonb_build_array('missing resource', 'ambiguous resource', 'invalid YAML', 'unrelated byte mutation')
      when 'ApplyDbtYamlDescriptionEdit' then jsonb_build_array('proposal mismatch', 'revision conflict', 'persistence mismatch', 're-analysis failure')
      else jsonb_build_array('invalid receipt', 'intervening mutation', 'persistence mismatch', 're-analysis failure')
    end
  ),
  raw_manifest = base.value || jsonb_build_object(
    'commandQueryRails', jsonb_build_array(jsonb_build_object(
      'name', rail.rail_name,
      'type', rail.rail_type,
      'status', 'implemented',
      'dddOwner', rail.ddd_owner
    )),
    'redGreenCycles', jsonb_build_array(jsonb_build_object(
      'id', lower(rail.rail_name) || '-hard-fowler-roundtrip',
      'redTest', case rail.rail_name
        when 'ProposeDbtYamlDescriptionEdit' then 'pnpm --filter dvt-api exec vitest run --config vitest.config.ts test/application/services/dbtYamlDescriptionEdit/ProposeDbtYamlDescriptionEditQuery.test.ts'
        when 'ApplyDbtYamlDescriptionEdit' then 'pnpm --filter dvt-api exec vitest run --config vitest.config.ts test/application/services/dbtYamlDescriptionEdit/ApplyDbtYamlDescriptionEditCommand.test.ts'
        else 'pnpm --filter dvt-api exec vitest run --config vitest.config.ts test/application/services/dbtYamlDescriptionEdit/RevertDbtYamlDescriptionEditCommand.test.ts'
      end,
      'expectedFailure', case rail.rail_name
        when 'ProposeDbtYamlDescriptionEdit' then 'A proposal could mutate the file, target an ambiguous resource, or alter unrelated YAML bytes.'
        when 'ApplyDbtYamlDescriptionEdit' then 'A stale or untrusted proposal could overwrite a newer authoritative DBT YAML revision without a durable receipt.'
        else 'A client-supplied inverse patch or stale receipt could restore the wrong DBT YAML revision.'
      end,
      'patchSurfaces', case rail.rail_name
        when 'ProposeDbtYamlDescriptionEdit' then jsonb_build_array(
          'apps/api/src/application/services/dbtYamlDescriptionEdit/ProposeDbtYamlDescriptionEditQuery.ts',
          'apps/api/src/application/services/dbtYamlDescriptionEdit/DbtYamlDescriptionResourceResolver.ts',
          'apps/api/src/infrastructure/dbtYamlDescriptionEdit/YamlCstDbtDescriptionMutator.ts'
        )
        when 'ApplyDbtYamlDescriptionEdit' then jsonb_build_array(
          'apps/api/src/application/services/dbtYamlDescriptionEdit/ApplyDbtYamlDescriptionEditCommand.ts',
          'apps/api/src/application/services/dbtYamlDescriptionEdit/dbtYamlDescriptionEditIntegrity.ts',
          'apps/api/src/infrastructure/dbtYamlDescriptionEdit/WorkspaceMetadataDbtYamlDescriptionReceiptStore.ts'
        )
        else jsonb_build_array(
          'apps/api/src/application/services/dbtYamlDescriptionEdit/RevertDbtYamlDescriptionEditCommand.ts',
          'apps/api/src/application/services/dbtYamlDescriptionEdit/dbtYamlDescriptionEditIntegrity.ts',
          'apps/api/src/infrastructure/dbtYamlDescriptionEdit/WorkspaceMetadataDbtYamlDescriptionReceiptStore.ts'
        )
      end,
      'greenTest', case rail.rail_name
        when 'ProposeDbtYamlDescriptionEdit' then 'pnpm --filter dvt-api exec vitest run --config vitest.config.ts test/application/services/dbtYamlDescriptionEdit/ProposeDbtYamlDescriptionEditQuery.test.ts'
        when 'ApplyDbtYamlDescriptionEdit' then 'pnpm --filter dvt-api exec vitest run --config vitest.config.ts test/application/services/dbtYamlDescriptionEdit/ApplyDbtYamlDescriptionEditCommand.test.ts'
        else 'pnpm --filter dvt-api exec vitest run --config vitest.config.ts test/application/services/dbtYamlDescriptionEdit/RevertDbtYamlDescriptionEditCommand.test.ts'
      end
    ))
  ),
  source_path = 'tools/planning-db/migrations/744_dbt_yaml_description_feature_mechanization_closeout.sql',
  source_content_sha256 = repeat(md5(rail.rail_name || ':mechanization-complete:744'), 2),
  revision = rail.revision + 1,
  updated_at = now()
from symbol_manifest manifest
cross join manifest_base base
where rail.feature_id = 'E-DBT-PROJECT-ROUNDTRIP-P5-YAML-DESCRIPTION-1'
  and rail.rail_name in (
    'ProposeDbtYamlDescriptionEdit',
    'ApplyDbtYamlDescriptionEdit',
    'RevertDbtYamlDescriptionEdit'
  );

do $$
declare
  rail_count integer;
  symbol_count integer;
begin
  select count(*) into rail_count
  from planning_query_store.feature_mechanization_local_rails
  where feature_id = 'E-DBT-PROJECT-ROUNDTRIP-P5-YAML-DESCRIPTION-1'
    and source_path = 'tools/planning-db/migrations/744_dbt_yaml_description_feature_mechanization_closeout.sql'
    and rail_status = 'implemented'
    and mechanization_status = 'implemented';

  if rail_count <> 3 then
    raise exception 'DBT YAML description feature must expose exactly three implemented local rails, found %', rail_count;
  end if;

  if exists (
    select 1
    from planning_query_store.feature_mechanization_local_rails rail
    where rail.feature_id = 'E-DBT-PROJECT-ROUNDTRIP-P5-YAML-DESCRIPTION-1'
      and (
        rail.ddd_owner = 'DbtYamlDescriptionEditTransaction'
        or rail.raw_rail->>'dddOwner' = 'DbtYamlDescriptionEditTransaction'
        or exists (
          select 1
          from jsonb_array_elements(rail.raw_manifest->'commandQueryRails') cq(value)
          where cq.value->>'dddOwner' = 'DbtYamlDescriptionEditTransaction'
        )
        or exists (
          select 1
          from jsonb_array_elements(rail.raw_manifest->'symbols') symbol(value)
          where symbol.value->>'dddOwner' = 'DbtYamlDescriptionEditTransaction'
        )
      )
  ) then
    raise exception 'Superseded DBT YAML description transaction retains an executable feature claim';
  end if;

  if exists (
    select 1
    from planning_query_store.feature_mechanization_local_rails rail
    cross join lateral jsonb_array_elements(rail.raw_manifest->'symbols') symbol(value)
    where rail.feature_id = 'E-DBT-PROJECT-ROUNDTRIP-P5-YAML-DESCRIPTION-1'
      and (
        coalesce(symbol.value->>'name', '') = ''
        or coalesce(symbol.value->>'path', '') = ''
        or coalesce(symbol.value->>'dddOwner', '') = ''
        or jsonb_array_length(coalesce(symbol.value->'cqRails', '[]'::jsonb)) = 0
        or jsonb_array_length(coalesce(symbol.value->'fowlerSignals', '[]'::jsonb)) = 0
        or coalesce(symbol.value->>'architectureGuard', '') = ''
        or coalesce(symbol.value->>'cypressCoverage', '') = ''
        or jsonb_array_length(coalesce(symbol.value->'unitTests', '[]'::jsonb)) = 0
      )
  ) then
    raise exception 'DBT YAML description feature contains an incomplete symbol declaration';
  end if;

  if exists (
    select 1
    from planning_query_store.feature_mechanization_local_rails rail
    cross join lateral jsonb_array_elements(rail.raw_manifest->'redGreenCycles') cycle(value)
    where rail.feature_id = 'E-DBT-PROJECT-ROUNDTRIP-P5-YAML-DESCRIPTION-1'
      and (
        coalesce(cycle.value->>'id', '') = ''
        or coalesce(cycle.value->>'redTest', '') = ''
        or coalesce(cycle.value->>'expectedFailure', '') = ''
        or jsonb_array_length(coalesce(cycle.value->'patchSurfaces', '[]'::jsonb)) = 0
        or coalesce(cycle.value->>'greenTest', '') = ''
      )
  ) then
    raise exception 'DBT YAML description feature contains an incomplete red-green cycle';
  end if;

  select count(*) into symbol_count
  from (
    select distinct symbol.value->>'path' as path, symbol.value->>'name' as name
    from planning_query_store.feature_mechanization_local_rails rail
    cross join lateral jsonb_array_elements(rail.raw_manifest->'symbols') symbol(value)
    where rail.feature_id = 'E-DBT-PROJECT-ROUNDTRIP-P5-YAML-DESCRIPTION-1'
  ) symbols;

  if symbol_count <> 208 then
    raise exception 'DBT YAML description feature must declare 208 unique symbols, found %', symbol_count;
  end if;

  if exists (
    select 1
    from planning_query_store.feature_mechanization_local_rails rail
    where rail.feature_id = 'E-DBT-PROJECT-ROUNDTRIP-P5-YAML-DESCRIPTION-1'
      and (
        not (rail.raw_manifest->'governingSources' ? 'docs/architecture/command-query-rail-governance.md')
        or not (rail.raw_manifest->'governingSources' ? 'docs/architecture/fowler-opportunity-planning-governance.md')
        or not (rail.raw_manifest->'completionGate' ? 'pnpm verify:prepush')
      )
  ) then
    raise exception 'DBT YAML description feature lacks mandatory governance or closeout gates';
  end if;

  if exists (
    select 1
    from planning_query_store.feature_mechanization_local_rails rail
    where rail.feature_id = 'E-DBT-PROJECT-ROUNDTRIP-P5-YAML-DESCRIPTION-1'
      and (
        (rail.rail_name = 'ProposeDbtYamlDescriptionEdit' and (rail.rail_type <> 'query' or rail.ddd_owner <> 'ProposeDbtYamlDescriptionEdit'))
        or (rail.rail_name = 'ApplyDbtYamlDescriptionEdit' and (rail.rail_type <> 'command' or rail.ddd_owner <> 'ApplyDbtYamlDescriptionEdit'))
        or (rail.rail_name = 'RevertDbtYamlDescriptionEdit' and (rail.rail_type <> 'command' or rail.ddd_owner <> 'RevertDbtYamlDescriptionEdit'))
      )
  ) then
    raise exception 'DBT YAML description CQ rail ownership drifted from canonical application objects';
  end if;
end
$$;
