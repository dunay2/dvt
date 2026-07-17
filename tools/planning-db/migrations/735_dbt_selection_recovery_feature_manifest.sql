-- Reconcile Phase 4 selection-recovery implementation symbols and i18n rail
-- with the canonical DB-first feature-mechanization manifest.

do $$
declare
  declared_symbols jsonb;
  merged_manifest_rails jsonb;
  merged_manifest_symbols jsonb;
  merged_symbol_refs jsonb;
  target record;
  migration_path constant text := 'tools/planning-db/migrations/735_dbt_selection_recovery_feature_manifest.sql';
begin
  select jsonb_agg(
    jsonb_build_object(
      'name', symbol_name,
      'path', symbol_path,
      'dddOwner', ddd_owner,
      'cqRails', cq_rails,
      'fowlerSignals', fowler_signals,
      'architectureGuard', 'canvasExecutionSelectionRecovery.architecture.test.ts',
      'cypressCoverage', 'canvas-dbt-selection-recovery-live.cy.ts',
      'unitTests', unit_tests
    )
    order by symbol_path, symbol_name
  )
  into declared_symbols
  from (
    values
      ('addDbtModelAt', 'apps/web/cypress/e2e/canvas/canvas-dbt-selection-recovery-live.cy.ts', 'Canvas execution selection acceptance evidence', '["RecoverCanvasExecutionSelection"]'::jsonb, '["boundary drift"]'::jsonb, '["canvas-dbt-selection-recovery-live.cy.ts"]'::jsonb),
      ('readPersistedNodeIds', 'apps/web/cypress/e2e/canvas/canvas-dbt-selection-recovery-live.cy.ts', 'Canvas execution selection acceptance evidence', '["CollectCanvasExecutionSelection"]'::jsonb, '["separated interface"]'::jsonb, '["canvas-dbt-selection-recovery-live.cy.ts"]'::jsonb),
      ('resolveSelectionRecoverySession', 'apps/web/cypress/e2e/canvas/canvas-dbt-selection-recovery-live.cy.ts', 'Canvas execution selection acceptance evidence', '["RecoverCanvasExecutionSelection"]'::jsonb, '["published language"]'::jsonb, '["canvas-dbt-selection-recovery-live.cy.ts"]'::jsonb),
      ('visitCleanDbtCanvas', 'apps/web/cypress/e2e/canvas/canvas-dbt-selection-recovery-live.cy.ts', 'Canvas execution selection acceptance evidence', '["CollectCanvasExecutionSelection"]'::jsonb, '["separated interface"]'::jsonb, '["canvas-dbt-selection-recovery-live.cy.ts"]'::jsonb),
      ('waitForPersistedDraftRecord', 'apps/web/cypress/e2e/canvas/canvas-dbt-selection-recovery-live.cy.ts', 'Canvas execution selection acceptance evidence', '["CollectCanvasExecutionSelection"]'::jsonb, '["boundary drift"]'::jsonb, '["canvas-dbt-selection-recovery-live.cy.ts"]'::jsonb),
      ('waitForPersistedNodeAbsence', 'apps/web/cypress/e2e/canvas/canvas-dbt-selection-recovery-live.cy.ts', 'Canvas execution selection acceptance evidence', '["RecoverCanvasExecutionSelection"]'::jsonb, '["boundary drift"]'::jsonb, '["canvas-dbt-selection-recovery-live.cy.ts"]'::jsonb),
      ('waitForPersistedNodePresence', 'apps/web/cypress/e2e/canvas/canvas-dbt-selection-recovery-live.cy.ts', 'Canvas execution selection acceptance evidence', '["CollectCanvasExecutionSelection"]'::jsonb, '["boundary drift"]'::jsonb, '["canvas-dbt-selection-recovery-live.cy.ts"]'::jsonb),
      ('OperationalDrawerRecoveryActions', 'apps/web/src/app/components/shell/OperationalDrawerSelectionRecoveryPrimitives.tsx', 'CanvasExecutionSelectionRecoveryView', '["RecoverCanvasExecutionSelection","ResolveCanvasViewCopy"]'::jsonb, '["presentation model"]'::jsonb, '["OperationalDrawerSelectionRecoveryView.test.tsx"]'::jsonb),
      ('OperationalDrawerRecoveryFailure', 'apps/web/src/app/components/shell/OperationalDrawerSelectionRecoveryPrimitives.tsx', 'CanvasExecutionSelectionRecoveryView', '["RecoverCanvasExecutionSelection","ResolveCanvasViewCopy"]'::jsonb, '["presentation model"]'::jsonb, '["OperationalDrawerSelectionRecoveryView.test.tsx"]'::jsonb),
      ('OperationalDrawerRecoveryReceipt', 'apps/web/src/app/components/shell/OperationalDrawerSelectionRecoveryPrimitives.tsx', 'CanvasExecutionSelectionRecoveryView', '["RecoverCanvasExecutionSelection","ResolveCanvasViewCopy"]'::jsonb, '["presentation model"]'::jsonb, '["OperationalDrawerSelectionRecoveryView.test.tsx"]'::jsonb),
      ('OperationalDrawerRecoveryScopeGrid', 'apps/web/src/app/components/shell/OperationalDrawerSelectionRecoveryPrimitives.tsx', 'CanvasExecutionSelectionRecoveryView', '["CollectCanvasExecutionSelection","ResolveCanvasViewCopy"]'::jsonb, '["presentation model"]'::jsonb, '["OperationalDrawerSelectionRecoveryView.test.tsx"]'::jsonb),
      ('OperationalDrawerRecoveryScopeGroup', 'apps/web/src/app/components/shell/OperationalDrawerSelectionRecoveryPrimitives.tsx', 'CanvasExecutionSelectionRecoveryView', '["CollectCanvasExecutionSelection","ResolveCanvasViewCopy"]'::jsonb, '["presentation model"]'::jsonb, '["OperationalDrawerSelectionRecoveryView.test.tsx"]'::jsonb),
      ('OperationalDrawerRecoverySurface', 'apps/web/src/app/components/shell/OperationalDrawerSelectionRecoveryPrimitives.tsx', 'CanvasExecutionSelectionRecoveryView', '["CollectCanvasExecutionSelection","ResolveCanvasViewCopy"]'::jsonb, '["presentation model"]'::jsonb, '["OperationalDrawerSelectionRecoveryView.test.tsx"]'::jsonb),
      ('selectionRecoveryClassNames', 'apps/web/src/app/components/shell/OperationalDrawerSelectionRecoveryPrimitives.tsx', 'CanvasExecutionSelectionRecoveryView', '["ResolveCanvasViewCopy"]'::jsonb, '["presentation model"]'::jsonb, '["OperationalDrawerSelectionRecoveryView.test.tsx"]'::jsonb),
      ('OperationalDrawerSelectionRecoveryView', 'apps/web/src/app/components/shell/OperationalDrawerSelectionRecoveryView.tsx', 'CanvasExecutionSelectionRecoveryView', '["CollectCanvasExecutionSelection","RecoverCanvasExecutionSelection","ResolveCanvasViewCopy"]'::jsonb, '["presentation model","separated interface"]'::jsonb, '["OperationalDrawerSelectionRecoveryView.test.tsx"]'::jsonb),
      ('OperationalDrawerSelectionRecoveryMessages', 'apps/web/src/app/components/shell/operationalDrawerSelectionRecoveryMessages.ts', 'CanvasExecutionSelectionRecoveryView', '["ResolveCanvasViewCopy"]'::jsonb, '["published language"]'::jsonb, '["OperationalDrawerSelectionRecoveryView.test.tsx","copy.test.ts"]'::jsonb),
      ('formatOperationalDrawerSelectionRecoveryReceipt', 'apps/web/src/app/components/shell/operationalDrawerSelectionRecoveryMessages.ts', 'CanvasExecutionSelectionRecoveryView', '["RecoverCanvasExecutionSelection","ResolveCanvasViewCopy"]'::jsonb, '["published language","presentation model"]'::jsonb, '["OperationalDrawerSelectionRecoveryView.test.tsx","copy.test.ts"]'::jsonb),
      ('joinNodeIds', 'apps/web/src/app/components/shell/operationalDrawerSelectionRecoveryMessages.ts', 'CanvasExecutionSelectionRecoveryView', '["ResolveCanvasViewCopy"]'::jsonb, '["published language"]'::jsonb, '["OperationalDrawerSelectionRecoveryView.test.tsx"]'::jsonb),
      ('CanvasExecutionSelectionRecoveryCommands', 'apps/web/src/app/types/canvasExecutionSelectionRecovery.ts', 'CanvasExecutionSelectionRecovery', '["RecoverCanvasExecutionSelection"]'::jsonb, '["separated interface"]'::jsonb, '["useCanvasExecutionSelectionRecovery.test.tsx"]'::jsonb),
      ('CanvasExecutionSelectionRecoveryFailure', 'apps/web/src/app/types/canvasExecutionSelectionRecovery.ts', 'CanvasExecutionSelectionRecovery', '["RecoverCanvasExecutionSelection"]'::jsonb, '["published language"]'::jsonb, '["canvasExecutionSelectionRecoveryAuthorityAdapter.test.ts"]'::jsonb),
      ('CanvasExecutionSelectionRecoveryReadModel', 'apps/web/src/app/types/canvasExecutionSelectionRecovery.ts', 'CanvasExecutionSelectionRecovery', '["CollectCanvasExecutionSelection"]'::jsonb, '["presentation model"]'::jsonb, '["canvasExecutionSelectionRecovery.test.ts","OperationalDrawerSelectionRecoveryView.test.tsx"]'::jsonb),
      ('CanvasExecutionSelectionRecoveryReceipt', 'apps/web/src/app/types/canvasExecutionSelectionRecovery.ts', 'CanvasExecutionSelectionRecovery', '["RecoverCanvasExecutionSelection"]'::jsonb, '["published language"]'::jsonb, '["canvasExecutionSelectionRecovery.test.ts"]'::jsonb),
      ('CanvasExecutionSelectionRecoveryStrategy', 'apps/web/src/app/types/canvasExecutionSelectionRecovery.ts', 'CanvasExecutionSelectionRecovery', '["RecoverCanvasExecutionSelection"]'::jsonb, '["strategy"]'::jsonb, '["canvasExecutionSelectionRecovery.test.ts"]'::jsonb),
      ('CanvasExecutionSelectionRecovery', 'apps/web/src/app/views/canvas/canvasControllerViewModel.ts', 'CanvasExecutionSelectionRecovery', '["CollectCanvasExecutionSelection","RecoverCanvasExecutionSelection"]'::jsonb, '["separated interface"]'::jsonb, '["canvasOperationalDrawerContribution.test.tsx"]'::jsonb),
      ('BuildCanvasExecutionSelectionRecoveryReadModelArgs', 'apps/web/src/app/views/canvas/canvasExecutionSelectionRecovery.ts', 'CanvasExecutionSelectionRecovery', '["CollectCanvasExecutionSelection"]'::jsonb, '["parameter object"]'::jsonb, '["canvasExecutionSelectionRecovery.test.ts"]'::jsonb),
      ('CanvasExecutionSelectionRecoveryGraph', 'apps/web/src/app/views/canvas/canvasExecutionSelectionRecovery.ts', 'CanvasExecutionSelectionRecovery', '["CollectCanvasExecutionSelection"]'::jsonb, '["domain model"]'::jsonb, '["canvasExecutionSelectionRecovery.test.ts"]'::jsonb),
      ('buildCanvasExecutionSelectionRecoveryGraph', 'apps/web/src/app/views/canvas/canvasExecutionSelectionRecovery.ts', 'CanvasExecutionSelectionRecovery', '["CollectCanvasExecutionSelection"]'::jsonb, '["domain model"]'::jsonb, '["canvasExecutionSelectionRecovery.test.ts"]'::jsonb),
      ('buildCanvasExecutionSelectionRecoveryReadModel', 'apps/web/src/app/views/canvas/canvasExecutionSelectionRecovery.ts', 'CanvasExecutionSelectionRecovery', '["CollectCanvasExecutionSelection"]'::jsonb, '["presentation model"]'::jsonb, '["canvasExecutionSelectionRecovery.test.ts"]'::jsonb),
      ('recoverCanvasExecutionSelection', 'apps/web/src/app/views/canvas/canvasExecutionSelectionRecovery.ts', 'CanvasExecutionSelectionRecovery', '["RecoverCanvasExecutionSelection"]'::jsonb, '["strategy","published language"]'::jsonb, '["canvasExecutionSelectionRecovery.test.ts"]'::jsonb),
      ('resolveCanvasExecutionSelectionLastPreviewRevision', 'apps/web/src/app/views/canvas/canvasExecutionSelectionRecovery.ts', 'CanvasExecutionSelectionRecovery', '["CollectCanvasExecutionSelection"]'::jsonb, '["query object"]'::jsonb, '["canvasExecutionSelectionRecovery.test.ts"]'::jsonb),
      ('CanvasAuthorityRefreshResult', 'apps/web/src/app/views/canvas/canvasExecutionSelectionRecoveryAuthorityAdapter.ts', 'CanvasExecutionSelectionRecovery', '["RecoverCanvasExecutionSelection"]'::jsonb, '["separated interface"]'::jsonb, '["canvasExecutionSelectionRecoveryAuthorityAdapter.test.ts"]'::jsonb),
      ('buildRefreshFailure', 'apps/web/src/app/views/canvas/canvasExecutionSelectionRecoveryAuthorityAdapter.ts', 'CanvasExecutionSelectionRecovery', '["RecoverCanvasExecutionSelection"]'::jsonb, '["special case"]'::jsonb, '["canvasExecutionSelectionRecoveryAuthorityAdapter.test.ts"]'::jsonb),
      ('refreshCanvasExecutionSelectionAuthority', 'apps/web/src/app/views/canvas/canvasExecutionSelectionRecoveryAuthorityAdapter.ts', 'CanvasExecutionSelectionRecovery', '["RecoverCanvasExecutionSelection"]'::jsonb, '["gateway","separated interface"]'::jsonb, '["canvasExecutionSelectionRecoveryAuthorityAdapter.test.ts"]'::jsonb),
      ('DbtExecutionScopeGraph', 'apps/web/src/app/views/canvas/dbtExecutionScopePolicy.ts', 'CanvasExecutionSelection', '["CollectCanvasExecutionSelection"]'::jsonb, '["domain model"]'::jsonb, '["dbtExecutionScopePolicy.test.ts"]'::jsonb),
      ('buildDbtExecutionScopeGraph', 'apps/web/src/app/views/canvas/dbtExecutionScopePolicy.ts', 'CanvasExecutionSelection', '["CollectCanvasExecutionSelection"]'::jsonb, '["domain model"]'::jsonb, '["dbtExecutionScopePolicy.test.ts"]'::jsonb),
      ('RecoveryCommandState', 'apps/web/src/app/views/canvas/useCanvasExecutionSelectionRecovery.ts', 'CanvasExecutionSelectionRecovery', '["RecoverCanvasExecutionSelection"]'::jsonb, '["state machine"]'::jsonb, '["useCanvasExecutionSelectionRecovery.test.tsx"]'::jsonb),
      ('UseCanvasExecutionSelectionRecoveryArgs', 'apps/web/src/app/views/canvas/useCanvasExecutionSelectionRecovery.ts', 'CanvasExecutionSelectionRecovery', '["CollectCanvasExecutionSelection","RecoverCanvasExecutionSelection"]'::jsonb, '["parameter object"]'::jsonb, '["useCanvasExecutionSelectionRecovery.test.tsx"]'::jsonb),
      ('UseCanvasExecutionSelectionRecoveryResult', 'apps/web/src/app/views/canvas/useCanvasExecutionSelectionRecovery.ts', 'CanvasExecutionSelectionRecovery', '["CollectCanvasExecutionSelection","RecoverCanvasExecutionSelection"]'::jsonb, '["separated interface"]'::jsonb, '["useCanvasExecutionSelectionRecovery.test.tsx"]'::jsonb),
      ('buildIntentSignature', 'apps/web/src/app/views/canvas/useCanvasExecutionSelectionRecovery.ts', 'CanvasExecutionSelectionRecovery', '["CollectCanvasExecutionSelection"]'::jsonb, '["value object"]'::jsonb, '["useCanvasExecutionSelectionRecovery.test.tsx"]'::jsonb),
      ('readFailureDetail', 'apps/web/src/app/views/canvas/useCanvasExecutionSelectionRecovery.ts', 'CanvasExecutionSelectionRecovery', '["RecoverCanvasExecutionSelection"]'::jsonb, '["special case"]'::jsonb, '["useCanvasExecutionSelectionRecovery.test.tsx"]'::jsonb),
      ('useCanvasExecutionSelectionRecovery', 'apps/web/src/app/views/canvas/useCanvasExecutionSelectionRecovery.ts', 'CanvasExecutionSelectionRecovery', '["CollectCanvasExecutionSelection","RecoverCanvasExecutionSelection"]'::jsonb, '["service layer","state machine"]'::jsonb, '["useCanvasExecutionSelectionRecovery.test.tsx"]'::jsonb)
  ) as symbols(symbol_name, symbol_path, ddd_owner, cq_rails, fowler_signals, unit_tests);

  for target in
    select rail_id, raw_manifest, symbol_refs, implementation_refs,
      allowed_implementation_surfaces
    from planning_query_store.feature_mechanization_local_rails
    where feature_id = 'E-DBT-PROJECT-ROUNDTRIP-1'
      and source_path = 'tools/planning-db/migrations/730_dbt_selection_recovery_operational_ui.sql'
  loop
    select jsonb_agg(rail order by rail ->> 'name')
    into merged_manifest_rails
    from (
      select case existing ->> 'name'
        when 'CollectCanvasExecutionSelection' then existing || jsonb_build_object(
          'dddOwner', 'CanvasExecutionSelection'
        )
        when 'RecoverCanvasExecutionSelection' then existing || jsonb_build_object(
          'dddOwner', 'CanvasExecutionSelectionRecovery'
        )
        when 'ResolveCanvasViewCopy' then existing || jsonb_build_object(
          'dddOwner', 'CanvasViewLocalization'
        )
        else existing
      end as rail
      from jsonb_array_elements(
        coalesce(target.raw_manifest -> 'commandQueryRails', '[]'::jsonb)
      ) manifest_rails(existing)
      union all
      select jsonb_build_object(
        'name', 'ResolveCanvasViewCopy',
        'type', 'query',
        'status', 'implemented',
        'dddOwner', 'CanvasViewLocalization'
      )
      where not exists (
        select 1
        from jsonb_array_elements(
          coalesce(target.raw_manifest -> 'commandQueryRails', '[]'::jsonb)
        ) existing
        where existing ->> 'name' = 'ResolveCanvasViewCopy'
      )
    ) normalized_rails;

    select jsonb_agg(symbol order by symbol ->> 'path', symbol ->> 'name')
    into merged_manifest_symbols
    from (
      select existing as symbol
      from jsonb_array_elements(
        coalesce(target.raw_manifest -> 'symbols', '[]'::jsonb)
      ) existing
      where not exists (
        select 1
        from jsonb_array_elements(declared_symbols) declared
        where declared ->> 'path' = existing ->> 'path'
          and declared ->> 'name' = existing ->> 'name'
      )
      union all
      select declared
      from jsonb_array_elements(declared_symbols) declared
    ) normalized_symbols;

    select jsonb_agg(symbol_ref order by symbol_ref)
    into merged_symbol_refs
    from (
      select value as symbol_ref
      from jsonb_array_elements_text(coalesce(target.symbol_refs, '[]'::jsonb))
      union
      select format('%s#%s', declared ->> 'path', declared ->> 'name')
      from jsonb_array_elements(declared_symbols) declared
    ) normalized_refs;

    update planning_query_store.feature_mechanization_local_rails
    set
      symbol_refs = merged_symbol_refs,
      implementation_refs = coalesce(target.implementation_refs, '[]'::jsonb) ||
        jsonb_build_array(migration_path),
      allowed_implementation_surfaces = coalesce(
        target.allowed_implementation_surfaces,
        '[]'::jsonb
      ) || jsonb_build_array(migration_path),
      raw_manifest = jsonb_set(
        jsonb_set(
          jsonb_set(
            target.raw_manifest,
            '{commandQueryRails}',
            merged_manifest_rails,
            true
          ),
          '{symbols}',
          merged_manifest_symbols,
          true
        ),
        '{allowedImplementationSurfaces}',
        coalesce(
          target.raw_manifest -> 'allowedImplementationSurfaces',
          '[]'::jsonb
        ) || jsonb_build_array(migration_path),
        true
      ),
      source_path = migration_path,
      source_content_sha256 = repeat(md5(target.rail_id || ':735'), 2),
      revision = revision + 1,
      updated_at = now()
    where rail_id = target.rail_id;
  end loop;
