export const artifactsViewCopy = {
  title: 'dbt Artifacts',
  subtitle:
    'Explore immutable dbt artifacts and import a local `manifest.json` for offline graph inspection.',
  importTitle: 'Import Manifest',
  importDropIdle: 'Drop manifest.json here',
  importDropLoading: 'Parsing manifest...',
  importDropHint:
    'or click to browse - supports dbt manifests with standard `nodes`, `sources`, and dependency metadata',
  importSuccess: 'imported successfully',
  importClear: 'Clear',
  artifactsTitle: 'Server Artifacts',
  previewManifest: 'Preview: manifest.json',
  previewRunResults: 'Preview: run_results.json',
  previewCatalog: 'Preview: catalog.json',
  viewFullFile: 'View Full File',
  infoTitle: 'About dbt Artifacts',
  infoBody:
    'dbt generates these JSON artifacts after each run. They contain metadata about your project structure, execution results, and database catalog. DVT+ reads these immutable artifacts to provide state-driven UI without executing SQL directly. Import a local manifest.json above to explore the graph without a backend connection.',
  focusedGitSha: 'a3f2b91',
};
