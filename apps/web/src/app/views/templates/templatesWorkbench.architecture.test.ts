/**
 * Owned concern: guard Templates presentation ownership and its existing command/query seams.
 * Why: visual alignment cannot move preview semantics or introduce an independent style policy.
 * Corner: the shared-token asset does not grant provider or Monaco authority to the route.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const REPO_ROOT = path.resolve(__dirname, '../../../../../..');
const APP_ROOT = path.resolve(__dirname, '../..');

function readAppSource(relativePath: string): string {
  return readFileSync(path.join(APP_ROOT, relativePath), 'utf8');
}

function readRepoDoc(relativePath: string): string {
  return readFileSync(path.join(REPO_ROOT, relativePath), 'utf8');
}

describe('Templates workbench architecture', () => {
  it('keeps template semantics in the pure presentation model', () => {
    const routeSource = readAppSource('views/TemplatesView.tsx');
    const workbenchSource = readAppSource('views/templates/TemplatesRouteWorkbench.tsx');
    const modelSource = readAppSource('views/templates/templatesViewModel.ts');

    expect(routeSource).toContain('Owned concern: adapt Templates route command state');
    expect(workbenchSource).toContain('Owned concern: render Templates route slots');
    expect(modelSource).toContain('Owned concern: own execution-template catalog');
    expect(workbenchSource).toContain('resolveExecutionTemplatePreview');
    expect(workbenchSource).not.toMatch(/\bfetch\s*\(/);
    expect(workbenchSource).not.toMatch(/\bdispatch\b|\bpersist\b|\bapply\b/i);
  });

  it('keeps Templates visual rules in its tokenized asset and the existing view boundaries', () => {
    const route = readAppSource('views/TemplatesView.tsx');
    const workbench = readAppSource('views/templates/TemplatesRouteWorkbench.tsx');
    const preview = readAppSource('views/templates/TemplateMonacoPreviewPanel.tsx');
    const styles = readAppSource('views/templates/templatesPresentation.module.css');

    for (const source of [route, workbench, preview]) {
      expect(source).toContain('templatesPresentation.module.css');
      expect(source).not.toMatch(/\bstyle=|\btext-(?:sm|base|lg|xl|2xl)\b/);
    }
    expect(route).toContain('function TemplatesViewHeader');
    expect(workbench).not.toContain('function TemplatesViewHeader');
    expect(workbench).not.toContain('templates-validation-state');
    expect(preview).toContain('templates-validation-state');
    expect(styles).not.toMatch(/#[\da-f]{3,8}\b|\brgba?\(/i);
    expect(styles).toContain('var(--text-ui)');
    expect(styles).toContain('var(--shell-control-height)');
    for (const [, size] of styles.matchAll(/font-size:\s*([^;]+);/g))
      expect(size).toBe('var(--text-ui)');
  });

  it('maps canonical template command and query rails to implementation surfaces', () => {
    const routeSource = readAppSource('views/TemplatesView.tsx');
    const modelSource = readAppSource('views/templates/templatesViewModel.ts');
    const ownSource = readFileSync(__filename, 'utf8');
    const rails = {
      listProfiles: ['List', 'Execution', 'Template', 'Profiles'].join(''),
      selectProfile: ['Select', 'Execution', 'Template', 'Profile'].join(''),
      updateParameter: ['Update', 'Execution', 'Template', 'Parameter', 'Value'].join(''),
    };

    for (const railName of Object.values(rails)) {
      expect(ownSource).not.toMatch(new RegExp(`\\b${railName}\\b`));
    }

    expect(modelSource).toMatch(new RegExp(`\\b${rails.listProfiles}\\b`));
    expect(routeSource).toMatch(new RegExp(`\\b${rails.selectProfile}\\b`));
    expect(routeSource).toMatch(new RegExp(`\\b${rails.updateParameter}\\b`));
  });

  it('documents public API, invariants, transitions, consumers, and user stories', () => {
    const componentDoc = readRepoDoc(
      'docs/architecture/components/web/templates/execution-template-source-generation-component.md'
    );
    const storiesDoc = readRepoDoc(
      'docs/architecture/components/web/templates/execution-template-source-generation-component.md'
    );

    expect(componentDoc).toContain('## Public API');
    expect(componentDoc).toContain('## Invariants');
    expect(componentDoc).toContain('## Transitions');
    expect(componentDoc).toContain('## Consumers');
    expect(componentDoc).toContain('GenerateExecutionTemplatePreview');
    expect(storiesDoc).toContain('US-TEMPLATES-001');
    expect(storiesDoc).toContain('US-TEMPLATES-005');
    expect(componentDoc).toContain('Generated source is read-only route output');
    expect(componentDoc).toContain('No provider execution or apply action');
    expect(componentDoc).toContain('No backend persistence');
  });

  it('registers Templates as a DVT shell route instead of a Canvas workbench tab', () => {
    const dvtContributionSource = readAppSource('plugins/dvt/dvtContributions.ts');

    expect(dvtContributionSource).toContain("id: 'dvt.templates'");
    expect(dvtContributionSource).toContain("path: '/templates'");
    expect(dvtContributionSource).toContain("kind: 'shell-nav'");
    expect(dvtContributionSource).not.toContain("tabId: 'templates'");
  });
});
