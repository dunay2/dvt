import {
  SourceImportCatalogEmptyState,
  SourceImportSchemaGroups,
  SourceImportSchemaHeader,
  SourceImportSchemaTableList,
  SourceImportTableCard,
} from './SourceImportCatalogPrimitives';
import type { SourceImportCatalogViewModel } from './sourceImportWizardModel';

type SourceImportCatalogViewProps = Readonly<{
  catalog: SourceImportCatalogViewModel;
  emptyLabel: string;
  onToggleSchema: (schema: string) => void;
  onToggleTable: (index: number) => void;
}>;

export function SourceImportCatalogView({
  catalog,
  emptyLabel,
  onToggleSchema,
  onToggleTable,
}: SourceImportCatalogViewProps): JSX.Element {
  if (catalog.schemaGroups.length === 0) {
    return <SourceImportCatalogEmptyState>{emptyLabel}</SourceImportCatalogEmptyState>;
  }

  return (
    <SourceImportSchemaGroups>
      {catalog.schemaGroups.map((schemaGroup) => (
        <div key={schemaGroup.schema}>
          <SourceImportSchemaHeader
            schema={schemaGroup.schema}
            selected={schemaGroup.selected}
            tableCountLabel={schemaGroup.tableCountLabel}
            onToggle={() => onToggleSchema(schemaGroup.schema)}
          />
          <SourceImportSchemaTableList>
            {schemaGroup.tables.map((table) => (
              <SourceImportTableCard
                key={table.canonicalName}
                table={table}
                onToggle={() => onToggleTable(table.index)}
              />
            ))}
          </SourceImportSchemaTableList>
        </div>
      ))}
    </SourceImportSchemaGroups>
  );
}
