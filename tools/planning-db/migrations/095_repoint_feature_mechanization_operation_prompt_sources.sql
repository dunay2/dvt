-- The component-coherence prompt moved from retired buzon intake to governed
-- docs/planning. Preserve the local operation ledger while repointing its
-- source evidence to the tracked governed document with the same content hash.

update planning_query_store.feature_mechanization_local_operations
set
  source_path = 'docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-coherence-prompt-20260615.md',
  source_content_sha256 = '154ff0acdea4ae3f9d998586b719e38c784ddd20d97867b5a8c2842f3373e760',
  payload = jsonb_set(
    jsonb_set(
      payload,
      '{sourceRef}',
      '"docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-coherence-prompt-20260615.md"'::jsonb,
      true
    ),
    '{implementationPlan}',
    case
      when payload->>'implementationPlan' = 'buzon/planning-db-component-coherence-prompt-20260615.md'
        then '"docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-coherence-prompt-20260615.md"'::jsonb
      else coalesce(payload->'implementationPlan', 'null'::jsonb)
    end,
    true
  )
where source_path = 'buzon/planning-db-component-coherence-prompt-20260615.md';
