// @vitest-environment jsdom

import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SourceImportMetadataPanel } from './SourceImportMetadataPanel';
import { buildSourceImportTestObject } from './sourceImportWizard.testFixtures';

describe('SourceImportMetadataPanel', () => {
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

  it('separates per-object metadata from options that affect the complete selection', async () => {
    const selectedSourceObjects = [
      buildSourceImportTestObject({ selected: true }),
      buildSourceImportTestObject({ schema: 'CRM', table: 'CUSTOMERS', selected: true }),
    ];

    await act(async () => {
      root.render(
        <SourceImportMetadataPanel
          sourceObjects={selectedSourceObjects}
          activeSourceObjectKey={selectedSourceObjects[1]?.objectId ?? null}
          scope="selected"
          groupingStrategy="schema"
          sourceImportOptions={[]}
          sourceImportOptionValues={{
            includeColumns: true,
            addTests: false,
            addFreshness: false,
          }}
          onGroupingChange={vi.fn()}
          onSourceImportOptionChange={vi.fn()}
        />
      );
    });

    const objectRegion = container.querySelector('[data-source-import-object-metadata-region]');
    const globalRegion = container.querySelector('[data-source-import-global-options-region]');

    expect(objectRegion).not.toBeNull();
    expect(globalRegion).not.toBeNull();
    expect(objectRegion?.querySelectorAll('[data-source-import-object-metadata]')).toHaveLength(2);
    expect(globalRegion?.querySelector('[data-source-import-object-metadata]')).toBeNull();
    expect(objectRegion?.querySelector('[data-source-import-grouping-option]')).toBeNull();
    expect(globalRegion?.querySelector('[data-source-import-grouping-option]')).not.toBeNull();
  });
});
