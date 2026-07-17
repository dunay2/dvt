-- Remove the Phase 4 feature manifest copy that was seeded by migrations 726/728.
-- The mandatory proposal is the canonical, reviewable manifest source; governance
-- import projects that declaration into Planning DB command/query rails.

delete from planning_query_store.feature_mechanization_local_rails
where feature_id = 'E-DBT-PROJECT-ROUNDTRIP-P4-TRUTH-SYNC';

do $$
begin
  if exists (
    select 1
    from planning_query_store.feature_mechanization_local_rails
    where feature_id = 'E-DBT-PROJECT-ROUNDTRIP-P4-TRUTH-SYNC'
  ) then
    raise exception 'DBT round-trip Phase 4 mechanization must be proposal-owned';
  end if;
end
$$;
