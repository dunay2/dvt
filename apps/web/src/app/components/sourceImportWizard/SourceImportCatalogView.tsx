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
  revealMatchingSchemas?: boolean;
}>;

export function SourceImportCatalogView({
  catalog,
  emptyLabel,
  onActivateSourceObject,
  onSelectFilter,
  onToggleDatabase,
  onToggleSchema,
  onToggleSourceObject,
  revealMatchingSchemas = false,
}: SourceImportCatalogViewProps): JSX.Element {
  const selectedSchemaKeys = useMemo(
    () =>
      catalog.databaseGroups.flatMap((databaseGroup) =>
        databaseGroup.schemaGroups
          .filter((schemaGroup) => schemaGroup.selected)
          .map((schemaGroup) =>
            buildSourceImportSchemaKey({
              database: databaseGroup.database,
              schema: schemaGroup.schema,
            })
          )
      ),
    [catalog.databaseGroups]
  );
  const [expandedSchemaKeys, setExpandedSchemaKeys] = useState<ReadonlySet<string>>(
    () => new Set(selectedSchemaKeys)
  );

  useEffect(() => {
    if (selectedSchemaKeys.length === 0) {
      return;
    }
    setExpandedSchemaKeys((currentKeys) => {
      const nextKeys = new Set(currentKeys);
      let changed = false;
      selectedSchemaKeys.forEach((key) => {
        if (!nextKeys.has(key)) {
          nextKeys.add(key);
          changed = true;
        }
      });
      return changed ? nextKeys : currentKeys;
    });
  }, [selectedSchemaKeys]);

  const setSchemaExpanded = (schemaKey: string, expanded: boolean) => {
    setExpandedSchemaKeys((currentKeys) => {
      const nextKeys = new Set(currentKeys);
      if (expanded) {
        nextKeys.add(schemaKey);
      } else {
        nextKeys.delete(schemaKey);
      }
      return nextKeys;
    });
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
                  <Collapsible
                    key={schemaKey}
                    open={expanded}
                    onOpenChange={(nextExpanded) => setSchemaExpanded(schemaKey, nextExpanded)}
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
                      objectCountLabel={schemaGroup.objectCountLabel}
                      onToggle={() => {
                        setSchemaExpanded(schemaKey, true);
                        onToggleSchema(schemaIdentity);
                      }}
                    />
                    <CollapsibleContent>
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
                    </CollapsibleContent>
                  </Collapsible>
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
import { useEffect, useMemo, useState } from 'react';

import { Collapsible, CollapsibleContent } from '../ui/collapsible';
