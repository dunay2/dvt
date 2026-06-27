-- Retire the protected-runtime PreviewExecutablePlan alias from active
-- command/query rail read models. The canonical rail is PreviewExecutionPlan;
-- historical docs may still mention the old name, but DB-first reuse and drift
-- checks must not offer it as an active implementation target.

delete from planning_query_store.command_query_rails
where rail_name = 'PreviewExecutablePlan'
   or normalized_rail_name = 'previewexecutableplan';

delete from planning_query_store.feature_mechanization_local_rails
where rail_name = 'PreviewExecutablePlan'
   or normalized_rail_name = 'previewexecutableplan';
