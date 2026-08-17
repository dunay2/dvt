// @vitest-environment jsdom

import { fireEvent, getByRole } from '@testing-library/dom';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { sourceImportCatalogNumberFormatter, sourceImportWizardCopy } from './copy';
import {
  buildSourceImportCatalogViewModel,
  type SourceImportCatalogViewModel,
} from './sourceImportCatalogModel';
import { SourceImportCatalogView } from './SourceImportCatalogView';
import {
  buildSourceImportTestEndpointObject,
  buildSourceImportTestFileObject,
  buildSourceImportTestObject,
  buildSourceImportTestStreamObject,
} from './sourceImportWizard.testFixtures';
import type { SelectableSourceObject } from './types';

describe('SourceImportCatalogView', () => {
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
    act(() => root.unmount());
    container.remove();
  });

  function buildCatalog(
    sourceObjects: readonly SelectableSourceObject[] = [buildSourceImportTestObject()]
  ): SourceImportCatalogViewModel {
    return buildSourceImportCatalogViewModel({
      sourceObjects,
      activeSourceObjectKey: null,
      copy: sourceImportWizardCopy.catalog,
      numberFormatter: sourceImportCatalogNumberFormatter,
    });
  }

  it('keeps relational selection and inspection as separate accessible interactions', async () => {
    const onActivateSourceObject = vi.fn();
    const onToggleSourceObject = vi.fn();
    const onToggleSchema = vi.fn();
    const relation = buildSourceImportTestObject({
      columns: [{ name: 'order_id', type: 'INTEGER', nullable: false }],
    });

    await act(async () => {
      root.render(
        <SourceImportCatalogView
          catalog={buildCatalog([relation])}
          emptyLabel="No source objects"
          onActivateSourceObject={onActivateSourceObject}
          onSelectFilter={vi.fn()}
          onToggleDatabase={vi.fn()}
          onToggleSchema={onToggleSchema}
          onToggleSourceObject={onToggleSourceObject}
        />
      );
    });

    expect(container.textContent).toContain('RAW.ERP.ORDERS');
    expect(container.textContent).not.toContain('order_id');
    expect(container.textContent).not.toContain('INTEGER');
    expect(container.querySelectorAll('[data-slot="metric-evidence-hotspot"]')).toHaveLength(0);

    const inspectAction = getByRole(container, 'button', {
      name: 'Inspect source object RAW.ERP.ORDERS metadata. 1,500 rows. 3.9 MB. 1 column.',
    });
    const selectAction = getByRole(container, 'checkbox', {
      name: 'Select source object RAW.ERP.ORDERS. 1,500 rows. 3.9 MB. 1 column.',
    });
    const schemaSelectAction = getByRole(container, 'checkbox', {
      name: 'Select source schema ERP. In source database RAW. 1 object.',
    });

    await act(async () => {
      fireEvent.click(inspectAction);
      fireEvent.click(selectAction);
      fireEvent.click(schemaSelectAction);
    });

    expect(onActivateSourceObject).toHaveBeenCalledWith(0);
    expect(onToggleSourceObject).toHaveBeenCalledWith(0);
    expect(onToggleSchema).toHaveBeenCalledWith({ database: 'RAW', schema: 'ERP' });
  });

  it('renders every SourceObject kind and disables unsupported imports without hiding inspection', async () => {
    const onActivateSourceObject = vi.fn();
    const file = buildSourceImportTestFileObject();

    await act(async () => {
      root.render(
        <SourceImportCatalogView
          catalog={buildCatalog([
            buildSourceImportTestObject(),
            file,
            buildSourceImportTestEndpointObject(),
            buildSourceImportTestStreamObject(),
          ])}
          emptyLabel="No source objects"
          onActivateSourceObject={onActivateSourceObject}
          onSelectFilter={vi.fn()}
          onToggleDatabase={vi.fn()}
          onToggleSchema={vi.fn()}
          onToggleSourceObject={vi.fn()}
        />
      );
    });

    expect(container.textContent).toContain('Relations');
    expect(container.textContent).toContain('Files');
    expect(container.textContent).toContain('Endpoints');
    expect(container.textContent).toContain('Streams');
    const fileSelection = container.querySelector<HTMLButtonElement>(
      `[data-source-import-object-select="${file.objectId}"]`
    );
    expect(fileSelection?.disabled).toBe(true);
    expect(container.textContent).toContain('This importer currently attaches relational');

    await act(async () => {
      fireEvent.click(
        getByRole(container, 'button', {
          name: 'Inspect source object /landing/orders.parquet metadata. 1,500 rows. 3.9 MB. 0 columns.',
        })
      );
    });

    expect(onActivateSourceObject).toHaveBeenCalledWith(1);
  });

  it('keeps filters usable when the active category has no matches', async () => {
    const onSelectFilter = vi.fn();
    const catalog = buildSourceImportCatalogViewModel({
      sourceObjects: [buildSourceImportTestObject()],
      activeSourceObjectKey: null,
      filterId: 'selected',
      copy: sourceImportWizardCopy.catalog,
      numberFormatter: sourceImportCatalogNumberFormatter,
    });

    await act(async () => {
      root.render(
        <SourceImportCatalogView
          catalog={catalog}
          emptyLabel="No source objects"
          onActivateSourceObject={vi.fn()}
          onSelectFilter={onSelectFilter}
          onToggleDatabase={vi.fn()}
          onToggleSchema={vi.fn()}
          onToggleSourceObject={vi.fn()}
        />
      );
    });

    expect(container.textContent).toContain('No source objects');
    await act(async () => {
      fireEvent.click(
        getByRole(container, 'button', { name: 'Filter source catalog by All. 1 object.' })
      );
    });
    expect(onSelectFilter).toHaveBeenCalledWith('all');
  });

  it('uses collision-free schema identities for dotted database and schema names', async () => {
    await act(async () => {
      root.render(
        <SourceImportCatalogView
          catalog={buildCatalog([
            buildSourceImportTestObject({ database: 'RAW.PROD', schema: 'PUBLIC' }),
            buildSourceImportTestObject({ database: 'RAW', schema: 'PROD.PUBLIC' }),
          ])}
          emptyLabel="No source objects"
          onActivateSourceObject={vi.fn()}
          onSelectFilter={vi.fn()}
          onToggleDatabase={vi.fn()}
          onToggleSchema={vi.fn()}
          onToggleSourceObject={vi.fn()}
        />
      );
    });

    const identities = Array.from(container.querySelectorAll('[data-source-import-schema]')).map(
      (element) => element.getAttribute('data-source-import-schema')
    );
    expect(identities).toHaveLength(2);
    expect(new Set(identities).size).toBe(2);
  });
});
