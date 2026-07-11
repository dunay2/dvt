-- Approve the hard-cut contract for revisioned workspace-file writes before
-- changing the existing SaveWorkspaceFileContent rail implementation.

insert into architecture.design (
  design_id,
  work_item_id,
  title,
  owner,
  status,
  rationale,
  fowler_signal,
  rail_ref,
  approved_at
)
values (
  'WORKSPACE-FILE-REVISION-CAS-20260711',
  'E-DBT-PROJECT-ROUNDTRIP-1',
  'Workspace file revision compare-and-swap',
  'Project Workspace I/O',
  'approved',
  'File-backed dbt authoring cannot permit a browser buffer or generated artifact write to overwrite a newer workspace file. The existing read and save rails gain a content revision, explicit expected revision, conflict receipt, and atomic replacement without introducing dbt-specific synonyms.',
  'anemic_domain',
  'GetWorkspaceFileContent;SaveWorkspaceFileContent',
  now()
)
on conflict (design_id) do update set
  status = excluded.status,
  rationale = excluded.rationale,
  fowler_signal = excluded.fowler_signal,
  rail_ref = excluded.rail_ref,
  approved_at = coalesce(architecture.design.approved_at, excluded.approved_at),
  updated_at = now();

insert into architecture.design_scope (
  design_id,
  subject_kind,
  subject_id,
  scope_kind,
  required
)
values
  ('WORKSPACE-FILE-REVISION-CAS-20260711', 'component', 'SYS-API-APPLICATION-PORTS', 'may_update', true),
  ('WORKSPACE-FILE-REVISION-CAS-20260711', 'component', 'SYS-API-APPLICATION-SERVICES-WORKSPACE', 'may_update', true),
  ('WORKSPACE-FILE-REVISION-CAS-20260711', 'component', 'SYS-API-INFRA-WORKSPACE-FILES', 'must_prove', true),
  ('WORKSPACE-FILE-REVISION-CAS-20260711', 'component', 'SYS-API-HTTP-WORKSPACE-ROUTES', 'must_prove', true),
  ('WORKSPACE-FILE-REVISION-CAS-20260711', 'component', 'SYS-WEB-SERVICES-WORKSPACE', 'must_prove', true),
  ('WORKSPACE-FILE-REVISION-CAS-20260711', 'decision', 'ADR-0060', 'must_prove', true)
on conflict (design_id, subject_kind, subject_id, scope_kind) do update set
  required = excluded.required;

insert into architecture.contract (
  contract_id,
  contract_kind,
  owner_component_id,
  contract_ref,
  compatibility,
  status,
  validation_command
)
values (
  'CONTRACT-WORKSPACE-FILE-REVISION-CAS-V1',
  'port',
  'SYS-API-APPLICATION-PORTS',
  'apps/api/src/application/ports/workspaceFiles.ts',
  'breaking',
  'approved',
  'pnpm --filter dvt-api exec vitest run test/infrastructure/workspaceFiles/LocalWorkspaceFileRepository.test.ts test/entrypoints/http/workspaceFilesRoutes.test.ts'
)
on conflict (contract_id) do update set
  contract_kind = excluded.contract_kind,
  owner_component_id = excluded.owner_component_id,
  contract_ref = excluded.contract_ref,
  compatibility = excluded.compatibility,
  status = excluded.status,
  validation_command = excluded.validation_command,
  updated_at = now();
