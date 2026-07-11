import {
  SourceImportCatalogFilterList,
  SourceImportCatalogEmptyState,
  SourceImportCatalogGroup,
  SourceImportCatalogGroups,
  SourceImportDatabaseHeader,
  SourceImportLocatorGroup,
  SourceImportObjectCard,
  SourceImportObjectList,
  SourceImportSchemaHeader,
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
  onActivateSourceObject: (index: number) => void;
  onSelectFilter: (filterId: SourceImportCatalogFilterId) => void;
  onToggleDatabase: (database: SourceImportDatabaseIdentity) => void;
  onToggleSchema: (schema: SourceImportSchemaIdentity) => void;
  onToggleSourceObject: (index: number) => void;
}>;

export function SourceImportCatalogView({
  catalog,
  emptyLabel,
  onActivateSourceObject,
  onSelectFilter,
  onToggleDatabase,
  onToggleSchema,
  onToggleSourceObject,
}: SourceImportCatalogViewProps): JSX.Element {
  const filterList = (
    <SourceImportCatalogFilterList
      label={catalog.filterListLabel}
      filters={catalog.categoryFilters}
      onSelectFilter={onSelectFilter}
    />
  );
  const hasVisibleObjects = catalog.databaseGroups.length > 0 || catalog.locatorGroups.length > 0;

  if (!hasVisibleObjects) {
    return (
      <SourceImportCatalogGroups>
        {filterList}
        <SourceImportCatalogEmptyState>{emptyLabel}</SourceImportCatalogEmptyState>
      </SourceImportCatalogGroups>
    );
  }

  return (
    <SourceImportCatalogGroups>
      {filterList}
      {catalog.relationGroup ? (
        <SourceImportLocatorGroup group={catalog.relationGroup}>
          {catalog.databaseGroups.map((databaseGroup) => (
            <SourceImportCatalogGroup key={databaseGroup.database}>
              <SourceImportDatabaseHeader
                database={databaseGroup.database}
                accessibilityLabel={databaseGroup.accessibilityLabel}
                schemaCountLabel={databaseGroup.schemaCountLabel}
                objectCountLabel={databaseGroup.objectCountLabel}
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
                    objectCountLabel={schemaGroup.objectCountLabel}
                    onToggle={() =>
                      onToggleSchema({
                        database: databaseGroup.database,
                        schema: schemaGroup.schema,
                      })
                    }
                  />
                  <SourceImportObjectList>
                    {schemaGroup.sourceObjects.map((sourceObject) => (
                      <SourceImportObjectCard
                        key={sourceObject.identityKey}
                        sourceObject={sourceObject}
                        onActivate={() => onActivateSourceObject(sourceObject.index)}
                        onToggle={() => onToggleSourceObject(sourceObject.index)}
                      />
                    ))}
                  </SourceImportObjectList>
                </div>
              ))}
            </SourceImportCatalogGroup>
          ))}
        </SourceImportLocatorGroup>
      ) : null}
      {catalog.locatorGroups.map((locatorGroup) => (
        <SourceImportLocatorGroup key={locatorGroup.locatorKind} group={locatorGroup}>
          <SourceImportObjectList>
            {locatorGroup.sourceObjects.map((sourceObject) => (
              <SourceImportObjectCard
                key={sourceObject.identityKey}
                sourceObject={sourceObject}
                onActivate={() => onActivateSourceObject(sourceObject.index)}
                onToggle={() => onToggleSourceObject(sourceObject.index)}
              />
            ))}
          </SourceImportObjectList>
        </SourceImportLocatorGroup>
      ))}
    </SourceImportCatalogGroups>
  );
}
