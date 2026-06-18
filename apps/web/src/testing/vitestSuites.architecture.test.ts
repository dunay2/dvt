/**
 * @ownedConcern Validate that the web Vitest governance component remains
 * documented as a semantic test-routing boundary.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { readRepoFile, webRoot } from './vitestSuites.architecture.support';

describe('web Vitest suite governance documentation', () => {
  it('documents the governed web test boundary as a semantic component', () => {
    const suiteCatalog = readFileSync(resolve(webRoot, 'vitest.suites.ts'), 'utf8');
    const componentGuide = readRepoFile(
      'docs/architecture/components/web/frontend-test-governance-component.md'
    );
    const userStories = readRepoFile(
      'docs/architecture/components/web/frontend-test-governance-user-stories.md'
    );
    const suitePartitionPlan = readRepoFile(
      'docs/planning/proposals/mandatory/frontend-and-ux/web-vitest-suite-partition-plan-20260517.md'
    );
    const webIndex = readRepoFile('docs/architecture/components/web/index.md');

    expect(suiteCatalog).toMatch(/^\/\*\*\s*\n \* @ownedConcern Own the web Vitest suite catalog/);
    expect(componentGuide).toContain('Public API');
    expect(componentGuide).toContain('Invariants');
    expect(componentGuide).toContain('Transitions');
    expect(componentGuide).toContain('Consumers');
    expect(componentGuide).toContain('WebVitestSuiteCatalog');
    expect(webIndex).toContain('Web Vitest changed suite router component');
    expect(userStories).toContain('F-14');
    expect(suitePartitionPlan).toContain('featureId: WEB-VITEST-SUITE-PARTITION-20260517');
    expect(suitePartitionPlan).toContain('fowlerSignals:');
    expect(suitePartitionPlan).toContain('vitestSuites.architecture.test.ts');
    expect(webIndex).toContain('Frontend test governance component');
  });
});
