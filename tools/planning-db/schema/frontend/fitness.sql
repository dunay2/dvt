--
-- Name: canvas_component_registry_drift_query; Type: VIEW; Schema: planning_query_store; Owner: -
--

CREATE VIEW planning_query_store.canvas_component_registry_drift_query AS
 WITH canvas_component_registry_ui_surface_paths(file_path, surface_role, expected_component_id) AS (
         VALUES ('apps/web/src/app/components/canvas/CanvasNodeShell.tsx'::text,'canvas-node-shell'::text,'web.component.canvas.CanvasNodeShell'::text), ('apps/web/src/app/components/canvas/CanvasNodeShell.module.css'::text,'canvas-node-shell-style'::text,'web.component.canvas.CanvasNodeShell'::text), ('apps/web/src/app/components/canvas/CanvasNodePortHandle.tsx'::text,'canvas-node-port-handle'::text,'web.component.canvas.CanvasNodePortHandle'::text), ('apps/web/src/app/components/canvas/DbtNodeComponent.module.css'::text,'retired-node-card-style'::text,'web.component.canvas.DbtNodeCard'::text), ('apps/web/src/app/components/canvas/DbtNodeComponent.tsx'::text,'node-card'::text,'web.component.canvas.DbtNodeCard'::text), ('apps/web/src/app/components/inspector/NodePropertiesTabs.tsx'::text,'node-workbench'::text,'web.component.canvas.NodeWorkbench'::text), ('apps/web/src/app/components/inspector/NodePropertySectionView.tsx'::text,'node-workbench'::text,'web.component.canvas.NodeWorkbench'::text), ('apps/web/src/app/components/shell/OperationalDrawerPanelPrimitives.tsx'::text,'bottom-drawer'::text,'web.component.shell.BottomOperationalDrawer'::text), ('apps/web/src/app/components/sourceImportWizard/ConnectionStep.tsx'::text,'source-import'::text,'web.component.canvas.SourceImportDialog'::text), ('apps/web/src/app/components/sourceImportWizard/GroupingStep.tsx'::text,'source-import'::text,'web.component.canvas.SourceImportDialog'::text), ('apps/web/src/app/components/sourceImportWizard/OptionsStep.tsx'::text,'source-import'::text,'web.component.canvas.SourceImportDialog'::text), ('apps/web/src/app/components/sourceImportWizard/ResultStep.tsx'::text,'source-import'::text,'web.component.canvas.SourceImportDialog'::text), ('apps/web/src/app/components/sourceImportWizard/ReviewStep.tsx'::text,'source-import'::text,'web.component.canvas.SourceImportDialog'::text), ('apps/web/src/app/components/sourceImportWizard/SelectionStep.tsx'::text,'source-import'::text,'web.component.canvas.SourceImportDialog'::text), ('apps/web/src/app/components/sourceImportWizard/SourceImportMetadataPanel.tsx'::text,'source-import'::text,'web.component.canvas.SourceImportDialog'::text), ('apps/web/src/app/components/sourceImportWizard/WizardProgress.tsx'::text,'source-import'::text,'web.component.canvas.SourceImportDialog'::text), ('apps/web/src/app/components/sourceImportWizard/WizardStepContent.tsx'::text,'source-import'::text,'web.component.canvas.SourceImportDialog'::text), ('apps/web/src/app/components/sourceImportWizard/useSourceImportWizard.ts'::text,'source-import-presenter'::text,'web.component.canvas.SourceImportDialog'::text), ('apps/web/src/app/components/sourceImportWizard/useSourceImportWizardDataLoaders.ts'::text,'source-import-presenter'::text,'web.component.canvas.SourceImportDialog'::text), ('apps/web/src/app/views/canvas/CanvasAddNodePalette.tsx'::text,'legacy-palette'::text,'web.component.canvas.LegacyCanvasPalette'::text), ('apps/web/src/app/views/canvas/canvasPalette.ts'::text,'canvas-viewport-style'::text,'web.component.canvas.CanvasViewport'::text), ('apps/web/src/app/views/canvas/CanvasShellMainPanel.tsx'::text,'shell-chrome'::text,'web.component.canvas.CanvasShellChrome'::text), ('apps/web/src/app/views/canvas/canvasShellChromeCommandsBuilder.ts'::text,'shell-chrome-presenter'::text,'web.component.canvas.CanvasShellChrome'::text), ('apps/web/src/app/views/canvas/canvasShellChromeStateBuilder.ts'::text,'shell-chrome-presenter'::text,'web.component.canvas.CanvasShellChrome'::text), ('apps/web/src/app/views/canvas/CanvasToolbarPrimaryControls.tsx'::text,'shell-chrome'::text,'web.component.canvas.CanvasShellChrome'::text), ('apps/web/src/app/views/canvas/CanvasWorkspaceMenuControls.tsx'::text,'shell-chrome'::text,'web.component.canvas.CanvasShellChrome'::text), ('apps/web/src/app/views/canvas/CanvasWorkbenchTabStrip.tsx'::text,'shell-chrome'::text,'web.component.canvas.CanvasShellChrome'::text), ('apps/web/src/app/views/canvas/CanvasContextMenuLayer.tsx'::text,'canvas-context-menu'::text,'web.component.canvas.CanvasContextMenu'::text), ('apps/web/src/app/views/canvas/CanvasContextMenuPrimitives.tsx'::text,'canvas-context-menu'::text,'web.component.canvas.CanvasContextMenu'::text), ('apps/web/src/app/views/canvas/CanvasContextMenuView.tsx'::text,'canvas-context-menu'::text,'web.component.canvas.CanvasContextMenu'::text), ('apps/web/src/app/views/canvas/useCanvasContextMenuPresenter.ts'::text,'canvas-context-menu-presenter'::text,'web.component.canvas.CanvasContextMenuPresenter'::text), ('apps/web/src/app/components/canvas/CanvasNodeContextMenuView.tsx'::text,'node-context-menu'::text,'web.component.canvas.CanvasNodeContextMenu'::text), ('apps/web/src/app/views/canvas/CanvasNodeWorkbenchOverlay.tsx'::text,'node-workbench'::text,'web.component.canvas.CanvasNodeWorkbenchPanel'::text), ('apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.tsx'::text,'node-workbench'::text,'web.component.canvas.CanvasNodeWorkbenchPanel'::text), ('apps/web/src/app/views/canvas/CanvasContextualWorkbenchPanel.tsx'::text,'node-workbench'::text,'web.component.canvas.CanvasNodeWorkbenchPanel'::text), ('apps/web/src/app/views/canvas/canvasCenterSurfaceWorkbench.tsx'::text,'node-workbench'::text,'web.component.canvas.CanvasNodeWorkbenchPanel'::text), ('apps/web/src/app/views/canvas/canvasNodeWorkbenchSectionStrategy.ts'::text,'node-workbench-presenter'::text,'web.component.canvas.CanvasSurfaceStrategy'::text), ('apps/web/src/app/views/canvas/CanvasViewport.tsx'::text,'canvas-viewport'::text,'web.component.canvas.CanvasViewport'::text), ('apps/web/src/app/views/canvas/CanvasViewportSurfaceView.tsx'::text,'canvas-viewport'::text,'web.component.canvas.CanvasViewport'::text), ('apps/web/src/app/views/canvas/canvasViewportStyle.ts'::text,'canvas-viewport-presenter'::text,'web.component.canvas.CanvasViewport'::text), ('apps/web/src/app/views/canvas/useCanvasViewportLifecycle.ts'::text,'canvas-viewport-presenter'::text,'web.component.canvas.CanvasViewport'::text), ('apps/web/src/app/views/canvas/DbtAuthoringFields.tsx'::text,'authoring-fields'::text,'web.component.canvas.DbtAuthoringFields'::text), ('apps/web/src/app/views/canvas/DvtAuthoringFields.tsx'::text,'authoring-fields'::text,'web.component.canvas.DvtAuthoringFields'::text)
        ), canvas_candidate_files AS MATERIALIZED (
         SELECT governed_file.path AS file_path,
            surface.file_path AS governed_surface_path,
            surface.surface_role,
            surface.expected_component_id,
            governed_file.source_path,
            governed_file.source_content_sha256
           FROM (canvas_component_registry_ui_surface_paths surface
             JOIN planning_query_store.governance_file_query governed_file ON ((governed_file.path = surface.file_path)))
        ), registered_file_owners AS MATERIALIZED (
         SELECT file_ref.file_path,
            jsonb_agg(DISTINCT file_ref.component_id ORDER BY file_ref.component_id) AS registered_component_ids,
            (count(DISTINCT file_ref.component_id))::integer AS registered_component_count
           FROM planning_query_store.frontend_component_file_query file_ref
          GROUP BY file_ref.file_path
        ), joined AS MATERIALIZED (
         SELECT candidate.file_path,
            candidate.surface_role,
            candidate.expected_component_id,
            COALESCE(owner.registered_component_ids, '[]'::jsonb) AS registered_component_ids,
            COALESCE(owner.registered_component_count, 0) AS registered_component_count,
            candidate.source_path,
            candidate.source_content_sha256
           FROM (canvas_candidate_files candidate
             LEFT JOIN registered_file_owners owner ON ((owner.file_path = candidate.file_path)))
        ), unmapped AS (
         SELECT 'blocker'::text AS severity,
            'unmapped_canvas_component_file'::text AS drift_state,
            joined.file_path,
            joined.expected_component_id,
            joined.registered_component_ids,
            joined.surface_role,
            'Register the Canvas file in frontend_component_local_files before changing UI behavior.'::text AS action_hint,
            joined.source_path,
            jsonb_build_object('expectedComponentId', joined.expected_component_id, 'registeredComponentCount', joined.registered_component_count) AS metadata
           FROM joined
          WHERE (joined.registered_component_count = 0)
        ), unexpected_owner AS (
         SELECT 'error'::text AS severity,
            'unexpected_canvas_component_owner'::text AS drift_state,
            joined.file_path,
            joined.expected_component_id,
            joined.registered_component_ids,
            joined.surface_role,
            'Move the file mapping to the expected Canvas component or adjust the DB vocabulary before implementation.'::text AS action_hint,
            joined.source_path,
            jsonb_build_object('expectedComponentId', joined.expected_component_id, 'registeredComponentIds', joined.registered_component_ids) AS metadata
           FROM joined
          WHERE ((joined.registered_component_count > 0) AND (NOT (joined.registered_component_ids ? joined.expected_component_id)))
        ), duplicate_owner AS (
         SELECT 'error'::text AS severity,
            'duplicate_canvas_component_file_owner'::text AS drift_state,
            joined.file_path,
            joined.expected_component_id,
            joined.registered_component_ids,
            joined.surface_role,
            'A Canvas file must not be owned by more than one frontend component.'::text AS action_hint,
            joined.source_path,
            jsonb_build_object('expectedComponentId', joined.expected_component_id, 'registeredComponentIds', joined.registered_component_ids) AS metadata
           FROM joined
          WHERE (joined.registered_component_count > 1)
        ), legacy_palette AS (
         SELECT 'error'::text AS severity,
            'legacy_canvas_palette_surface'::text AS drift_state,
            joined.file_path,
            'web.component.canvas.LegacyCanvasPalette'::text AS expected_component_id,
            joined.registered_component_ids,
            joined.surface_role,
            'Retire fixed palette surfaces after spatial context-menu insertion owns add-node behavior.'::text AS action_hint,
            joined.source_path,
            jsonb_build_object('legacyReason', 'TAREA.TXT requires insertion to originate from the canvas context, not a fixed palette.', 'sentinelPath', 'apps/web/src/app/views/canvas/CanvasAddNodePalette.tsx') AS metadata
           FROM joined
          WHERE (joined.surface_role = 'legacy-palette'::text)
        ), drift_rows AS (
         SELECT unmapped.severity,
            unmapped.drift_state,
            unmapped.file_path,
            unmapped.expected_component_id,
            unmapped.registered_component_ids,
            unmapped.surface_role,
            unmapped.action_hint,
            unmapped.source_path,
            unmapped.metadata
           FROM unmapped
        UNION ALL
         SELECT unexpected_owner.severity,
            unexpected_owner.drift_state,
            unexpected_owner.file_path,
            unexpected_owner.expected_component_id,
            unexpected_owner.registered_component_ids,
            unexpected_owner.surface_role,
            unexpected_owner.action_hint,
            unexpected_owner.source_path,
            unexpected_owner.metadata
           FROM unexpected_owner
        UNION ALL
         SELECT duplicate_owner.severity,
            duplicate_owner.drift_state,
            duplicate_owner.file_path,
            duplicate_owner.expected_component_id,
            duplicate_owner.registered_component_ids,
            duplicate_owner.surface_role,
            duplicate_owner.action_hint,
            duplicate_owner.source_path,
            duplicate_owner.metadata
           FROM duplicate_owner
        UNION ALL
         SELECT legacy_palette.severity,
            legacy_palette.drift_state,
            legacy_palette.file_path,
            legacy_palette.expected_component_id,
            legacy_palette.registered_component_ids,
            legacy_palette.surface_role,
            legacy_palette.action_hint,
            legacy_palette.source_path,
            legacy_palette.metadata
           FROM legacy_palette
        )
 SELECT severity,
    drift_state,
    file_path,
    expected_component_id,
    registered_component_ids,
    surface_role,
    action_hint,
    source_path,
    metadata
   FROM drift_rows
  ORDER BY
        CASE severity
            WHEN 'blocker'::text THEN 0
            WHEN 'error'::text THEN 1
            WHEN 'warning'::text THEN 2
            ELSE 3
        END, drift_state, file_path;


