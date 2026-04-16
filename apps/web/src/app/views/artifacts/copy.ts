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
  artifactsTitle: 'Loaded Artifacts',
  routeLoadingTitle: 'Loading artifacts',
  routeLoadingMessage: 'Artifacts are loading from the current workspace.',
  routeEmptyTitle: 'No artifacts loaded',
  routeEmptyMessage:
    'No manifest, run results, or catalog artifacts are available in the current workspace. Import a local `manifest.json` to inspect dbt metadata here.',
  routeErrorTitle: 'Artifacts unavailable',
  routeErrorMessage:
    'Artifacts could not be loaded from the current workspace. Retry after the workspace service is available again.',
  invalidImportTitle: 'Manifest import rejected',
  invalidImportMessagePrefix: 'The selected file could not be used as a dbt manifest.',
  previewManifest: 'Preview: manifest.json',
  previewRunResults: 'Preview: run_results.json',
  previewCatalog: 'Preview: catalog.json',
  previewUnavailableTitle: 'Artifact preview unavailable',
  previewUnavailableMessage:
    'This artifact is not loaded in the current workspace or imported manifest set yet.',
  viewFullFile: 'View Full File',
  infoTitle: 'About dbt Artifacts',
  infoBody:
    'dbt generates these JSON artifacts after each run. They contain metadata about your project structure, execution results, and database catalog. DVT+ reads these immutable artifacts to provide state-driven UI without executing SQL directly. Import a local manifest.json above to explore the graph without a backend connection.',
};
