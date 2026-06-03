/** Owned concern: guard Plugins capability table semantic ownership and documentation closure. */
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const APP_ROOT = path.resolve(import.meta.dirname, '../../../..');
const REPO_ROOT = path.resolve(APP_ROOT, '../..');

function readAppSource(relativePathFromApp: string): string {
  return readFileSync(path.join(APP_ROOT, relativePathFromApp), 'utf8');
}

function readRepoDoc(relativePathFromRepo: string): string {
  return readFileSync(path.join(REPO_ROOT, relativePathFromRepo), 'utf8');
}

describe('Plugins capability table architecture', () => {
  it('keeps dense plugin catalog UX behind a component with semantic docs and route ownership', () => {
    const route = readAppSource('src/app/views/PluginsView.tsx');
    const workbench = readAppSource('src/app/views/plugins/PluginsRouteWorkbench.tsx');
    const table = readAppSource('src/app/views/plugins/PluginCapabilityTable.tsx');
    const model = readAppSource('src/app/views/plugins/pluginsViewModel.ts');
    const componentGuide = readRepoDoc(
      'docs/architecture/components/web/plugins/plugin-capability-table-component.md'
    );
    const userStories = readRepoDoc(
      'docs/architecture/components/web/plugins/plugin-capability-table-user-stories.md'
    );

    expect(route).toContain('Owned concern: adapt the Plugins route query state');
    expect(route).toContain('RouteWorkbenchFrame');
    expect(route).not.toContain('PluginCapabilityTable');

    expect(workbench).toContain('PluginCapabilityTable');
    expect(workbench).not.toContain('PluginCard');

    expect(table).toContain('Owned concern: render the Plugins route capability catalog table');
    expect(table).toContain('data-slot="plugin-capability-table"');
    expect(table).toContain('data-slot="plugin-catalog-search"');
    expect(table).toContain('data-slot="plugin-backend-state-filter"');
    expect(table).toContain('data-slot="plugin-capability-detail"');
    expect(table).toContain('resolvePluginReadiness');
    expect(table).not.toContain('useCapabilitiesQuery');

    expect(model).toContain('PluginReadinessItem');
    expect(model).toContain('searchPlaceholder');

    for (const requiredSection of [
      '## Public API',
      '## Invariants',
      '## Transitions',
      '## Consumers',
      '## Architecture',
    ]) {
      expect(componentGuide).toContain(requiredSection);
    }

    for (const story of ['US-F25-PCT-001', 'US-F25-PCT-002', 'US-F25-PCT-003']) {
      expect(userStories).toContain(story);
    }
  });
});
