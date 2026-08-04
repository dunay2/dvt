/** Owned concern: centralize object-file PostgreSQL authoring layout tokens. */
export const objectFilePostgresAuthoringClasses = {
  root: 'space-y-5',
  section: 'space-y-3',
  separatedSection: 'space-y-3 border-t border-slate-800 pt-4',
  field: 'space-y-2',
  twoColumnGrid: 'grid grid-cols-2 gap-3',
  sectionHeader: 'flex items-center justify-between gap-3',
  mapping: 'space-y-3 rounded border border-slate-800 p-3',
  mappingFooter: 'flex items-end gap-3',
  mappingType: 'min-w-0 flex-1 space-y-2',
  nullable: 'flex h-9 items-center gap-2',
  icon: 'size-4',
} as const;