--
-- Name: canvas_uxdb_specification_query; Type: VIEW; Schema: planning_query_store; Owner: -
--

CREATE VIEW planning_query_store.canvas_uxdb_specification_query AS
 SELECT record_id,
    record_type,
    record_title,
    canonical_task_id,
    component_id,
    rail_name,
    spec_state,
    legacy_posture,
    source_path,
    metadata
   FROM planning_query_store.canvas_uxdb_specification_records;


--
-- Name: canvas_uxdb_canonical_specification_query; Type: VIEW; Schema: planning_query_store; Owner: -
--

CREATE VIEW planning_query_store.canvas_uxdb_canonical_specification_query AS
 WITH rail_overrides AS (
         SELECT override_1.requested_rail_name,
            override_1.canonical_rail_name,
            override_1.canonical_posture,
            override_1.reason
           FROM ( VALUES ('OpenCanvasAddSourceDialog'::text,'OpenCanvasSourceImportDialog'::text,'canonical_source_import_dialog'::text,'Add Source opens the canonical Source Import dialog rail.'::text), ('OpenCanvasNodeWorkbench'::text,'InspectCanvasNodeProperties'::text,'canonical_node_properties_read_model'::text,'Node Workbench sections are reached through the canonical node inspection read model.'::text), ('PreviewCanvasExecutionPlan'::text,'PreviewExecutionPlan'::text,'canonical_execution_preview'::text,'Execution Preview reuses the existing execution preview rail.'::text), ('OpenCanvasSqlContextWorkbench'::text,'ResolveCanvasWorkbenchContext'::text,'canonical_workbench_context'::text,'SQL workbench rendering resolves the existing Canvas workbench context rail.'::text)) override_1(requested_rail_name, canonical_rail_name, canonical_posture, reason)
        )
 SELECT spec.record_id,
    spec.record_type,
    spec.record_title,
    spec.canonical_task_id,
    spec.component_id,
    COALESCE(override.canonical_rail_name, spec.rail_name) AS rail_name,
    spec.spec_state,
        CASE
            WHEN (override.canonical_rail_name IS NOT NULL) THEN override.canonical_posture
            ELSE spec.legacy_posture
        END AS legacy_posture,
    spec.source_path,
    (spec.metadata || jsonb_build_object('rawRailName', spec.rail_name, 'railVocabularyNormalization', COALESCE(override.reason, 'already canonical'::text))) AS metadata
   FROM (planning_query_store.canvas_uxdb_specification_query spec
     LEFT JOIN rail_overrides override ON ((override.requested_rail_name = spec.rail_name)));


