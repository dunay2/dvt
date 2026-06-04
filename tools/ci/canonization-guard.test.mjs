import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  createCanonizationGuard,
  requiredCanonPlanTokens,
  requiredComponentGuideHeadings,
} from './canonization-guard.mjs';

test('canonization guard checks canonical plans instead of raw intake files', () => {
  const files = new Map([
    [
      'docs/planning/proposals/mandatory/example-canon-plan.md',
      [
        '# Example Canon Plan',
        '## Fowler Analysis',
        '```feature-mechanization',
        'commandQueryRails:',
        'fowlerSignals:',
        'completionGate:',
        '```',
      ].join('\n'),
    ],
    [
      'docs/architecture/components/example-component.md',
      [
        '# Example Component',
        '## Public API',
        '## Invariants',
        '## Transitions',
        '## Consumers',
        '## Command And Query Rail',
        '## Semantic Fitness Function',
      ].join('\n'),
    ],
  ]);
  const guard = createCanonizationGuard({
    readFile(path) {
      if (!files.has(path)) {
        throw new Error(`Unexpected read: ${path}`);
      }
      return files.get(path);
    },
  });

  assert.equal(requiredCanonPlanTokens.includes('## Fowler Analysis'), true);
  assert.equal(requiredComponentGuideHeadings.includes('## Command And Query Rail'), true);
  assert.doesNotThrow(() =>
    guard.assertCanonPlan('docs/planning/proposals/mandatory/example-canon-plan.md')
  );
  assert.doesNotThrow(() =>
    guard.assertComponentGuide('docs/architecture/components/example-component.md')
  );
});

test('canonization guard reports missing canonical semantics', () => {
  const guard = createCanonizationGuard({
    readFile() {
      return '# Thin Plan\n';
    },
  });

  assert.throws(
    () => guard.assertCanonPlan('docs/planning/proposals/mandatory/thin-plan.md'),
    /must contain ## Fowler Analysis/
  );
});
