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

  it('documents public API, invariants, transitions, consumers, and user stories', () => {
    const componentDoc = readRepoDoc(
      'docs/architecture/components/web/templates/execution-template-source-generation-component.md'
    );
    const storiesDoc = readRepoDoc(
      'docs/architecture/components/web/templates/execution-template-source-generation-user-stories.md'
    );
    const implementationPlan = readRepoDoc(
      'docs/planning/proposals/mandatory/frontend-and-ux/f21-execution-template-source-generation-workbench-plan-20260522.md'
    );

    expect(componentDoc).toContain('## Public API');
    expect(componentDoc).toContain('## Invariants');
    expect(componentDoc).toContain('## Transitions');
    expect(componentDoc).toContain('## Consumers');
    expect(componentDoc).toContain('GenerateExecutionTemplatePreview');
    expect(storiesDoc).toContain('US-TEMPLATES-001');
    expect(storiesDoc).toContain('US-TEMPLATES-005');
    expect(implementationPlan).toContain(
      'featureId: F21-EXECUTION-TEMPLATE-SOURCE-GENERATION-WORKBENCH-20260522'
    );
    expect(implementationPlan).toContain('Documentation drift');
    expect(implementationPlan).toContain('Hidden authority');
  });

  it('registers Templates as a DVT shell route instead of a Canvas workbench tab', () => {
    const dvtContributionSource = readAppSource('plugins/dvt/dvtContributions.ts');

    expect(dvtContributionSource).toContain("id: 'dvt.templates'");
    expect(dvtContributionSource).toContain("path: '/templates'");
    expect(dvtContributionSource).toContain("kind: 'shell-nav'");
    expect(dvtContributionSource).not.toContain("tabId: 'templates'");
  });
});
