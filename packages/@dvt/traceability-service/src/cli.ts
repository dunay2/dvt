/**
 * @file packages/@dvt/traceability-service/src/cli.ts
 * @baseline ADR-0000: Code Generation with Enforced Normative Traceability (Automated)
 * @decision Section 4.3 — Manifest Generation
 * @decision Section 4.4 — Reverse Enforcement
 * @decision Section 4.5 — Architecture Graph Generation + Publication
 * @consequence ADR governance can be executed in CI with or without live Neo4j publication
 * @version 0.1.0
 * @date 2026-02-21
 */
import fs from 'node:fs/promises';
import path from 'node:path';

import { FileSystemAdrCatalog } from './adapters/adr-catalog-filesystem.js';
import { Neo4jGraphPublisher } from './adapters/graph-publisher-neo4j.js';
import { GlobHeaderScanner } from './adapters/header-scanner-glob.js';
import type { IGraphPublisher } from './contracts.js';
import { ManifestBuilder } from './core/manifest.js';
import { TraceValidator } from './core/validator.js';
import { TraceabilityService } from './service.js';

type CliArgs = Record<string, string | boolean>;

function parseArgs(argv: string[]): { cmd: string | null; args: CliArgs } {
  const [, , cmd, ...rest] = argv;
  if (!cmd) return { cmd: null, args: {} };

  const args: CliArgs = {};
  for (let i = 0; i < rest.length; i++) {
    const token = rest[i];
    if (!token) continue;
    if (!token.startsWith('--')) continue;

    const key = token.slice(2);
    const next = rest[i + 1];
    if (!next || next.startsWith('--')) {
      args[key] = true;
    } else {
      args[key] = next;
      i++;
    }
  }
  return { cmd, args };
}

async function loadConfig(configPath: string): Promise<{
  governedPaths: string[];
  exemptPaths: string[];
  validation: {
    requireDecision: boolean;
    requireConsequence: boolean;
    strictMode: boolean;
    failOnMissingVersion: boolean;
  };
  adrCatalog: { path: string; pattern: string };
  neo4j?: { uri?: string; user?: string; password?: string; database?: string };
  adrPolicy?: { requiredAdrs?: string[] };
}> {
  const text = await fs.readFile(configPath, 'utf-8');
  const cfg = JSON.parse(text) as unknown;
  if (typeof cfg !== 'object' || cfg === null) throw new Error('Invalid config JSON');
  const c = cfg as {
    governedPaths: string[];
    exemptPaths: string[];
    validation: {
      requireDecision: boolean;
      requireConsequence: boolean;
      strictMode: boolean;
      failOnMissingVersion: boolean;
    };
    adrCatalog: { path: string; pattern: string };
    neo4j?: { uri?: string; user?: string; password?: string; database?: string };
    adrPolicy?: { requiredAdrs?: string[] };
  };
  return c;
}

class NoopGraphPublisher implements IGraphPublisher {
  async publish(): Promise<void> {
    return Promise.resolve();
  }
}

function asString(v: string | boolean | undefined, name: string): string {
  if (typeof v !== 'string') throw new Error(`Missing --${name}`);
  return v;
}

async function main(): Promise<void> {
  const parsed = parseArgs(process.argv);
  if (!parsed.cmd) {
    console.error(
      'Usage: dvt-trace validate-and-publish --config <path> --repoRoot <path> --component <name> --componentVersion <semver> --repoSha <sha> --moduleName <name> --modulePath <path>'
    );
    process.exit(2);
  }

  if (parsed.cmd !== 'validate-and-publish') {
    console.error(`Unknown command: ${parsed.cmd}`);
    process.exit(2);
  }

  const configPath = asString(parsed.args['config'], 'config');
  const cfg = await loadConfig(configPath);

  const repoRoot = asString(parsed.args['repoRoot'], 'repoRoot');
  const component = asString(parsed.args['component'], 'component');
  const componentVersion = asString(parsed.args['componentVersion'], 'componentVersion');
  const repoSha = asString(parsed.args['repoSha'], 'repoSha');
  const moduleName = asString(parsed.args['moduleName'], 'moduleName');
  const modulePath = asString(parsed.args['modulePath'], 'modulePath');
  const publishGraph = parsed.args['no-publish'] !== true;
  const requireDecision = cfg.validation.requireDecision;
  const failOnMissingVersion = cfg.validation.failOnMissingVersion;
  const generated = new Date().toISOString().slice(0, 10);

  const adrDir = path.resolve(repoRoot, cfg.adrCatalog.path);
  const adrPattern = new RegExp(cfg.adrCatalog.pattern);

  const neo4jConfig = {
    ...(cfg.neo4j?.uri ? { uri: cfg.neo4j.uri } : {}),
    ...(cfg.neo4j?.user ? { user: cfg.neo4j.user } : {}),
    ...(cfg.neo4j?.password ? { password: cfg.neo4j.password } : {}),
    ...(cfg.neo4j?.database ? { database: cfg.neo4j.database } : {}),
  };

  const graphPublisher: IGraphPublisher = publishGraph
    ? new Neo4jGraphPublisher(neo4jConfig)
    : new NoopGraphPublisher();

  const svc = new TraceabilityService({
    adrCatalog: new FileSystemAdrCatalog({ adrDir, pattern: adrPattern }),
    scanner: new GlobHeaderScanner(),
    validator: new TraceValidator(),
    manifestBuilder: new ManifestBuilder(),
    graphPublisher,
  });

  const includeGlobs = cfg.governedPaths.filter((g) => !g.startsWith('!'));
  const excludeGlobs = [
    ...cfg.exemptPaths,
    ...cfg.governedPaths.filter((g) => g.startsWith('!')).map((g) => g.slice(1)),
  ];

  const result = await svc.validateAndPublish({
    repoRoot,
    component,
    componentVersion,
    repoSha,
    includeGlobs,
    excludeGlobs,
    moduleName,
    modulePath,
    generated,
    publishGraph,
    requireDecision,
    failOnMissingVersion,
  });

  if (!result.validation.ok) {
    console.error(JSON.stringify(result.validation, null, 2));
    process.exit(1);
  }

  // Write manifest next to repo root (or stdout)
  const manifestPath = path.resolve(repoRoot, 'traceability.manifest.json');
  await fs.writeFile(manifestPath, JSON.stringify(result.manifest, null, 2) + '\n', 'utf-8');
  process.stdout.write(`OK. Manifest written: ${manifestPath}\n`);
}

main().catch((err) => {
  console.error(String(err));
  process.exit(1);
});
