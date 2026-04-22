export const sourceImportWizardCopy = {
  title: 'DataObject Registry',
  description:
    'Choose a source type, discover candidate data objects, and register them into the current workspace graph',
  databaseOnlyError: 'Only Database is available in the current product slice',
  selectConnectionError: 'Please select a connection',
  selectAtLeastOneTableError: 'Please select at least one table',
  loadConnectionsError: 'Failed to load warehouse connections.',
  loadTablesError: 'Failed to load warehouse tables.',
  importSuccess: 'Data objects registered successfully',
  importNoop: 'Selected data objects are already present in the workspace graph',
  importError: 'Failed to register data objects.',
  sourceType: {
    title: 'Choose data source type',
    description: 'Select which kind of DataObject you want to discover and register into the graph',
    availabilityNote:
      'This slice supports real registration only for Database. File, API, and Stream remain visible to establish the DataObject Registry boundary.',
  },
  connection: {
    title: 'Choose database connection',
    description:
      'Choose which database connection should be used to discover candidate data objects',
    loading: 'Loading connections...',
  },
  selection: {
    title: 'Select Tables',
    descriptionPrefix: 'Choose tables to register as data objects. Selected:',
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
    title: 'Review & Confirm',
    description: 'Review your DataObject Registry configuration before proceeding',
    previewTitle: 'Registry preview',
  },
  result: {
    title: 'Registry update complete',
    description: 'Your selected tables have been registered into the workspace graph',
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