--
-- Name: canvas_cq_rail_drift_query; Type: VIEW; Schema: planning_query_store; Owner: -
--

CREATE VIEW planning_query_store.canvas_cq_rail_drift_query AS
 WITH spec_rails AS MATERIALIZED (
         SELECT spec.record_id,
            spec.record_type,
            spec.record_title,
            spec.canonical_task_id,
            spec.component_id,
            spec.rail_name AS requested_rail_name,
            spec.spec_state,
            spec.legacy_posture,
            spec.source_path,
            spec.metadata
           FROM planning_query_store.canvas_uxdb_canonical_specification_query spec
          WHERE ((NULLIF(btrim(spec.rail_name), ''::text) IS NOT NULL) AND (spec.record_type = ANY (ARRAY['ux_decision'::text, 'ui_component'::text, 'context_action'::text, 'workbench_section'::text, 'command_query_rail'::text, 'anti_pattern'::text, 'acceptance_criterion'::text, 'test_requirement'::text])))
        ), matched AS MATERIALIZED (
         SELECT spec_rails.record_id,
            spec_rails.record_type,
            spec_rails.record_title,
            spec_rails.canonical_task_id,
            spec_rails.component_id,
            spec_rails.requested_rail_name,
            spec_rails.spec_state,
            spec_rails.legacy_posture,
            spec_rails.source_path,
            spec_rails.metadata,
            rail.rail_id,
            rail.rail_type,
            rail.rail_status AS canonical_rail_status,
            rail.is_gap,
            rail.is_duplicate,
            rail.implementation_ref_count,
            rail.source_path AS canonical_rail_source_path
           FROM (spec_rails
             LEFT JOIN planning_query_store.command_query_rail_query rail ON ((rail.rail_name = spec_rails.requested_rail_name)))
        )
 SELECT
        CASE
            WHEN ((rail_id IS NULL) AND (spec_state = 'accepted'::text)) THEN 'blocker'::text
            WHEN (rail_id IS NULL) THEN 'warning'::text
            WHEN is_duplicate THEN 'error'::text
            WHEN is_gap THEN 'error'::text
            WHEN (lower(COALESCE(canonical_rail_status, ''::text)) = ANY (ARRAY['deprecated'::text, 'retired'::text])) THEN 'error'::text
            ELSE 'info'::text
        END AS severity,
        CASE
            WHEN (rail_id IS NULL) THEN 'missing_canonical_rail'::text
            WHEN is_duplicate THEN 'duplicate_canonical_rail'::text
            WHEN is_gap THEN 'gap_canonical_rail'::text
            WHEN (lower(COALESCE(canonical_rail_status, ''::text)) = ANY (ARRAY['deprecated'::text, 'retired'::text])) THEN 'retired_canonical_rail'::text
            ELSE 'ready'::text
        END AS drift_state,
    record_id,
    record_type,
    record_title,
    canonical_task_id,
    component_id,
    requested_rail_name,
    requested_rail_name AS canonical_rail_name,
    COALESCE(rail_type, '-'::text) AS rail_type,
    COALESCE(canonical_rail_status, '-'::text) AS canonical_rail_status,
        CASE
            WHEN (rail_id IS NULL) THEN (((('Register canonical Canvas rail '::text || requested_rail_name) || ' before implementing '::text) || record_id) || '.'::text)
            WHEN is_duplicate THEN (('Resolve duplicate canonical rail '::text || requested_rail_name) || ' before adding UI behavior.'::text)
            WHEN is_gap THEN (('Complete existing gap rail '::text || requested_rail_name) || ' before adding UI behavior.'::text)
            WHEN (lower(COALESCE(canonical_rail_status, ''::text)) = ANY (ARRAY['deprecated'::text, 'retired'::text])) THEN (('Do not implement against retired/deprecated rail '::text || requested_rail_name) || '.'::text)
            ELSE (('Canvas UX record is aligned with canonical command/query rail '::text || requested_rail_name) || '.'::text)
        END AS action_hint,
    source_path,
    (metadata || jsonb_build_object('canonicalRailSourcePath', COALESCE(canonical_rail_source_path, '-'::text), 'specState', spec_state, 'legacyPosture', legacy_posture)) AS metadata
   FROM matched;


