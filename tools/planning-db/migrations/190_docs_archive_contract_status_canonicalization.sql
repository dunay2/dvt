-- Keep archived component contracts out of architecture-drift.
-- The archive leaves themselves remain deprecated; their documentation contract
-- rows stay implemented because architecture-drift treats deprecated contracts
-- as active remediation findings.

update architecture.contract
set
  status = 'implemented',
  contract_ref = contract_ref
    || ' Historical/deprecated component; contract row remains implemented so architecture-drift tracks real drift rather than intentional archive classification.',
  updated_at = now()
where owner_component_id like 'SYS-DOCS-ARCHIVE-%'
  and contract_id like 'CONTRACT-SYS-DOCS-ARCHIVE-%-DOCS'
  and status = 'deprecated';
