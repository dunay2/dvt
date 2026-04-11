export const diffViewCopy = {
  title: 'Diff Viewer',
  subtitle: 'Compare contract and graph changes across revisions.',
  compareLabel: 'Compare:',
  allChanges: 'All Changes',
  breakingOnly: 'Breaking Only',
  compareModes: {
    git: 'Git SHA Diff',
    run: 'Run Diff',
  },
  tabs: {
    graph: 'Graph Diff',
    sql: 'SQL Diff',
    catalog: 'Catalog Diff',
  },
  summary: {
    added: 'Added',
    removed: 'Removed',
    changed: 'Changed',
    breaking: 'Breaking',
  },
  states: {
    loadingTitle: 'Loading diff review',
    loadingMessage: 'Fetching the current revision changes for this comparison.',
    emptyTitle: 'No diff changes available',
    emptyMessage:
      'There are no graph or contract deltas to review for the current comparison context.',
    errorTitle: 'Unable to load diff review',
    graphEmptyTitle: 'No changes match this filter',
    graphEmptyMessage:
      'Try All Changes or switch the severity filter to restore the diff review list.',
    compareContextLoadingTitle: 'Loading compare context',
    compareContextLoadingMessage:
      'Fetching graph metadata so SQL and catalog review can be rendered.',
    compareContextUnavailableTitle: 'Compare context unavailable',
    compareContextUnavailableMessage:
      'The changed node is not available in the current workspace graph, so SQL and catalog review cannot be rendered yet.',
    sqlPreviewLoadingTitle: 'Loading SQL preview',
    sqlPreviewLoadingMessage:
      'Fetching the current workspace file so the SQL diff can be rendered.',
    sqlPreviewErrorTitle: 'Unable to load SQL preview',
  },
  valueLabels: {
    old: 'Old Value:',
    next: 'New Value:',
  },
  sql: {
    title: 'Compiled SQL Diff: fct_sales',
    old: 'a3f2b91 (old)',
    next: 'b7e4c22 (new)',
  },
  catalog: {
    title: 'Catalog Changes: fct_sales',
    added: 'Column Added',
    removed: 'Column Removed',
    typeChanged: 'Type Changed',
  },
} as const;
