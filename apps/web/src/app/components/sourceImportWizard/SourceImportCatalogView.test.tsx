// @vitest-environment jsdom

import { fireEvent, getByRole } from '@testing-library/dom';
import React, { act, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { sourceImportCatalogNumberFormatter, sourceImportWizardCopy } from './copy';
import {
  buildSourceImportCatalogViewModel,
  type SourceImportCatalogViewModel,
} from './sourceImportCatalogModel';
import { SourceImportDatabaseHeader } from './SourceImportCatalogPrimitives';
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

  it('lets database counts reflow inside the available catalog width', async () => {
    await act(async () => {
      root.render(
        <SourceImportDatabaseHeader
          database="dvt"
          accessibilityLabel="Select database dvt"
          schemaCountLabel="11 schemas"
          objectCountLabel="234 objects"
          selected={false}
          selectedLabel={null}
          onToggle={vi.fn()}
        />
      );
    });

    const headerContent = container.querySelector('[data-source-import-database="dvt"] > div');
    const metrics = container.querySelector('[data-slot="source-import-database-metrics"]');

    expect(headerContent?.className).toContain('min-w-0');
    expect(metrics?.className).toContain('min-w-0');
    expect(metrics?.className).toContain('flex-wrap');
    expect(metrics?.textContent).toContain('11 schemas');
    expect(metrics?.textContent).toContain('234 objects');
  });

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

    expect(
      container.querySelector(`[data-source-import-object="${relation.objectId}"]`)
    ).toBeNull();
    expect(container.textContent).not.toContain('order_id');
    expect(container.textContent).not.toContain('INTEGER');
    expect(container.querySelectorAll('[data-slot="metric-evidence-hotspot"]')).toHaveLength(0);

    const schemaDisclosure = getByRole(container, 'button', {
      name: 'Expand source schema ERP. In source database RAW. 1 object.',
    });

    await act(async () => {
      fireEvent.click(schemaDisclosure);
    });

    expect(
      container.querySelector(`[data-source-import-object="${relation.objectId}"]`)
    ).not.toBeNull();
    expect(container.textContent).toContain('ORDERS');
    expect(container.textContent).not.toContain('RAW.ERP.ORDERS');

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

  it('delegates a table-row double click to the existing selection toggle', async () => {
    const onActivateSourceObject = vi.fn();
    const onToggleSourceObject = vi.fn();
    const relation = buildSourceImportTestObject();

    function StatefulCatalog(): JSX.Element {
      const [selected, setSelected] = useState(false);
      return (
        <SourceImportCatalogView
          catalog={buildCatalog([{ ...relation, selected }])}
          emptyLabel="No source objects"
          onActivateSourceObject={onActivateSourceObject}
          onSelectFilter={vi.fn()}
          onToggleDatabase={vi.fn()}
          onToggleSchema={vi.fn()}
          onToggleSourceObject={(index) => {
            onToggleSourceObject(index);
            setSelected((current) => !current);
          }}
        />
      );
    }

    await act(async () => {
      root.render(<StatefulCatalog />);
    });

    await act(async () => {
      fireEvent.click(
        getByRole(container, 'button', {
          name: 'Expand source schema ERP. In source database RAW. 1 object.',
        })
      );
    });

    const tableRow = container.querySelector(`[data-source-import-object="${relation.objectId}"]`);
    expect(tableRow).not.toBeNull();

    await act(async () => {
      fireEvent.doubleClick(tableRow!);
    });

    expect(onToggleSourceObject).toHaveBeenCalledOnce();
    expect(onToggleSourceObject).toHaveBeenCalledWith(0);
    expect(onActivateSourceObject).not.toHaveBeenCalled();
    expect(
      getByRole(container, 'checkbox', {
        name: 'Select source object RAW.ERP.ORDERS. 1,500 rows. 3.9 MB. 0 columns.',
      }).getAttribute('aria-checked')
    ).toBe('true');

    await act(async () => {
      fireEvent.doubleClick(tableRow!);
    });

    expect(onToggleSourceObject).toHaveBeenCalledTimes(2);
    expect(
      getByRole(container, 'checkbox', {
        name: 'Select source object RAW.ERP.ORDERS. 1,500 rows. 3.9 MB. 0 columns.',
      }).getAttribute('aria-checked')
    ).toBe('false');
  });

  it('applies one net toggle when the double click starts on the checkbox', async () => {
    const onToggleSourceObject = vi.fn();
    const relation = buildSourceImportTestObject();

    await act(async () => {
      root.render(
        <SourceImportCatalogView
          catalog={buildCatalog([relation])}
          emptyLabel="No source objects"
          onActivateSourceObject={vi.fn()}
          onSelectFilter={vi.fn()}
          onToggleDatabase={vi.fn()}
          onToggleSchema={vi.fn()}
          onToggleSourceObject={onToggleSourceObject}
        />
      );
    });

    await act(async () => {
      fireEvent.click(
        getByRole(container, 'button', {
          name: 'Expand source schema ERP. In source database RAW. 1 object.',
        })
      );
    });

    const checkbox = getByRole(container, 'checkbox', {
      name: 'Select source object RAW.ERP.ORDERS. 1,500 rows. 3.9 MB. 0 columns.',
    });

    await act(async () => {
      fireEvent.click(checkbox, { detail: 1 });
      fireEvent.click(checkbox, { detail: 2 });
      fireEvent.doubleClick(checkbox);
    });

    expect(onToggleSourceObject).toHaveBeenCalledOnce();
  });

  it('reveals a collapsed schema when its selection is toggled', async () => {
    const relation = buildSourceImportTestObject();

    await act(async () => {
      root.render(
        <SourceImportCatalogView
          catalog={buildCatalog([relation])}
          emptyLabel="No source objects"
          onActivateSourceObject={vi.fn()}
          onSelectFilter={vi.fn()}
          onToggleDatabase={vi.fn()}
          onToggleSchema={vi.fn()}
          onToggleSourceObject={vi.fn()}
        />
      );
    });

    expect(
      container.querySelector(`[data-source-import-object="${relation.objectId}"]`)
    ).toBeNull();

    await act(async () => {
      fireEvent.click(
        getByRole(container, 'checkbox', {
          name: 'Select source schema ERP. In source database RAW. 1 object.',
        })
      );
    });

    expect(
      container.querySelector(`[data-source-import-object="${relation.objectId}"]`)
    ).not.toBeNull();
  });

  it('renders every SourceObject kind and disables unsupported imports without hiding inspection', async () => {
    const onActivateSourceObject = vi.fn();
    const onToggleSourceObject = vi.fn();
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
          onToggleSourceObject={onToggleSourceObject}
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

    await act(async () => {
      fireEvent.doubleClick(
        container.querySelector(`[data-source-import-object="${file.objectId}"]`)!
      );
    });

    expect(onToggleSourceObject).not.toHaveBeenCalled();
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
