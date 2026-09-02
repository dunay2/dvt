// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  buildSourceObject,
  buildWarehouseSourceImportPort,
  createSourceImportWizardHarness,
} from './SourceImportWizard.testHarness';
import { useApplicationLanguageStore } from '../stores/applicationLanguageStore';

describe('SourceImportWizard connection navigation', () => {
  let harness: ReturnType<typeof createSourceImportWizardHarness>;

  beforeEach(() => {
    useApplicationLanguageStore.getState().configureApplicationLanguage('en');
    harness = createSourceImportWizardHarness();
  });

  afterEach(() => {
    harness.cleanup();
    useApplicationLanguageStore.getState().configureApplicationLanguage('en');
  });

  it('opens Browse and loads its source objects when a connection is selected', async () => {
    const listSourceObjects = vi.fn(async () => [buildSourceObject()]);
    await harness.renderWizard({
      warehouseSourceImport: buildWarehouseSourceImportPort({ listSourceObjects }),
    });

    expect(harness.findTab('Browse')?.disabled).toBe(true);

    await harness.clickConnectionOption('Local Postgres proof');
    await harness.flushPendingWork();

    expect(harness.findTab('Browse')?.getAttribute('aria-selected')).toBe('true');
    expect(listSourceObjects).toHaveBeenCalledWith('conn-1');
  });
});
