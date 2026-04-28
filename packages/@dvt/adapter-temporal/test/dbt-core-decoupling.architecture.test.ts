/**
 * Owned concern: verify DBT runtime ownership stays outside the Temporal core
 * activity dispatcher/factory boundary.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import ts from 'typescript';
import { describe, expect, it } from 'vitest';

const ACTIVITY_ROOT = join(import.meta.dirname, '../src/activities');
const DBT_PLUGIN_ROOT = join(import.meta.dirname, '../src/plugins/dbt');
const REPO_ROOT = join(import.meta.dirname, '../../../..');
const DBT_PROFILE_GUIDE = join(
  REPO_ROOT,
  'docs/architecture/components/engine/adapters/temporal/temporal-dbt-worker-plugin-profile.md'
);
const ACTIVE_DBT_DOCS = [
  'docs/evidence/ed-20260414-tf-c3-dbt-plugin-runtime-projection.md',
  'docs/evidence/ed-20260414-tf-c3-production-temporal-worker-dbt-host.md',
  'docs/planning/reviews/architecture-and-governance/20260421-temporal-fowler-provider-truth-follow-up-review.md',
  'docs/planning/reviews/architecture-and-governance/20260423-dvt-plus-system-architecture-review.md',
  'docs/planning/reviews/architecture-and-governance/20260424-dvt-plus-hard-architecture-review.md',
] as const;
const RETIRED_DBT_ACTIVITY_PATH =
  'packages/@dvt/adapter-temporal/src/activities/dbtStepActivity.ts';

const CORE_ACTIVITY_MODULES = [
  'activityFactory.ts',
  'activityTypes.ts',
  'stepActivities.ts',
  'stepActivityDispatcher.ts',
] as const;

describe('Temporal DBT core decoupling architecture', () => {
  it('declares semantic ownership for core activity modules', () => {
    const expectedOwnedConcerns = new Map<string, string>([
      [
        'activityFactory.ts',
        '@ownedConcern Compose Temporal core activities with optional worker-provided step registries.',
      ],
      [
        'activityTypes.ts',
        '@ownedConcern Define plugin-free Temporal activity contracts and dispatch types.',
      ],
      [
        'stepActivities.ts',
        '@ownedConcern Publish the Temporal activity public surface without owning plugin step kinds.',
      ],
      [
        'stepActivityDispatcher.ts',
        '@ownedConcern Dispatch workflow step work to core gateway or composed plugin activities.',
      ],
    ]);

    for (const [fileName, expectedOwnedConcern] of expectedOwnedConcerns.entries()) {
      expect(readCoreActivitySource(fileName)).toContain(expectedOwnedConcern);
    }
  });

  it('keeps DBT imports out of core activity modules', () => {
    for (const fileName of CORE_ACTIVITY_MODULES) {
      const source = readCoreActivitySource(fileName);

      expect(source).not.toContain('dbtStepActivity');
      expect(source).not.toContain('plugins/dbt');
      expect(source).not.toContain('DbtStepActivity');
      expect(source).not.toContain('DbtPluginRunner');
      expect(source).not.toContain('DbtPluginExecutionInput');
      expect(source).not.toContain('dbtPluginRunner');
    }
  });

  it('documents core registry ownership as plugin-free by default', () => {
    const dispatcherSource = readCoreActivitySource('stepActivityDispatcher.ts');

    expect(dispatcherSource).toContain('Core registry starts empty');
    expect(dispatcherSource).toContain('plugin activities are composed by worker profiles');
  });

  it('documents the DBT worker profile as the owner of DBT step-kind composition', () => {
    const guide = readFileSync(DBT_PROFILE_GUIDE, 'utf8');

    for (const heading of [
      '## Owned Concern',
      '## Public API',
      '## Invariants',
      '## Transitions',
      '## Consumers',
      '## Component Map',
      '## Diagrams',
      '## Drift Guards',
    ]) {
      expect(guide).toContain(heading);
    }

    expect(guide).toContain('createDbtStepActivityRegistry');
    expect(guide).toContain('`createDefaultStepActivityRegistry()` remains plugin-free');
    expect(guide).toContain('`ActivityDeps` remains free of `runExecutionContextReader`');
    expect(guide).toContain('TemporalWorkerHostConfig.stepActivitiesByKind');
    expect(guide).toContain('DVT_TEMPORAL_DBT_ENABLED=false');
    expect(guide).toContain('```mermaid');
  });

  it('keeps active DBT architecture docs free of the retired core activity path', () => {
    for (const docPath of ACTIVE_DBT_DOCS) {
      const source = readFileSync(join(REPO_ROOT, docPath), 'utf8');

      expect(source).not.toContain(RETIRED_DBT_ACTIVITY_PATH);
    }
  });

  it('keeps DbtStepActivity.execute as a thin orchestration method', () => {
    const source = readDbtPluginSource('DbtStepActivity.ts');
    const executeBody = extractMethodBody(source, 'execute');

    expect(executeBody).not.toMatch(/\bif\s*\(/);
    expect(executeBody).not.toMatch(/\bcatch\s*\(/);
    expect(source).toContain('private async resolveRunExecutionContext');
    expect(source).toContain('private resolveDbtPluginContext');
    expect(source).toContain('private assertResultMatchesStep');
  });

  it('keeps DbtStepActivity run-context resolution split by semantic decisions', () => {
    const source = readDbtPluginSource('DbtStepActivity.ts');
    const resolveBody = extractMethodBody(source, 'resolveRunExecutionContext');

    expect(resolveBody).not.toMatch(/\bif\s*\(/);
    expect(resolveBody).not.toMatch(/\bcatch\s*\(/);
    expect(source).toContain('private requireRunExecutionContextRef');
    expect(source).toContain('private async readRunExecutionContext');
    expect(source).toContain('private mapRunExecutionContextReadError');
  });

  it('uses the TypeScript AST instead of a manual brace scanner for method extraction', () => {
    const source = readFileSync(import.meta.filename, 'utf8');
    const helperBody = extractMethodBody(source, 'extractMethodBody');

    expect(helperBody).toContain('ts.createSourceFile');
    expect(helperBody).not.toContain('let depth = 0');
    expect(helperBody).not.toContain("source.indexOf('{'");
  });
});

function readCoreActivitySource(fileName: string): string {
  return readFileSync(join(ACTIVITY_ROOT, fileName), 'utf8');
}

function readDbtPluginSource(fileName: string): string {
  return readFileSync(join(DBT_PLUGIN_ROOT, fileName), 'utf8');
}

function extractMethodBody(source: string, methodPrefix: string): string {
  const sourceFile = ts.createSourceFile(
    'inline-source.ts',
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS
  );
  const body = findNamedBody(sourceFile, sourceFile, methodPrefix);
  expect(body).toBeDefined();

  return body?.statements.map((statement) => statement.getText(sourceFile)).join('\n') ?? '';
}

function findNamedBody(
  sourceFile: ts.SourceFile,
  node: ts.Node,
  declarationName: string
): ts.Block | undefined {
  if (isNamedBodyDeclaration(sourceFile, node, declarationName)) {
    return node.body;
  }

  return ts.forEachChild(node, (child) => findNamedBody(sourceFile, child, declarationName));
}

function isNamedBodyDeclaration(
  sourceFile: ts.SourceFile,
  node: ts.Node,
  declarationName: string
): node is (ts.FunctionDeclaration | ts.MethodDeclaration) & { body: ts.Block } {
  return (
    (ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node)) &&
    node.body !== undefined &&
    node.name?.getText(sourceFile) === declarationName
  );
}
