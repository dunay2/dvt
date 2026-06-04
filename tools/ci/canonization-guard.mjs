import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

export const requiredCanonPlanTokens = [
  '## Fowler Analysis',
  '```feature-mechanization',
  'commandQueryRails:',
  'fowlerSignals:',
  'completionGate:',
];

export const requiredFowlerAnalysisCategories = [
  {
    label: 'mature-system comparison or improved pattern',
    patterns: [
      /## Mature-System Comparison/u,
      /### Mature-System Comparison/u,
      /## Improved Patterns/u,
      /### Improved Patterns/u,
      /Mature workbench/u,
    ],
  },
  {
    label: 'antipattern or drift',
    patterns: [
      /## Antipatterns/u,
      /### Antipatterns/u,
      /## Anti-patterns/u,
      /### Anti-patterns/u,
      /Drift/u,
    ],
  },
  {
    label: 'applied pattern, grouping, or future lesson',
    patterns: [
      /## Applied Pattern/u,
      /### Applied Pattern/u,
      /## Grouping Opportunities/u,
      /### Grouping Opportunities/u,
      /## Component Grouping/u,
      /### Component Grouping/u,
      /## Future Lessons/u,
      /### Future Lessons/u,
      /## Lessons For Future Work/u,
      /### Lessons For Future Work/u,
    ],
  },
];

export const requiredComponentGuideHeadings = [
  '## Public API',
  '## Invariants',
  '## Transitions',
  '## Consumers',
  '## Command And Query Rail',
  '## Semantic Fitness Function',
];

export function createCanonizationGuard(deps = {}) {
  const readFile =
    deps.readFile || ((path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8'));

  function readRepoFile(path) {
    return readFile(path);
  }

  function assertFilesExist(paths) {
    for (const path of paths) {
      assert.doesNotThrow(() => readRepoFile(path), `${path} must exist`);
    }
  }

  function assertContains(path, expected) {
    assert.match(
      readRepoFile(path),
      typeof expected === 'string' ? new RegExp(escapeRegExp(expected)) : expected,
      `${path} must contain ${expected.toString()}`
    );
  }

  function assertTextContains(label, text, expected) {
    assert.match(
      text,
      typeof expected === 'string' ? new RegExp(escapeRegExp(expected)) : expected,
      `${label} must contain ${expected.toString()}`
    );
  }

  function assertCanonPlan(path, extraTokens = []) {
    const plan = readRepoFile(path);
    for (const token of [...requiredCanonPlanTokens, ...extraTokens]) {
      assertTextContains(path, plan, token);
    }
    for (const category of requiredFowlerAnalysisCategories) {
      assert.ok(
        category.patterns.some((pattern) => pattern.test(plan)),
        `${path} must contain a Fowler analysis category: ${category.label}`
      );
    }
    return plan;
  }

  function assertComponentGuide(path, extraTokens = []) {
    const componentGuide = readRepoFile(path);
    for (const heading of [...requiredComponentGuideHeadings, ...extraTokens]) {
      assertTextContains(path, componentGuide, heading);
    }
    return componentGuide;
  }

  return {
    assertCanonPlan,
    assertComponentGuide,
    assertContains,
    assertFilesExist,
    assertTextContains,
    readRepoFile,
  };
}

export const defaultCanonizationGuard = createCanonizationGuard();
export const assertCanonPlan = defaultCanonizationGuard.assertCanonPlan;
export const assertComponentGuide = defaultCanonizationGuard.assertComponentGuide;
export const assertContains = defaultCanonizationGuard.assertContains;
export const assertFilesExist = defaultCanonizationGuard.assertFilesExist;
export const assertTextContains = defaultCanonizationGuard.assertTextContains;
export const readRepoFile = defaultCanonizationGuard.readRepoFile;

export function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
