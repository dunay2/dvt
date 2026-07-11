// @vitest-environment jsdom

import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { sourceImportCatalogNumberFormatter, sourceImportWizardCopy } from './copy';
import { SourceImportReviewView } from './SourceImportReviewView';
import { buildSourceImportObjectViewModel } from './sourceImportCatalogModel';
import type { SourceImportObjectViewModel } from './sourceImportCatalogModel';
import { buildSourceImportReviewPreviewGroups } from './sourceImportReviewModel';
import { buildSourceImportTestObject } from './sourceImportWizard.testFixtures';
import type { SelectableRelationalSourceObject } from './types';

function buildRelation(
  overrides?: Parameters<typeof buildSourceImportTestObject>[0]
): SelectableRelationalSourceObject {
  return buildSourceImportTestObject({
    selected: true,
    columns: [{ name: 'order_id', type: 'INTEGER', nullable: false }],
    constraints: [{ name: 'orders_pkey', kind: 'primary-key', columns: ['order_id'] }],
    ...overrides,
  });
}

function buildSelectedObject(
  sourceObject: SelectableRelationalSourceObject,
  index = 0
): SourceImportObjectViewModel {
  return buildSourceImportObjectViewModel(
    sourceObject,
    index,
    sourceImportWizardCopy.catalog,
    sourceImportCatalogNumberFormatter
  );
}

describe('SourceImportReviewView', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it('renders the governed source registry path for each selected attachment group', async () => {
    const selectedSourceObjects = [
      buildRelation({ database: 'RAW', schema: 'ERP', table: 'ORDERS' }),
      buildRelation({ database: 'RAW', schema: 'ERP', table: 'CUSTOMERS' }),
    ];

    await act(async () => {
      root.render(
        <SourceImportReviewView
          selectedSourceObjects={selectedSourceObjects.map((sourceObject, index) =>
            buildSelectedObject(sourceObject, index)
          )}
          previewGroups={buildSourceImportReviewPreviewGroups({
            sourceObjects: selectedSourceObjects,
            groupingStrategy: 'schema',
            copy: sourceImportWizardCopy.catalog,
            numberFormatter: sourceImportCatalogNumberFormatter,
          })}
          selectedCount={2}
          groupingStrategy="schema"
          selectedConnectionName="Local warehouse"
          sourceImportOptions={[]}
          sourceImportOptionValues={{
            includeColumns: true,
            addTests: false,
            addFreshness: false,
          }}
          onRemoveSourceObject={vi.fn()}
        />
      );
    });

    expect(container.textContent).toContain('Local warehouse');
    expect(container.textContent).toContain('2');
    expect(container.textContent).toContain(sourceImportWizardCopy.review.registryFileLabel);
    expect(container.textContent).toContain('models/sources/src_erp.yml');
    expect(container.textContent).toContain('1,500 rows');
    expect(container.textContent).toContain('3.9 MB');
    expect(container.textContent).toContain('1 column');
    expect(
      container.querySelector(
        `[data-source-import-review-object="${selectedSourceObjects[0]?.objectId}"]`
      )
    ).not.toBeNull();
    expect(
      container.querySelector('[data-source-import-registry-path="models/sources/src_erp.yml"]')
    ).not.toBeNull();
  });

  it('keeps review automation selectors separate from display names when identifiers contain dots', async () => {
    const selectedSourceObjects = [
      buildRelation({ database: 'RAW.PROD', schema: 'PUBLIC', table: 'ORDERS' }),
      buildRelation({ database: 'RAW', schema: 'PROD.PUBLIC', table: 'ORDERS' }),
    ];
    const selectedObjectViewModels = selectedSourceObjects.map((sourceObject, index) =>
      buildSelectedObject(sourceObject, index)
    );

    await act(async () => {
      root.render(
        <SourceImportReviewView
          selectedSourceObjects={selectedObjectViewModels}
          previewGroups={buildSourceImportReviewPreviewGroups({
            sourceObjects: selectedSourceObjects,
            groupingStrategy: 'database',
            copy: sourceImportWizardCopy.catalog,
            numberFormatter: sourceImportCatalogNumberFormatter,
          })}
          selectedCount={2}
          groupingStrategy="database"
          selectedConnectionName="Local warehouse"
          sourceImportOptions={[]}
          sourceImportOptionValues={{
            includeColumns: true,
            addTests: false,
            addFreshness: false,
          }}
          onRemoveSourceObject={vi.fn()}
        />
      );
    });

    expect(container.textContent).toContain('RAW.PROD.PUBLIC.ORDERS');
    expect(
      Array.from(container.querySelectorAll('[data-source-import-review-object]')).map((element) =>
        element.getAttribute('data-source-import-review-object')
      )
    ).toEqual(selectedObjectViewModels.map((sourceObject) => sourceObject.identityKey));
  });
});
