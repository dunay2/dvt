import { useState } from 'react';

import {
  SourceImportCatalogEmptyState,
  SourceImportCatalogFilterList,
  SourceImportCatalogGroup,
  SourceImportCatalogGroups,
  SourceImportCatalogLoadingState,
  SourceImportCatalogLoadMoreButton,
  SourceImportDatabaseHeader,
  SourceImportLocatorGroup,
  SourceImportObjectCard,
  SourceImportObjectList,
  SourceImportSchemaDisclosure,
  SourceImportSchemaHeader,
  SourceImportSchemaObjects,
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
  loadMoreLabel?: string;
  loadingLabel?: string;
  onActivateSourceObject: (index: number) => void;
  onExpandSchema?: (schema: SourceImportSchemaIdentity) => void;
  onLoadMoreSchema?: (schema: SourceImportSchemaIdentity, cursor: string) => void;
  onSelectFilter: (filterId: SourceImportCatalogFilterId) => void;
  onToggleDatabase: (database: SourceImportDatabaseIdentity) => void;
  onToggleSchema: (schema: SourceImportSchemaIdentity) => void;
  onToggleSourceObject: (index: number) => void;
  revealMatchingSchemas?: boolean;
}>;

export function SourceImportCatalogView({
  catalog,
  emptyLabel,
  loadMoreLabel = 'Load more',
  loadingLabel = 'Loading...',
  onActivateSourceObject,
  onExpandSchema,
  onLoadMoreSchema,
  onSelectFilter,
  onToggleDatabase,
  onToggleSchema,
  onToggleSourceObject,
  revealMatchingSchemas = false,
}: SourceImportCatalogViewProps): JSX.Element {
  const [expandedSchemaKeys, setExpandedSchemaKeys] = useState<ReadonlySet<string>>(
    () => new Set()
  );

  const setSchemaExpanded = (
    schemaIdentity: SourceImportSchemaIdentity,
    loaded: boolean,
    loading: boolean,
    expanded: boolean
  ) => {
    const schemaKey = buildSourceImportSchemaKey(schemaIdentity);
    setExpandedSchemaKeys((currentKeys) => {
      const nextKeys = new Set(currentKeys);
      if (expanded) nextKeys.add(schemaKey);
      else nextKeys.delete(schemaKey);
      return nextKeys;
    });
    if (expanded && !loaded && !loading) onExpandSchema?.(schemaIdentity);
  };

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
                selectable={databaseGroup.selectable}
                selectedLabel={databaseGroup.selectedLabel}
                onToggle={() => onToggleDatabase({ database: databaseGroup.database })}
              />
              {databaseGroup.schemaGroups.map((schemaGroup) => {
                const schemaIdentity = {
                  database: databaseGroup.database,
                  schema: schemaGroup.schema,
                };
                const schemaKey = buildSourceImportSchemaKey(schemaIdentity);
                const expanded = revealMatchingSchemas || expandedSchemaKeys.has(schemaKey);

                return (
                  <SourceImportSchemaDisclosure
                    key={schemaKey}
                    expanded={expanded}
                    onExpandedChange={(nextExpanded) =>
                      setSchemaExpanded(
                        schemaIdentity,
                        schemaGroup.loaded,
                        schemaGroup.loading,
                        nextExpanded
                      )
                    }
                  >
                    <SourceImportSchemaHeader
                      schema={schemaGroup.schema}
                      canonicalName={schemaGroup.canonicalName}
                      accessibilityLabel={schemaGroup.accessibilityLabel}
                      expandAccessibilityLabel={schemaGroup.expandAccessibilityLabel}
                      collapseAccessibilityLabel={schemaGroup.collapseAccessibilityLabel}
                      schemaIdentityKey={schemaKey}
                      expanded={expanded}
                      selected={schemaGroup.selected}
                      selectable={schemaGroup.selectable}
                      objectCountLabel={schemaGroup.objectCountLabel}
                      onToggle={() => onToggleSchema(schemaIdentity)}
                    />
                    <SourceImportSchemaObjects>
                      {schemaGroup.loading ? (
                        <SourceImportCatalogLoadingState>
                          {loadingLabel}
                        </SourceImportCatalogLoadingState>
                      ) : null}
                      {schemaGroup.sourceObjects.map((sourceObject) => (
                        <SourceImportObjectCard
                          key={sourceObject.identityKey}
                          sourceObject={sourceObject}
                          onActivate={() => onActivateSourceObject(sourceObject.index)}
                          onToggle={() => onToggleSourceObject(sourceObject.index)}
                        />
                      ))}
                      {schemaGroup.nextCursor ? (
                        <SourceImportCatalogLoadMoreButton
                          disabled={schemaGroup.loading}
                          onClick={() =>
                            onLoadMoreSchema?.(schemaIdentity, schemaGroup.nextCursor!)
                          }
                        >
                          {loadMoreLabel}
                        </SourceImportCatalogLoadMoreButton>
                      ) : null}
                    </SourceImportSchemaObjects>
                  </SourceImportSchemaDisclosure>
                );
              })}
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
