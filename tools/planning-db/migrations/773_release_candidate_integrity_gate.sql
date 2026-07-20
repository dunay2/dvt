-- Design the release candidate integrity boundary before implementation.
-- Release Please remains the release generator; this component only admits or
-- rejects one generated candidate and keeps external policy behind adapters.

insert into architecture.component (
  component_id, name, kind, layer, owner, repo_path, public_contract,
  runtime, criticality, status, maturity_score, parent_component_id
)
values (
  'SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY',
  'Release candidate integrity gate',
  'module',
  'infra',
  'ReleaseCandidateIntegrityGate',
  'tools/ci/release-candidate-integrity',
  'Coordinate exact-tree candidate assessment through explicit Git, GitHub policy, and workflow adapters without generating releases.',
  'node',
  'high',
  'planned',
  0,
  'SYS-CI-GOVERNANCE-TOOLS-CI'
)
on conflict (component_id) do update set
  name = excluded.name,
  kind = excluded.kind,
  layer = excluded.layer,
  owner = excluded.owner,
  repo_path = excluded.repo_path,
  public_contract = excluded.public_contract,
  runtime = excluded.runtime,
  criticality = excluded.criticality,
  status = excluded.status,
  maturity_score = excluded.maturity_score,
  parent_component_id = excluded.parent_component_id,
  updated_at = now();

insert into architecture.component_responsibility (
  responsibility_id, component_id, responsibility, reason_to_change,
  ddd_owner, status
)
values (
  'RESP-CI-RELEASE-CANDIDATE-INTEGRITY',
  'SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY',
  'Coordinate release candidate admission without owning release generation, Git object access, GitHub policy mutation, or check publication details.',
  'The release candidate admission lifecycle changes.',
  'ReleaseCandidateIntegrityGate',
  'planned'
)
on conflict (responsibility_id) do update set
  responsibility = excluded.responsibility,
  reason_to_change = excluded.reason_to_change,
  ddd_owner = excluded.ddd_owner,
  status = excluded.status;

insert into architecture.design (
  design_id, work_item_id, title, owner, status, rationale,
  fowler_signal, rail_ref, approved_at
)
values (
  'RELEASE-CANDIDATE-INTEGRITY-20260719',
  'C-RELEASE-CANDIDATE-INTEGRITY-1',
  'One admitted release identity per merged pull request',
  'ReleaseCandidateIntegrityGate',
  'implementing',
  'Keep Release Please as generator, collapse product PR history through squash, and place exact Git reads, repository policy mutation, pure admission rules, and check publication behind distinct boundaries.',
  'evolutionary_architecture',
  'ConfigureReleasePullRequestMergePolicy; AssessReleaseCandidateIntegrity; PublishReleaseCandidateIntegrityCheck',
  now()
)
on conflict (design_id) do update set
  status = excluded.status,
  rationale = excluded.rationale,
  fowler_signal = excluded.fowler_signal,
  rail_ref = excluded.rail_ref,
  approved_at = excluded.approved_at,
  updated_at = now();

insert into architecture.design_scope (
  design_id, subject_kind, subject_id, scope_kind, required
)
values
  ('RELEASE-CANDIDATE-INTEGRITY-20260719', 'component', 'SYS-CI-GOVERNANCE-TOOLS-CI-RELEASE-CANDIDATE-INTEGRITY', 'may_create', true),
  ('RELEASE-CANDIDATE-INTEGRITY-20260719', 'path', '.github/workflows/release.yml', 'may_update', true),
  ('RELEASE-CANDIDATE-INTEGRITY-20260719', 'path', '.github/workflows/pr-quality-gate.yml', 'may_update', true),
  ('RELEASE-CANDIDATE-INTEGRITY-20260719', 'path', 'release-please-config.json', 'may_update', true),
  ('RELEASE-CANDIDATE-INTEGRITY-20260719', 'path', 'tools/ci/release-candidate-integrity', 'may_create', true)
on conflict (design_id, subject_kind, subject_id, scope_kind) do update set
  required = excluded.required;
