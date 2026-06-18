-- Repoint the Fowler inbox architecture anchor to a tracked Fowler analysis
-- file. The previous post-import anchor used an IDE-open file that is not a
-- repository source and therefore cannot satisfy component integrity.

update architecture.component
set
  repo_path = 'buzon/20260423-codex-fowler-access-decision-component-analysis-and-remediation.md',
  updated_at = now()
where component_id = 'SYS-REPO-METADATA-FOWLER-INBOX';
