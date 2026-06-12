export const sourceImportWizardCopy = {
  title: 'Add source',
  description:
    'Explore governed connections, choose source tables, inspect metadata, and attach selected origins to the canvas.',
  databaseOnlyError: 'Only Database is available in the current product slice',
  selectConnectionError: 'Please select a connection',
  selectAtLeastOneTableError: 'Please select at least one table',
  loadConnectionsError: 'Failed to load warehouse connections.',
  loadTablesError: 'Failed to load warehouse tables.',
  importSuccess: 'Sources attached successfully',
  importNoop: 'Selected data objects are already present in the workspace graph',
  importError: 'Failed to register data objects.',
  sourceType: {
    title: 'Choose source connection',
    description:
      'Start from a real governed source provider before browsing tables for the canvas.',
    availabilityNote:
      'This slice supports real attachment only for Database sources. File, API, and Stream remain visible as governed source categories until their real rails are implemented.',
  },
  connection: {
    title: 'Choose database connection',
    description:
      'Choose which database connection should be used to discover candidate data objects',
    loading: 'Loading connections...',
    searchLabel: 'Search governed connections',
    catalogSource: 'Catalog: .dvt/warehouse-connections.json',
    empty: 'No governed database connections found.',
    emptyHint: 'Add database connections to the workspace catalog before importing sources.',
    noMatches: 'No governed connections match the current search.',
  },
  selection: {
    title: 'Browse source tables',
    descriptionPrefix: 'Choose tables to attach as source nodes. Selected:',
    loading: 'Loading tables...',
    empty: 'No tables available for this connection.',
    rowsSuffix: 'rows',
  },
  grouping: {
    title: 'Grouping Strategy',
    description: 'Choose how discovered tables should be grouped into registered data objects',
  },
  options: {
    title: 'Metadata Options',
    description: 'Configure what metadata to include when registering data objects',
  },
  review: {
    title: 'Selected sources',
    description: 'Review the selected source objects before attaching them to the canvas.',
    previewTitle: 'Canvas attachment preview',
  },
  result: {
    title: 'Sources attached',
    description: 'Your selected tables have been attached to the workspace graph.',
    noopTitle: 'No new data objects were added',
    noopDescription:
      'The selected tables are already registered, so Canvas did not need to materialize new source nodes.',
    filesTitle: 'Registry files created',
    warning:
      'Canvas queued the imported source ids and will focus them when protected draft authority refreshes. Persisted backend registry writes still require a dedicated API endpoint in `api` mode.',
    noopWarning:
      'Canvas stayed unchanged because the selected registry entries already existed in the workspace graph.',
  },
} as const;
