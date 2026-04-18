/**
 * @file packages/@dvt/traceability-service/src/cli.ts
 * @baseline ADR-0000: Code Generation with Enforced Normative Traceability (Automated)
 * @decision Section 4.3 - Manifest generation remains the canonical CLI output
 * @decision Section 4.4 - Reverse coverage stays enforced in the same execution path
 * @decision Section 4.5 - The CLI no longer depends on external graph infrastructure
 * @consequence ADR governance can run in CI with only repository-local inputs
 * @version 0.1.0
 * @date 2026-02-21
 */
import fs from 'node:fs/promises';
import path from 'node:path';

import { FileSystemAdrCatalog } from './adapters/adr-catalog-filesystem.js';
import { GlobHeaderScanner } from './adapters/header-scanner-glob.js';
import { toValidationIssueBaselineEntry } from './core/issue-baseline.js';
import { ManifestBuilder } from './core/manifest.js';
import { TraceValidator } from './core/validator.js';
import { TraceabilityService } from './service.js';
import type {
  ValidationIssueBaselineEntry,
  ValidationIssueBaselineFile,
  ValidationIssueCode,
} from './types.js';

type CliArgs = Record<string, string | boolean>;

type TraceabilityConfig = {
  governedPaths: string[];
  exemptPaths: string[];
  validation: {
    requireDecision: boolean;
    requireConsequence: boolean;
    strictMode: boolean;
    failOnMissingVersion: boolean;
  };
  adrCatalog: { path: string; pattern: string };
  regressionBaseline?: { path: string };
  adrPolicy?: { requiredAdrs?: string[] };
};

const validationIssueCodes = new Set<ValidationIssueCode>([
  'MISSING_BASELINE',
  'ADR_NOT_FOUND',
  'ADR_NOT_ACCEPTED',
  'NON_TEST_MISSING_DECISION',
  'MISSING_DECISION',
  'MISSING_VERSION',
  'INVALID_FORMAT',
  'REVERSE_COVERAGE_FAIL',
]);

function parseArgs(argv: string[]): { cmd: string | null; args: CliArgs } {
  const [, , cmd, ...rest] = argv;
  if (!cmd) return { cmd: null, args: {} };

  const args: CliArgs = {};
  for (let i = 0; i < rest.length; i += 1) {
    const token = rest[i];
    if (!token || !token.startsWith('--')) continue;

    const key = token.slice(2);
    const next = rest[i + 1];
    if (!next || next.startsWith('--')) {
      args[key] = true;
    } else {
      args[key] = next;
      i += 1;
    }
  }
  return { cmd, args };
}

async function loadConfig(configPath: string): Promise<TraceabilityConfig> {
  const text = await fs.readFile(configPath, 'utf-8');
  const cfg = JSON.parse(text) as unknown;
  if (typeof cfg !== 'object' || cfg === null) throw new Error('Invalid config JSON');
  return cfg as TraceabilityConfig;
}

function isValidationIssueCode(code: string): code is ValidationIssueCode {
  return validationIssueCodes.has(code as ValidationIssueCode);
}

function parseBaselineIssue(issue: unknown, index: number): ValidationIssueBaselineEntry {
  if (typeof issue !== 'object' || issue === null) {
    throw new Error(`Invalid regression baseline issue at index ${index}`);
  }

  const candidate = issue as {
    code?: unknown;
    filePath?: unknown;
    adrNumber?: unknown;
  };

  if (typeof candidate.code !== 'string' || !isValidationIssueCode(candidate.code)) {
    throw new Error(`Invalid regression baseline issue code at index ${index}`);
  }

  if (candidate.filePath !== undefined && typeof candidate.filePath !== 'string') {
    throw new Error(`Invalid regression baseline filePath at index ${index}`);
  }

  if (candidate.adrNumber !== undefined && typeof candidate.adrNumber !== 'string') {
    throw new Error(`Invalid regression baseline adrNumber at index ${index}`);
  }

  return toValidationIssueBaselineEntry({
    code: candidate.code,
    ...(typeof candidate.filePath === 'string' ? { filePath: candidate.filePath } : {}),
    ...(typeof candidate.adrNumber === 'string' ? { adrNumber: candidate.adrNumber } : {}),
  });
}

