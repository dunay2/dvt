-- Keep the legacy CLI path deprecated at component level without creating an
-- extra architecture drift warning from its evidence contract.

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
  'PLANNING-DB-RUNTIME-CLI-LEGACY-CONTRACT-DRIFT-SANITIZATION-20260618',
  'WEB-PHYSICAL-MODULE-DECOMPOSITION-DEBT-20260508',
  'Planning DB runtime CLI legacy contract drift sanitization',
  'Architecture / Runtime / Planning DB',
  'review',
  'The legacy packages/cli path is deprecated at component level. Marking its evidence contract deprecated produces a duplicate architecture_drift warning even though the retired file is already represented by SYS-RUNTIME-CLI-VALIDATION-LEGACY-LOOSE-PACKAGE. The contract should remain implemented as evidence for the deprecated component.',
  'boundary_drift',
  'RunRuntimeCliValidation;ReadComponentProfile;CheckPlanningDbComponentIntegrity',
  null
)
on conflict (design_id) do update set
  status = excluded.status,
  rationale = excluded.rationale,
  fowler_signal = excluded.fowler_signal,
  rail_ref = excluded.rail_ref,
  updated_at = now();

insert into architecture.design_scope (
  design_id,
  subject_kind,
  subject_id,
  scope_kind,
  required
)
values
  (
    'PLANNING-DB-RUNTIME-CLI-LEGACY-CONTRACT-DRIFT-SANITIZATION-20260618',
    'component',
    'SYS-RUNTIME-CLI-VALIDATION-LEGACY-LOOSE-PACKAGE',
    'may_reference',
    true
  ),
  (
    'PLANNING-DB-RUNTIME-CLI-LEGACY-CONTRACT-DRIFT-SANITIZATION-20260618',
    'contract',
    'CONTRACT-SYS-RUNTIME-CLI-VALIDATION-LEGACY-LOOSE-PACKAGE-PATH',
    'may_update',
    true
  ),
  (
    'PLANNING-DB-RUNTIME-CLI-LEGACY-CONTRACT-DRIFT-SANITIZATION-20260618',
    'path',
    'packages/cli/validate-contracts.cjs',
    'may_reference',
    true
  )
on conflict (design_id, subject_kind, subject_id, scope_kind) do update set
  required = excluded.required;

update architecture.contract
set
  status = 'implemented',
  contract_ref = 'packages/cli/validate-contracts.cjs evidence contract for deprecated loose validator path; the component status carries deprecation.',
  validation_command = 'rg -n "packages/cli|validate-contracts.cjs|@dvt/cli"',
  updated_at = now()
where contract_id = 'CONTRACT-SYS-RUNTIME-CLI-VALIDATION-LEGACY-LOOSE-PACKAGE-PATH';
