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
    removed: 'Column Removed',
    typeChanged: 'Type Changed',
  },
} as const;
