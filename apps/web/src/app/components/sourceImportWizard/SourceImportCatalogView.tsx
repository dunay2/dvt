import {
  SourceImportCatalogFilterList,
  SourceImportCatalogEmptyState,
  SourceImportDatabaseGroup,
  SourceImportDatabaseHeader,
  SourceImportSchemaGroups,
  SourceImportSchemaHeader,
  SourceImportSchemaTableList,
  SourceImportTableCard,
} from './SourceImportCatalogPrimitives';
import {
  buildSourceImportSchemaKey,
  type SourceImportCatalogFilterId,
  type SourceImportCatalogViewModel,
} from './sourceImportCatalogModel';
import type { SourceImportDatabaseIdentity, SourceImportSchemaIdentity } from './types';

type SourceImportCatalogViewProps = Readonly<{
  catalog: SourceImportCatalogViewModel;
  emptyLabel: string;
  onActivateTable: (index: number) => void;
  onSelectFilter: (filterId: SourceImportCatalogFilterId) => void;
  onToggleDatabase: (database: SourceImportDatabaseIdentity) => void;
  onToggleSchema: (schema: SourceImportSchemaIdentity) => void;
  onToggleTable: (index: number) => void;
}>;

export function SourceImportCatalogView({
  catalog,
  emptyLabel,
  onActivateTable,
  onSelectFilter,
  onToggleDatabase,
  onToggleSchema,
  onToggleTable,
}: SourceImportCatalogViewProps): JSX.Element {
  const filterList = (
    <SourceImportCatalogFilterList
      label={catalog.filterListLabel}
      filters={catalog.categoryFilters}
      onSelectFilter={onSelectFilter}
    />
  );

  if (catalog.databaseGroups.length === 0) {
    return (
      <SourceImportSchemaGroups>
        {filterList}
        <SourceImportCatalogEmptyState>{emptyLabel}</SourceImportCatalogEmptyState>
      </SourceImportSchemaGroups>
    );
  }

  return (
    <SourceImportSchemaGroups>
      {filterList}
      {catalog.databaseGroups.map((databaseGroup) => (
        <SourceImportDatabaseGroup key={databaseGroup.database}>
          <SourceImportDatabaseHeader
            database={databaseGroup.database}
            accessibilityLabel={databaseGroup.accessibilityLabel}
            schemaCountLabel={databaseGroup.schemaCountLabel}
            tableCountLabel={databaseGroup.tableCountLabel}
            selected={databaseGroup.selected}
            selectedLabel={databaseGroup.selectedLabel}
            onToggle={() => onToggleDatabase({ database: databaseGroup.database })}
          />
          {databaseGroup.schemaGroups.map((schemaGroup) => (
            <div key={`${databaseGroup.database}.${schemaGroup.schema}`}>
              <SourceImportSchemaHeader
                schema={schemaGroup.schema}
                accessibilityLabel={schemaGroup.accessibilityLabel}
                schemaIdentityKey={buildSourceImportSchemaKey({
                  database: databaseGroup.database,
                  schema: schemaGroup.schema,
                })}
                selected={schemaGroup.selected}
                tableCountLabel={schemaGroup.tableCountLabel}
                onToggle={() =>
                  onToggleSchema({
                    database: databaseGroup.database,
                    schema: schemaGroup.schema,
                  })
                }
              />
              <SourceImportSchemaTableList>
                {schemaGroup.tables.map((table) => (
                  <SourceImportTableCard
                    key={table.identityKey}
                    table={table}
                    onActivate={() => onActivateTable(table.index)}
                    onToggle={() => onToggleTable(table.index)}
                  />
                ))}
              </SourceImportSchemaTableList>
            </div>
          ))}
        </SourceImportDatabaseGroup>
      ))}
    </SourceImportSchemaGroups>
  );
}