end $$;

do $$
declare
  target_rail_count integer;
  missing_owner_count integer;
  missing_symbol_count integer;
begin
  select count(*) into target_rail_count
  from planning_query_store.feature_mechanization_local_rails
  where feature_id = 'E-DBT-PROJECT-ROUNDTRIP-1'
    and source_path = 'tools/planning-db/migrations/735_dbt_selection_recovery_feature_manifest.sql';

  select count(*) into missing_owner_count
  from planning_query_store.feature_mechanization_local_rails rails,
    jsonb_array_elements(rails.raw_manifest -> 'commandQueryRails') rail
  where rails.feature_id = 'E-DBT-PROJECT-ROUNDTRIP-1'
    and rails.source_path = 'tools/planning-db/migrations/735_dbt_selection_recovery_feature_manifest.sql'
    and rail ->> 'name' in (
      'CollectCanvasExecutionSelection',
      'RecoverCanvasExecutionSelection',
      'ResolveCanvasViewCopy'
    )
    and nullif(rail ->> 'dddOwner', '') is null;

  select count(*) into missing_symbol_count
  from planning_query_store.feature_mechanization_local_rails rails
  cross join lateral jsonb_array_elements(rails.symbol_refs) symbol_ref
  where rails.feature_id = 'E-DBT-PROJECT-ROUNDTRIP-1'
    and rails.source_path = 'tools/planning-db/migrations/735_dbt_selection_recovery_feature_manifest.sql'
    and not exists (
      select 1
      from jsonb_array_elements(rails.raw_manifest -> 'symbols') symbol
      where format('%s#%s', symbol ->> 'path', symbol ->> 'name') = symbol_ref #>> '{}'
    );

  if target_rail_count <> 2 then
    raise exception 'Selection recovery feature reconciliation expected two rails, found %',
      target_rail_count;
  end if;

  if missing_owner_count <> 0 then
    raise exception 'Selection recovery feature manifest retains % rails without DDD ownership',
      missing_owner_count;
  end if;

  if missing_symbol_count <> 0 then
    raise exception 'Selection recovery feature manifest lacks % relational symbol declarations',
      missing_symbol_count;
  end if;
end $$;
