import { describe, expect, it } from 'vitest';

import { sourceImportWizardCopy } from './copy';
import { buildSourceImportCatalogViewModel } from './sourceImportCatalogModel';
import {
  buildSourceImportTestEndpointObject,
  buildSourceImportTestFileObject,
  buildSourceImportTestObject,
  buildSourceImportTestStreamObject,
} from './sourceImportWizard.testFixtures';

describe('sourceImportCatalogModel SourceObject semantics', () => {
  const copy = sourceImportWizardCopy.catalog;
  const numberFormatter = new Intl.NumberFormat('en-US');

  it('keeps every governed locator kind visible and categorizes non-relational objects', () => {
    const catalog = buildSourceImportCatalogViewModel({
      sourceObjects: [
        buildSourceImportTestObject(),
        buildSourceImportTestFileObject(),
        buildSourceImportTestEndpointObject(),
        buildSourceImportTestStreamObject(),
      ],
      activeSourceObjectKey: null,
      copy,
      numberFormatter,
    });

    expect(catalog.totalObjectCount).toBe(4);
    expect(catalog.visibleObjectCount).toBe(4);
    expect(catalog.databaseGroups).toHaveLength(1);
    expect(catalog.locatorGroups).toEqual([
      expect.objectContaining({
        locatorKind: 'file',
        label: 'Files',
        objectCountLabel: '1 object',
      }),
      expect.objectContaining({
        locatorKind: 'endpoint',
        label: 'Endpoints',
        objectCountLabel: '1 object',
      }),
      expect.objectContaining({
        locatorKind: 'stream',
        label: 'Streams',
        objectCountLabel: '1 object',
      }),
    ]);
  });

  it.each([
    ['file path', '/landing/orders.parquet', buildSourceImportTestFileObject()],
    ['endpoint resource', 'api.example.test', buildSourceImportTestEndpointObject()],
    ['stream protocol', 'kafka', buildSourceImportTestStreamObject()],
  ])(
    'searches a %s across provider-neutral locator fields',
    (_label, searchQuery, sourceObject) => {
      const catalog = buildSourceImportCatalogViewModel({
        sourceObjects: [buildSourceImportTestObject(), sourceObject],
        activeSourceObjectKey: null,
        searchQuery,
        copy,
        numberFormatter,
      });

      expect(catalog.visibleObjectCount).toBe(1);
      expect(catalog.activeSourceObject?.identityKey).toBe(sourceObject.objectId);
    }
  );

  it('exposes unsupported objects for inspection but never as selectable imports', () => {
    const file = buildSourceImportTestFileObject({ selected: true });
    const catalog = buildSourceImportCatalogViewModel({
      sourceObjects: [file],
      activeSourceObjectKey: file.objectId,
      copy,
      numberFormatter,
    });

    expect(catalog.activeSourceObject).toEqual(
      expect.objectContaining({
        locatorKind: 'file',
        canonicalName: '/landing/orders.parquet',
        selectable: false,
        selected: false,
        importabilityLabel:
          'Visible for inspection. This importer currently attaches relational source objects only.',
      })
    );
    expect(catalog.selectedObjectCount).toBe(0);
    expect(catalog.selectedSourceObjects).toEqual([]);
  });

  it('applies the importable filter without dropping non-relational objects from the catalog total', () => {
    const catalog = buildSourceImportCatalogViewModel({
      sourceObjects: [buildSourceImportTestObject(), buildSourceImportTestFileObject()],
      activeSourceObjectKey: null,
      filterId: 'importable',
      copy,
      numberFormatter,
    });

    expect(catalog.totalObjectCount).toBe(2);
    expect(catalog.visibleObjectCount).toBe(1);
    expect(catalog.databaseGroups[0]?.schemaGroups[0]?.sourceObjects).toHaveLength(1);
    expect(catalog.locatorGroups).toEqual([]);
  });
});
