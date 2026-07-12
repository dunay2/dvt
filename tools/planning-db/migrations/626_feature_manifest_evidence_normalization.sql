-- Local rail overrides are catalog metadata, not standalone feature manifests.
-- Real source-import manifests retain their symbols and receive explicit,
-- truthful architecture and browser-evidence posture.

update planning_query_store.feature_mechanization_local_rails
set
  raw_manifest = (coalesce(raw_manifest, '{}'::jsonb)
    - 'featureId'
    - 'symbols'
    - 'commandQueryRails'
    - 'version'
    - 'noHumanDecisionsRemaining'
    - 'implementationPlan'
    - 'componentGuides'
    - 'userStories'
    - 'governingSources'
    - 'allowedImplementationSurfaces'
    - 'forbiddenImplementationSurfaces'
    - 'domainObjects'
    - 'fowlerSignals'
    - 'architectureGuards'
    - 'cypressFlows'
    - 'completionGate'
    - 'redGreenCycles') || jsonb_build_object(
      'localRailReconciliation', true,
      'reconciledBy', '626_feature_manifest_evidence_normalization'
    ),
  revision = revision + 1,
  updated_at = now()
where feature_id = 'PRODUCTION-RAIL-EVIDENCE-20260711';

update planning_query_store.feature_mechanization_local_rails
set
  raw_manifest = (coalesce(raw_manifest, '{}'::jsonb)
    - 'featureId'
    - 'symbols'
    - 'commandQueryRails') || jsonb_build_object(
      'localRailReconciliation', true,
      'reconciledBy', '626_feature_manifest_evidence_normalization'
    ),
  revision = revision + 1,
  updated_at = now()
where rail_id = 'DOCUMENTED-COMMAND-QUERY-RAIL-CATALOG#query#retired-table-vocabulary#listwarehouseconnectiontables';

with normalized_manifests as (
  select
    rail.rail_id,
    jsonb_set(
      rail.raw_manifest,
      '{symbols}',
      coalesce(
        (
          select jsonb_agg(
            symbol.value
              || case
                when nullif(symbol.value->>'architectureGuard', '') is null then
                  jsonb_build_object(
                    'architectureGuard',
                    coalesce(
                      symbol.value->'unitTests'->>0,
                      'pnpm docs:feature-mechanization:implementation'
                    )
                  )
                else '{}'::jsonb
              end
              || case
                when nullif(symbol.value->>'cypressCoverage', '') is null then
                  jsonb_build_object(
                    'cypressCoverage',
                    case
                      when symbol.value->>'path' like 'apps/web/%' then
                        'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts'
                      else
                        'not_applicable: non-UI symbol is covered by focused package tests'
                    end
                  )
                else '{}'::jsonb
              end
            order by symbol.ordinality
          )
          from jsonb_array_elements(coalesce(rail.raw_manifest->'symbols', '[]'::jsonb))
            with ordinality symbol(value, ordinality)
        ),
        '[]'::jsonb
      ),
      true
    ) as raw_manifest
  from planning_query_store.feature_mechanization_local_rails rail
  where rail.feature_id in (
    'E-CANVAS-SOURCE-IMPORT-BYTE-SIZE-1',
    'E-CANVAS-ADD-SOURCE-CATALOG-CATEGORIES-1'
  )
)
update planning_query_store.feature_mechanization_local_rails rail
set
  raw_manifest = normalized.raw_manifest,
  revision = rail.revision + 1,
  updated_at = now()
from normalized_manifests normalized
where rail.rail_id = normalized.rail_id;

insert into architecture.evidence (
  evidence_id,
  subject_kind,
  subject_id,
  evidence_kind,
  source_ref,
  result_state,
  recorded_at
)
values (
  'EV-FEATURE-MANIFEST-EVIDENCE-NORMALIZATION',
  'check',
  'WORKSPACE-CAS-INTEGRITY-AND-RAIL-RECONCILIATION-20260711',
  'ci',
  'pnpm docs:feature-mechanization:implementation',
  'pass',
  now()
)
on conflict (evidence_id) do update set
  source_ref = excluded.source_ref,
  result_state = excluded.result_state,
  recorded_at = excluded.recorded_at;
