import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  createCanonizationGuard,
  requiredCanonPlanTokens,
  requiredComponentGuideHeadings,
  requiredFowlerAnalysisCategories,
} from './canonization-guard.mjs';

test('canonization guard checks canonical plans instead of raw intake files', () => {
  const files = new Map([
    [
      'docs/planning/proposals/mandatory/example-canon-plan.md',
      [
        '# Example Canon Plan',
        '## Fowler Analysis',
        '## Mature-System Comparison',
        '## Antipatterns',
        '## Applied Pattern',
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
  assert.equal(requiredFowlerAnalysisCategories.length, 3);
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

test('canonization guard rejects plans without substantive Fowler analysis categories', () => {
  const guard = createCanonizationGuard({
    readFile() {
      return [
        '# Sparse Canon Plan',
        '## Fowler Analysis',
        '```feature-mechanization',
        'commandQueryRails:',
        'fowlerSignals:',
        'completionGate:',
        '```',
      ].join('\n');
    },
  });

  assert.throws(
    () => guard.assertCanonPlan('docs/planning/proposals/mandatory/sparse-plan.md'),
    /must contain a Fowler analysis category: mature-system comparison or improved pattern/
  );
});