--
-- Name: frontend_component_summary_query; Type: VIEW; Schema: planning_query_store; Owner: -
--

CREATE VIEW planning_query_store.frontend_component_summary_query AS
 WITH effective_files AS (
         SELECT imported.component_id,
            imported.file_path,
            imported.file_role,
            imported.raw_file
           FROM planning_query_store.frontend_component_files imported
          WHERE (NOT (EXISTS ( SELECT 1
                   FROM planning_query_store.frontend_component_local_files local_file
                  WHERE ((local_file.component_id = imported.component_id) AND (local_file.file_path = imported.file_path) AND (local_file.file_role = imported.file_role)))))
        UNION ALL
         SELECT local_file.component_id,
            local_file.file_path,
            local_file.file_role,
            local_file.raw_file
           FROM planning_query_store.frontend_component_local_files local_file
        ), effective_rails AS (
         SELECT imported.component_id,
            imported.rail_name,
            imported.raw_rail
           FROM planning_query_store.frontend_component_cq_rails imported
          WHERE (NOT (EXISTS ( SELECT 1
                   FROM planning_query_store.frontend_component_local_cq_rails local_rail
                  WHERE ((local_rail.component_id = imported.component_id) AND (local_rail.rail_name = imported.rail_name)))))
        UNION ALL
         SELECT local_rail.component_id,
            local_rail.rail_name,
            local_rail.raw_rail
           FROM planning_query_store.frontend_component_local_cq_rails local_rail
        ), effective_evidence AS (
         SELECT imported.component_id,
            imported.evidence_id
           FROM planning_query_store.frontend_component_evidence imported
          WHERE (NOT (EXISTS ( SELECT 1
                   FROM planning_query_store.frontend_component_local_evidence local_evidence
                  WHERE (local_evidence.evidence_id = imported.evidence_id))))
        UNION ALL
         SELECT local_evidence.component_id,
            local_evidence.evidence_id
           FROM planning_query_store.frontend_component_local_evidence local_evidence
        ), surface_rollups AS (
         SELECT link.component_id,
            jsonb_agg(link.surface_id ORDER BY link.surface_id) AS surface_ids,
            (count(*))::integer AS surface_count
           FROM planning_query_store.frontend_component_surface_link_query link
          GROUP BY link.component_id
        ), file_counts AS (
         SELECT file_ref.component_id,
            (count(*))::integer AS file_count
           FROM effective_files file_ref
          WHERE ((NOT COALESCE(((file_ref.raw_file ->> 'retiredForContextActionCatalog'::text))::boolean, false)) AND (NOT COALESCE(((file_ref.raw_file ->> 'retiredForPresentationOwnership'::text))::boolean, false)) AND (NOT COALESCE(((file_ref.raw_file ->> 'retiredForEdgeAuthoringOwnership'::text))::boolean, false)) AND (NOT COALESCE(((file_ref.raw_file ->> 'retiredForSourceImportCatalogOwnership'::text))::boolean, false)) AND (NOT COALESCE(((file_ref.raw_file ->> 'retiredForSourceImportStepOwnership'::text))::boolean, false)) AND (NOT COALESCE(((file_ref.raw_file ->> 'retiredForSourceImportSharedOwnership'::text))::boolean, false)))
          GROUP BY file_ref.component_id
        ), rail_counts AS (
         SELECT rail_relation.component_id,
            (count(*))::integer AS rail_count
           FROM ( SELECT DISTINCT rail.component_id,
                    rail.rail_name
                   FROM effective_rails rail
                  WHERE (NOT COALESCE(((rail.raw_rail ->> 'retiredForContextActionCatalog'::text))::boolean, false))
                UNION
                 SELECT DISTINCT action.component_id,
                    action.rail_name
                   FROM planning_query_store.frontend_component_context_actions action
                  WHERE ((action.rail_name IS NOT NULL) AND (action.action_status <> 'retired'::text))) rail_relation
          GROUP BY rail_relation.component_id
        ), evidence_counts AS (
         SELECT evidence.component_id,
            (count(*))::integer AS evidence_count
           FROM effective_evidence evidence
          GROUP BY evidence.component_id
        ), gap_counts AS (
         SELECT gap.component_id,
            (count(*))::integer AS capability_gap_count
           FROM planning_query_store.frontend_component_capability_gaps gap
          WHERE (gap.gap_status = ANY (ARRAY['open'::text, 'planned'::text, 'moved'::text]))
          GROUP BY gap.component_id
        ), validation_evidence_counts AS (
         SELECT evidence.component_id,
            (count(*))::integer AS evidence_ref_count
           FROM planning_query_store.frontend_component_validation_evidence evidence
          WHERE (evidence.evidence_status = 'current'::text)
          GROUP BY evidence.component_id
        )
 SELECT component.component_id,
    component.component_name,
    component.component_kind,
    component.component_status,
    component.reuse_decision,
    component.frontend_owner,
    component.responsibility,
    component.package_name,
    component.route_scope,
    component.plugin_scope,
    component.capability_gaps,
    component.evidence_refs,
    COALESCE(surface_rollups.surface_ids, '[]'::jsonb) AS surface_ids,
    COALESCE(surface_rollups.surface_count, 0) AS surface_count,
    COALESCE(file_counts.file_count, 0) AS file_count,
    COALESCE(rail_counts.rail_count, 0) AS rail_count,
    COALESCE(evidence_counts.evidence_count, 0) AS evidence_count,
    COALESCE(gap_counts.capability_gap_count, 0) AS capability_gap_count,
    COALESCE(validation_evidence_counts.evidence_ref_count, 0) AS evidence_ref_count,
    component.source_path,
    component.source_content_sha256,
    component.imported_at,
    COALESCE((component.raw_component ->> 'fileOwnershipModel'::text), 'owned-files'::text) AS file_ownership_model,
    COALESCE(((component.raw_component ->> 'fileCountZeroIsValid'::text))::boolean, false) AS file_count_zero_is_valid
   FROM ((((((planning_query_store.frontend_component_effective_component_query component
     LEFT JOIN surface_rollups ON ((surface_rollups.component_id = component.component_id)))
     LEFT JOIN file_counts ON ((file_counts.component_id = component.component_id)))
     LEFT JOIN rail_counts ON ((rail_counts.component_id = component.component_id)))
     LEFT JOIN evidence_counts ON ((evidence_counts.component_id = component.component_id)))
     LEFT JOIN gap_counts ON ((gap_counts.component_id = component.component_id)))
     LEFT JOIN validation_evidence_counts ON ((validation_evidence_counts.component_id = component.component_id)));
