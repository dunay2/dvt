-- Retire the local rail row that shadowed the canonical
-- PreparePlanningDbForCiGate definition. Migration files 723 and 724 remain
-- immutable because they may already be recorded in schema_migrations.

delete from planning_query_store.feature_mechanization_local_rails
where rail_id = 'local#A-PLANNING-MIGRATION-ORDINAL-UNIQUENESS-1#command#prepareplanningdbforcigate';

do $$
begin
  if exists (
    select 1
    from planning_query_store.feature_mechanization_local_rails
    where rail_id = 'local#A-PLANNING-MIGRATION-ORDINAL-UNIQUENESS-1#command#prepareplanningdbforcigate'
  ) then
    raise exception 'Parallel PreparePlanningDbForCiGate rail was not retired';
  end if;
end
$$;
