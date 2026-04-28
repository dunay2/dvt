/**
 * Owned concern: verify DBT runtime ownership stays outside the Temporal core
 * activity dispatcher/factory boundary.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import ts from 'typescript';
import { describe, expect, it } from 'vitest';

const ACTIVITY_ROOT = join(import.meta.dirname, '../src/activities');
const PLUGIN_ROOT = join(import.meta.dirname, '../src/plugins');
const DBT_PLUGIN_ROOT = join(import.meta.dirname, '../src/plugins/dbt');
const WORKFLOW_ROOT = join(import.meta.dirname, '../src/workflows');
const REPO_ROOT = join(import.meta.dirname, '../../../..');
const ENGINE_SRC_ROOT = join(REPO_ROOT, 'packages/@dvt/engine/src');
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
  'activityFailures.ts',
  'activityFactory.ts',
  'activityTypes.ts',
  'gatewayStepActivity.ts',
  'stepActivities.ts',
  'stepActivityDispatcher.ts',
  'stepActivityValidation.ts',
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

  it('declares semantic ownership for supporting activity modules', () => {
    const expectedOwnedConcerns = new Map<string, string>([
      [
        'activityFailures.ts',
        '@ownedConcern Define stable Temporal activity failure codes and non-retryable failure construction.',
      ],
      [
        'gatewayStepActivity.ts',
        '@ownedConcern Execute gateway DSL steps inside the activity boundary.',
      ],
      [
        'stepActivityValidation.ts',
        '@ownedConcern Validate runtime step shape and derive activity execution identity.',
      ],
    ]);

    for (const [fileName, expectedOwnedConcern] of expectedOwnedConcerns.entries()) {
      expect(readCoreActivitySource(fileName)).toContain(expectedOwnedConcern);
    }
  });

  it('keeps DBT ownership out of core activity modules', () => {
    for (const fileName of CORE_ACTIVITY_MODULES) {
      const source = readCoreActivitySource(fileName);

      expect(source).not.toContain('dbtStepActivity');
      expect(source).not.toContain('plugins/dbt');
      expect(source).not.toContain('DbtStepActivity');
      expect(source).not.toContain('DbtPluginRunner');
      expect(source).not.toContain('DbtPluginExecutionInput');
      expect(source).not.toContain('dbtPluginRunner');
      expect(source).not.toMatch(/\bDBT_PLUGIN_/);
    }
  });

  it('keeps engine source free of DBT-specific plugin ownership', () => {
    for (const source of readTypeScriptSources(ENGINE_SRC_ROOT)) {
      expect(source).not.toMatch(/\bDBT\b|Dbt|dbt/);
    }
  });

  it('keeps generic plugin composition free of DBT-specific semantics', () => {
    const source = readPluginSource('TemporalStepPluginProfile.ts');

    expect(source).toContain('@ownedConcern Compose Temporal step plugin profiles');
    expect(source).toContain('TemporalStepPluginProfile');
    expect(source).toContain('composeTemporalStepPluginRegistries');
    expect(source).toContain('TEMPORAL_STEP_PLUGIN_KIND_CONFLICT');
    expect(source).not.toContain('DBT_');
    expect(source).not.toContain('Dbt');
    expect(source).not.toContain('dbt');
  });

  it('keeps DBT step-kind ownership inside the DBT plugin manifest', () => {
    const source = readDbtPluginSource('dbtPluginManifest.ts');
    const activitySource = readDbtPluginSource('DbtStepActivity.ts');
    const runnerSource = readDbtPluginSource('DbtCliPluginRunner.ts');

    expect(source).toContain('TEMPORAL_DBT_PLUGIN_EXECUTABLE_STEP_KINDS');
    expect(source).toContain('resolveDbtCliSubcommand');
    expect(activitySource).toContain('TEMPORAL_DBT_PLUGIN_EXECUTABLE_STEP_KINDS');
    expect(activitySource).not.toContain('DBT_STEP_KINDS');
    expect(runnerSource).toContain('resolveDbtCliSubcommand');
    expect(runnerSource).not.toContain("case 'DBT_MODEL'");
  });

  it('keeps workflow artifact emission plugin-agnostic instead of DBT step-kind gated', () => {
    const source = readWorkflowSource('workflowArtifactHelpers.ts');

    expect(source).toContain('compiledCodeRef');
    expect(source).toContain("COMPILED_SQL_ARTIFACT_KIND = 'compiled-sql'");
    expect(source).toContain('artifactKind: COMPILED_SQL_ARTIFACT_KIND');
    expect(source).not.toContain('KNOWN_STEP_KINDS.DBT_');
    expect(source).not.toContain('TEMPORAL_DBT_PLUGIN');
    expect(source).not.toContain("artifactKind: 'dbt.compiled-sql'");
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

function readPluginSource(fileName: string): string {
  return readFileSync(join(PLUGIN_ROOT, fileName), 'utf8');
}

function readWorkflowSource(fileName: string): string {
  return readFileSync(join(WORKFLOW_ROOT, fileName), 'utf8');
}

function readTypeScriptSources(rootDirectory: string): string[] {
  const sources: string[] = [];

  for (const entry of readdirSync(rootDirectory, { withFileTypes: true })) {
    const path = join(rootDirectory, entry.name);
    if (entry.isDirectory()) {
      sources.push(...readTypeScriptSources(path));
    } else if (entry.isFile() && entry.name.endsWith('.ts')) {
      sources.push(readFileSync(path, 'utf8'));
    }
  }

  return sources;
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
