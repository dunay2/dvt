-- CodeView owns authoritative file reads. The CodeWorkingTreeSync leaf receives
-- a loaded file and owns only revision-guarded persistence and reconciliation.

delete from planning_query_store.frontend_component_local_cq_rails
where component_id = 'web.component.code.CodeWorkingTreeSync'
  and rail_name = 'GetWorkspaceFileContent';

update planning_query_store.frontend_component_local_components
set
  raw_component = coalesce(raw_component, '{}'::jsonb) - 'readAuthorityRail',
  source_path = 'tools/planning-db/migrations/760_code_working_tree_query_ownership_cleanup.sql',
  source_content_sha256 = md5('CodeWorkingTreeSync:command-only-leaf:760'),
  updated_at = now()
where component_id = 'web.component.code.CodeWorkingTreeSync';

do $$
begin
  if exists (
    select 1
    from planning_query_store.frontend_component_local_cq_rails
    where component_id = 'web.component.code.CodeWorkingTreeSync'
      and rail_name = 'GetWorkspaceFileContent'
  ) then
    raise exception 'CodeWorkingTreeSync still claims the CodeView read query';
  end if;

  if not exists (
    select 1
    from planning_query_store.frontend_component_local_cq_rails
    where component_id = 'web.component.code.CodeWorkingTreeSync'
      and rail_name = 'SaveWorkspaceFileContent'
      and rail_kind = 'command'
  ) then
    raise exception 'CodeWorkingTreeSync lost its canonical persistence command';
  end if;
end
$$;
