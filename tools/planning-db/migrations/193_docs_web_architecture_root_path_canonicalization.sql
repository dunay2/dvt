-- Canonicalize the web architecture root leaf path after the physical split.
-- The aggregate parent owns the directory path; the root-record leaf anchors on
-- index.md while retaining its file ownership pattern through local definitions.

update architecture.component
set
  repo_path = 'docs/architecture/components/web/index.md',
  public_contract = 'Web architecture root documentation boundary. Anchored at index.md; owns root web architecture records via docs/architecture/components/web/*.',
  updated_at = now()
where
  component_id = 'SYS-DOCS-ARCHITECTURE-WEB-ROOT-RECORDS'
  and repo_path = 'docs/architecture/components/web';
