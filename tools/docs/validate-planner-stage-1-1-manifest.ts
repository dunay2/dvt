#!/usr/bin/env tsx
/**
 * @file tools/docs/validate-planner-stage-1-1-manifest.ts
 * Repository-authoritative validator for the Stage 1.1 planner canonicalization
 * structured manifest artifact.
 *
 * Enforces:
 * - JSON Schema validity for the manifest
 * - human proposal path exists
 * - referenced source-basis paths exist
 * - referenced human section ids exist in the human proposal
 * - the legacy Markdown companion has been removed
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import Ajv2020 from 'ajv/dist/2020.js';
import { Report } from './lib/report.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..', '..');

const MANIFEST_RELATIVE_PATH =
  'docs/planning/proposals/planner-stage-1-1-canonicalization.manifest.json';
const SCHEMA_RELATIVE_PATH =
  'docs/planning/proposals/planner-stage-1-1-canonicalization.manifest.schema.json';

type StageManifest = {
  humanProposalPath: string;
  structuredArtifactPath: string;
  legacyMarkdownCompanionPath: string;
  sourceBasis: {
    activeGovernance: string[];
    designSources: string[];
    historicalContext: string[];
  };
  sectionIndex: Array<{ id: string; humanSection: string }>;
  diagramRefs: Array<{ id: string; humanSection: string }>;
  decisionIndex: Array<{ id: string; humanSectionRefs: string[] }>;
  illustrativeShapes: Array<{ id: string; humanSectionRefs: string[] }>;
  gapRegister: Array<{ id: string }>;
};

function loadJson<T>(repoRelativePath: string): T {
  return JSON.parse(readFileSync(join(REPO_ROOT, repoRelativePath), 'utf8')) as T;
}

function extractHumanSections(content: string): Set<string> {
  const sections = new Set<string>();
  const re = /^##\s+(\d+)\.\s+/gm;
  let match: RegExpExecArray | null;

  while ((match = re.exec(content)) !== null) {
    sections.add(match[1]);
  }

  return sections;
}

function ensurePathExists(repoRelativePath: string, report: Report, owner: string): void {
  if (!existsSync(join(REPO_ROOT, repoRelativePath))) {
    report.error(owner, `Referenced path does not exist: ${repoRelativePath}`);
  }
}

function ensureUnique(values: string[], owner: string, label: string, report: Report): void {
  const seen = new Set<string>();

  for (const value of values) {
    if (seen.has(value)) {
      report.error(owner, `Duplicate ${label}: ${value}`);
      continue;
    }

    seen.add(value);
  }
}

function main(): void {
  const report = new Report();
  const schema = loadJson<object>(SCHEMA_RELATIVE_PATH);
  const manifest = loadJson<StageManifest>(MANIFEST_RELATIVE_PATH);

  const ajv = new Ajv2020({ strict: true, allErrors: true });
  const validate = ajv.compile(schema);

  if (!validate(manifest)) {
    report.error(
      MANIFEST_RELATIVE_PATH,
      'Manifest failed JSON Schema validation',
      JSON.stringify(validate.errors, null, 2)
    );
  }

  ensurePathExists(manifest.humanProposalPath, report, MANIFEST_RELATIVE_PATH);
  ensurePathExists(manifest.structuredArtifactPath, report, MANIFEST_RELATIVE_PATH);
  ensurePathExists(SCHEMA_RELATIVE_PATH, report, MANIFEST_RELATIVE_PATH);

  for (const path of [
    ...manifest.sourceBasis.activeGovernance,
    ...manifest.sourceBasis.designSources,
    ...manifest.sourceBasis.historicalContext,
  ]) {
    ensurePathExists(path, report, MANIFEST_RELATIVE_PATH);
  }

  if (existsSync(join(REPO_ROOT, manifest.legacyMarkdownCompanionPath))) {
    report.error(
      MANIFEST_RELATIVE_PATH,
      `Legacy Markdown companion must be removed: ${manifest.legacyMarkdownCompanionPath}`
    );
  }

  const humanProposalContent = readFileSync(join(REPO_ROOT, manifest.humanProposalPath), 'utf8');
  const knownSections = extractHumanSections(humanProposalContent);

  for (const section of manifest.sectionIndex) {
    if (knownSections.has(section.humanSection)) continue;
    report.error(
      MANIFEST_RELATIVE_PATH,
      `Section index points to missing human section: ${section.id} -> ${section.humanSection}`
    );
  }

  for (const diagram of manifest.diagramRefs) {
    if (knownSections.has(diagram.humanSection)) continue;
    report.error(
      MANIFEST_RELATIVE_PATH,
      `Diagram ref points to missing human section: ${diagram.id} -> ${diagram.humanSection}`
    );
  }

  for (const decision of manifest.decisionIndex) {
    for (const section of decision.humanSectionRefs) {
      if (knownSections.has(section)) continue;
      report.error(
        MANIFEST_RELATIVE_PATH,
        `Decision ref points to missing human section: ${decision.id} -> ${section}`
      );
    }
  }

  for (const shape of manifest.illustrativeShapes) {
    for (const section of shape.humanSectionRefs) {
      if (knownSections.has(section)) continue;
      report.error(
        MANIFEST_RELATIVE_PATH,
        `Illustrative shape points to missing human section: ${shape.id} -> ${section}`
      );
    }
  }

  ensureUnique(
    manifest.sectionIndex.map((item) => item.id),
    MANIFEST_RELATIVE_PATH,
    'section id',
    report
  );
  ensureUnique(
    manifest.diagramRefs.map((item) => item.id),
    MANIFEST_RELATIVE_PATH,
    'diagram id',
    report
  );
  ensureUnique(
    manifest.decisionIndex.map((item) => item.id),
    MANIFEST_RELATIVE_PATH,
    'decision id',
    report
  );
  ensureUnique(
    manifest.illustrativeShapes.map((item) => item.id),
    MANIFEST_RELATIVE_PATH,
    'illustrative shape id',
    report
  );
  ensureUnique(
    manifest.gapRegister.map((item) => item.id),
    MANIFEST_RELATIVE_PATH,
    'gap id',
    report
  );

  report.print();
  process.exit(report.exitCode);
}

main();