async function loadRegressionBaseline(
  configPath: string,
  baseline: TraceabilityConfig['regressionBaseline']
): Promise<ValidationIssueBaselineEntry[] | undefined> {
  if (!baseline?.path) return undefined;

  const baselinePath = path.resolve(path.dirname(configPath), baseline.path);
  const text = await fs.readFile(baselinePath, 'utf-8');
  const parsed = JSON.parse(text) as unknown;

  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error(`Invalid regression baseline JSON: ${baselinePath}`);
  }

  const baselineFile = parsed as Partial<ValidationIssueBaselineFile>;
  if (!Array.isArray(baselineFile.issues)) {
    throw new Error(`Regression baseline must define an issues array: ${baselinePath}`);
  }

  return baselineFile.issues.map((issue, index) => parseBaselineIssue(issue, index));
}

function asString(v: string | boolean | undefined, name: string): string {
  if (typeof v !== 'string') throw new Error(`Missing --${name}`);
  return v;
}

function isSupportedCommand(cmd: string): boolean {
  return cmd === 'validate-and-build-manifest';
}

function printUsage(): void {
  console.error(
    'Usage: dvt-trace validate-and-build-manifest --config <path> --repoRoot <path> --component <name> --componentVersion <semver> --repoSha <sha>'
  );
}

async function main(): Promise<void> {
  const parsed = parseArgs(process.argv);
  if (!parsed.cmd) {
    printUsage();
    process.exit(2);
  }

  if (!isSupportedCommand(parsed.cmd)) {
    console.error(`Unknown command: ${parsed.cmd}`);
    process.exit(2);
  }

  const configPath = asString(parsed.args['config'], 'config');
  const cfg = await loadConfig(configPath);
  const issueBaseline = await loadRegressionBaseline(configPath, cfg.regressionBaseline);

  const repoRoot = asString(parsed.args['repoRoot'], 'repoRoot');
  const component = asString(parsed.args['component'], 'component');
  const componentVersion = asString(parsed.args['componentVersion'], 'componentVersion');
  const repoSha = asString(parsed.args['repoSha'], 'repoSha');
  const requireDecision = cfg.validation.requireDecision;
  const failOnMissingVersion = cfg.validation.failOnMissingVersion;
  const generated = new Date().toISOString().slice(0, 10);

  const adrDir = path.resolve(repoRoot, cfg.adrCatalog.path);
  const adrPattern = new RegExp(cfg.adrCatalog.pattern);

  const svc = new TraceabilityService({
    adrCatalog: new FileSystemAdrCatalog({ adrDir, pattern: adrPattern }),
    scanner: new GlobHeaderScanner(),
    validator: new TraceValidator(),
    manifestBuilder: new ManifestBuilder(),
  });

  const includeGlobs = cfg.governedPaths.filter((g) => !g.startsWith('!'));
  const excludeGlobs = [
    ...cfg.exemptPaths,
    ...cfg.governedPaths.filter((g) => g.startsWith('!')).map((g) => g.slice(1)),
  ];

  const result = await svc.validateAndBuildManifest({
    repoRoot,
    component,
    componentVersion,
    repoSha,
    includeGlobs,
    excludeGlobs,
    generated,
    requireDecision,
    failOnMissingVersion,
    ...(issueBaseline ? { issueBaseline } : {}),
  });

  if (!result.validation.ok) {
    console.error(JSON.stringify(result.validation, null, 2));
    process.exit(1);
  }

  const manifestPath = path.resolve(repoRoot, 'traceability.manifest.json');
  await fs.writeFile(manifestPath, JSON.stringify(result.manifest, null, 2) + '\n', 'utf-8');
  process.stdout.write(`OK. Manifest written: ${manifestPath}\n`);
}

main().catch((err) => {
  console.error(String(err));
  process.exit(1);
});
