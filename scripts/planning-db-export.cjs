#!/usr/bin/env node

'use strict';

const dependencies = (() => {
  const path = require('node:path');

  return {
    fs: require('node:fs'),
    os: require('node:os'),
    path,
    yaml: require('js-yaml'),
    Client: require('pg').Client,
    defaultPgUrl: require('./planning-db-run.cjs').defaultPgUrl,
    schemaName: require('./planning-db-schema.cjs').schemaName,
    repoRoot: path.resolve(__dirname, '..'),
  };
})();

const dbGovernanceSurfaceCatalogPath = 'tools/planning-db/state/db-governance-surfaces.json';
const governanceUnitManifestPath = 'docs/planning/status/system-governance-unit-index.units.yaml';
const governanceUnitNavigationPath =
  'docs/planning/status/system-governance-unit-index-20260501.md';
const planStoreNavigationPath =
  'docs/planning/status/system-governance-planstore-file-ownership-20260501.md';
const canonicalArtifactPaths = [
  dbGovernanceSurfaceCatalogPath,
  governanceUnitManifestPath,
  governanceUnitNavigationPath,
  planStoreNavigationPath,
];

class PlanningDbExportRunner {
  constructor(deps = dependencies) {
    this.deps = { ...dependencies, ...deps };
  }

  databaseUrl(value) {
    return (
      value || process.env.DVT_PLANNING_DB_URL || process.env.DATABASE_URL || this.deps.defaultPgUrl
    );
  }

  parseArgs(argv) {
    const options = {
      check: false,
      outputRoot: null,
    };

    for (let index = 0; index < argv.length; index += 1) {
      const token = argv[index];

      if (token === '--check') {
        options.check = true;
        continue;
      }

      if (token === '--output-root') {
        const next = argv[index + 1];
        if (!next) {
          throw new Error('Missing value for --output-root');
        }
        options.outputRoot = this.deps.path.resolve(this.deps.repoRoot, next);
        index += 1;
        continue;
      }

      if (token === '--database-url') {
        const next = argv[index + 1];
        if (!next) {
          throw new Error('Missing value for --database-url');
        }
        options.databaseUrl = next;
        index += 1;
        continue;
      }

      if (token === '--help' || token === '-h') {
        options.help = true;
        continue;
      }

      throw new Error(`Unknown planning DB export option "${token}".`);
    }

    options.outputRoot =
      options.outputRoot ||
      this.deps.path.join(this.deps.repoRoot, '.generated-docs', 'planning-db-export');

    return options;
  }

  printHelp() {
    console.log('Usage: pnpm planning:db:export [--check] [--output-root <path>]');
  }

  async readPublicationRows(client) {
    const [governanceComponentEffectiveDefinitions, dbGovernanceSurfaces, architectureReview] =
      await Promise.all([
        client.query(`
          select
            definition.unit_id as "componentId",
            definition.name,
            definition.parent_id as "parentComponentId",
            definition.level,
            coalesce(component.status, definition.status) as status,
            coalesce(component.children_required, definition.children_required) as "childrenRequired",
            component.owns,
            component.excludes,
            component.owned_concern as "ownedConcern",
            component.responsibilities,
            component.non_goals as "nonGoals",
            component.reasons_to_change as "reasonsToChange",
            coalesce(component.ddd_owner, definition.ddd_owner) as "dddOwner",
            coalesce(component.cq_rails, definition.cq_rails) as "cqRails",
            component.public_api as "publicApi",
            component.invariants,
            component.transitions,
            component.consumers,
            component.governance_refs as "governanceRefs",
            component.fowler_signals as "fowlerSignals",
            definition.raw_units -> 0 as "rawUnit"
          from ${this.deps.schemaName}.governance_unit_query definition
          left join ${this.deps.schemaName}.governance_component_definition_query component
            on component.component_id = definition.unit_id
          order by definition.unit_id
        `),
        client.query(`
          select
            surface.surface_name as "surfaceName",
            surface.canonical_source as "canonicalSource",
            surface.write_rail as "writeRail",
            surface.write_rail_kind as "writeRailKind",
            surface.read_query_rail as "readQueryRail",
            surface.projection,
            surface.validation,
            surface.authority_mode as "authorityMode"
          from ${this.deps.schemaName}.db_governance_surfaces surface
          order by surface.surface_name
        `),
        client.query(`
          select max(coalesce(design.updated_at, design.created_at)) as "lastReviewedAt"
          from architecture.design design
        `),
      ]);
    const lastReviewed = String(architectureReview.rows[0]?.lastReviewedAt || '').slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/u.test(lastReviewed)) {
      throw new Error('Cannot publish governance navigation without architecture review state.');
    }

    return {
      governanceComponentEffectiveDefinitions: governanceComponentEffectiveDefinitions.rows,
      dbGovernanceSurfaces: dbGovernanceSurfaces.rows,
      lastReviewed,
    };
  }

  nonEmptyList(value) {
    return Array.isArray(value) && value.length > 0 ? value : undefined;
  }

  governanceUnitFromDefinition(definition) {
    const rawUnit = definition.rawUnit || {};
    const list = (value, fallback) =>
      Array.isArray(value) ? value : Array.isArray(fallback) ? fallback : [];
    const responsibilities = list(definition.responsibilities, rawUnit.responsibilities);
    const nonGoals = list(definition.nonGoals, rawUnit.nonGoals);
    const reasonsToChange = list(definition.reasonsToChange, rawUnit.reasonsToChange);
    const publicApi = list(definition.publicApi, rawUnit.publicApi);
    const owns = list(definition.owns, rawUnit.owns);
    const excludes = list(definition.excludes, rawUnit.excludes);
    const invariants = list(definition.invariants, rawUnit.invariants);
    const transitions = list(definition.transitions, rawUnit.transitions);
    const consumers = list(definition.consumers, rawUnit.consumers);
    const governanceRefs = list(definition.governanceRefs, rawUnit.governance);
    const fowlerSignals = list(definition.fowlerSignals, rawUnit.fowlerSignals);
    const unit = {
      id: definition.componentId,
      name: definition.name,
      ...(definition.parentComponentId ? { parent: definition.parentComponentId } : {}),
      level: definition.level,
      status: definition.status,
      ...(definition.ownedConcern || rawUnit.ownedConcern
        ? { ownedConcern: definition.ownedConcern || rawUnit.ownedConcern }
        : {}),
      ...(this.nonEmptyList(responsibilities) ? { responsibilities } : {}),
      ...(this.nonEmptyList(nonGoals) ? { nonGoals } : {}),
      ...(this.nonEmptyList(reasonsToChange) ? { reasonsToChange } : {}),
      ...(this.nonEmptyList(publicApi) ? { publicApi } : {}),
      owns,
      ...(this.nonEmptyList(excludes) ? { excludes } : {}),
      childrenRequired: definition.childrenRequired,
      dddOwner: definition.dddOwner || rawUnit.dddOwner,
      cqRails: definition.cqRails || rawUnit.cqRails,
      ...(this.nonEmptyList(invariants) ? { invariants } : {}),
      ...(this.nonEmptyList(transitions) ? { transitions } : {}),
      ...(this.nonEmptyList(consumers) ? { consumers } : {}),
      ...(this.nonEmptyList(governanceRefs) ? { governance: governanceRefs } : {}),
      ...(this.nonEmptyList(fowlerSignals) ? { fowlerSignals } : {}),
    };

    return Object.fromEntries(Object.entries(unit).filter(([, value]) => value !== undefined));
  }

  renderGovernanceUnitManifest(definitions) {
    const units = definitions.map((definition) => this.governanceUnitFromDefinition(definition));
    const root = units.find((unit) => !unit.parent && unit.level === 'system');
    if (!root) {
      throw new Error('Cannot publish governance units without a root system component.');
    }

    return `---\n${this.deps.yaml.dump(
      {
        version: 1,
        rootUnit: root.id,
        units,
      },
      { lineWidth: 100, noRefs: true, sortKeys: false }
    )}`;
  }

  renderGovernanceUnitNavigation(definitions, lastReviewed) {
    const root = definitions.find(
      (definition) => !definition.parentComponentId && definition.level === 'system'
    );
    if (!root) {
      throw new Error('Cannot publish governance navigation without a root system component.');
    }
    const domains = definitions
      .filter((definition) => definition.parentComponentId === root.componentId)
      .sort((left, right) => left.componentId.localeCompare(right.componentId));
    const domainLines = domains.map(
      (definition) =>
        `- \`${definition.componentId}\` — ${definition.name} (\`${definition.status}\`)`
    );

    return `---
title: System Governance Unit Index
status: Review
owner: Architecture / Docs / Delivery
last_reviewed: ${lastReviewed}
planning_type: status
---

# System Governance Unit Index

> Generated from Planning DB authority. Do not edit this projection by hand.

This page is navigation only. Current architecture ownership, hierarchy, status,
relations and design scope must be consulted in the Planning DB before making an
architecture or design decision.

## Mandatory Queries

\`\`\`bash
pnpm planning:db:query units --parent-unit SYS-DVT --no-refresh
pnpm planning:db:query component-metadata --component <COMPONENT-ID> --no-refresh
pnpm planning:db:query architecture-designs
pnpm planning:db:query architecture-scopes
pnpm planning:db:query filesystem-coverage --no-refresh
\`\`\`

Publish tracked recovery projections only when explicitly requested:

\`\`\`bash
pnpm planning:db:export --output-root .
\`\`\`

Ordinary documentation build and serve commands consume the last explicit
publication and do not regenerate it.

## Root Navigation

${domainLines.join('\n')}
`;
  }

  renderPlanStoreNavigation(definitions, lastReviewed) {
    const planStoreDefinitions = definitions
      .filter((definition) => /^SYS-PLANSTORE(?:-|$)/u.test(definition.componentId))
      .sort((left, right) => left.componentId.localeCompare(right.componentId));
    if (planStoreDefinitions.length === 0) {
      throw new Error('Cannot publish PlanStore navigation without SYS-PLANSTORE authority.');
    }
    const componentLines = planStoreDefinitions.map(
      (definition) =>
        `- \`${definition.componentId}\` — ${definition.name} (\`${definition.status}\`)`
    );

    return `---
title: System Governance Plan-Store Navigation
status: Review
owner: Architecture / Docs / Delivery
last_reviewed: ${lastReviewed}
planning_type: status
---

# System Governance Plan-Store Navigation

> Generated from Planning DB authority. Do not edit this projection by hand.

This page intentionally contains no file inventory or copied totals. Query the
current DB read models and generated Git ownership projection instead.

## Mandatory Queries

\`\`\`bash
pnpm planning:db:query units --component SYS-PLANSTORE --no-refresh
pnpm planning:db:query component-tree --parent-unit SYS-PLANSTORE --no-refresh
pnpm planning:db:query files --domain SYS-PLANSTORE --limit 1000 --no-refresh
pnpm planning:db:query filesystem-coverage --no-refresh
\`\`\`

## Component Navigation

${componentLines.join('\n')}
`;
  }

  writeTextArtifact(outputRoot, artifactPath, content) {
    const outputPath = this.deps.path.join(outputRoot, artifactPath);
    this.deps.fs.mkdirSync(this.deps.path.dirname(outputPath), { recursive: true });
    this.deps.fs.writeFileSync(outputPath, content, 'utf8');
  }

  writeGovernanceProjections(publicationRows, outputRoot) {
    const definitions = publicationRows.governanceComponentEffectiveDefinitions;
    const lastReviewed = publicationRows.lastReviewed;
    this.writeTextArtifact(
      outputRoot,
      governanceUnitManifestPath,
      this.renderGovernanceUnitManifest(definitions)
    );
    this.writeTextArtifact(
      outputRoot,
      governanceUnitNavigationPath,
      this.renderGovernanceUnitNavigation(definitions, lastReviewed)
    );
    this.writeTextArtifact(
      outputRoot,
      planStoreNavigationPath,
      this.renderPlanStoreNavigation(definitions, lastReviewed)
    );
  }

  writeDbGovernanceSurfaceCatalog(publicationRows, outputRoot) {
    const artifactPath = this.deps.path.join(outputRoot, dbGovernanceSurfaceCatalogPath);
    this.deps.fs.mkdirSync(this.deps.path.dirname(artifactPath), { recursive: true });
    this.deps.fs.writeFileSync(
      artifactPath,
      `${JSON.stringify(
        {
          schemaVersion: 1,
          surfaces: publicationRows.dbGovernanceSurfaces,
        },
        null,
        2
      )}\n`,
      'utf8'
    );
  }

  readArtifact(root, artifactPath) {
    const absolutePath = this.deps.path.join(root, artifactPath);
    if (!this.deps.fs.existsSync(absolutePath)) {
      return null;
    }

    return this.deps.fs.readFileSync(absolutePath, 'utf8');
  }

  canonicalizeStructuredValue(value) {
    if (Array.isArray(value)) {
      return value.map((item) => this.canonicalizeStructuredValue(item));
    }

    if (value && typeof value === 'object') {
      return Object.fromEntries(
        Object.keys(value)
          .sort()
          .map((key) => [key, this.canonicalizeStructuredValue(value[key])])
      );
    }

    return value;
  }

  normalizeArtifactForComparison(artifactPath, content) {
    if (artifactPath === dbGovernanceSurfaceCatalogPath) {
      return JSON.stringify(this.canonicalizeStructuredValue(JSON.parse(content)));
    }

    if (artifactPath === governanceUnitManifestPath) {
      return JSON.stringify(this.canonicalizeStructuredValue(this.deps.yaml.load(content)));
    }

    return content;
  }

  compareGeneratedArtifacts({ expectedRoot, actualRoot, artifactPaths = canonicalArtifactPaths }) {
    const missing = [];
    const changed = [];

    for (const artifactPath of artifactPaths) {
      const expected = this.readArtifact(expectedRoot, artifactPath);
      const actual = this.readArtifact(actualRoot, artifactPath);

      if (expected === null || actual === null) {
        missing.push(artifactPath);
        continue;
      }

      if (
        this.normalizeArtifactForComparison(artifactPath, expected) !==
        this.normalizeArtifactForComparison(artifactPath, actual)
      ) {
        changed.push(artifactPath);
      }
    }

    return {
      ok: missing.length === 0 && changed.length === 0,
      missing,
      changed,
    };
  }

  formatDiffReport(report) {
    if (report.ok) {
      return '[planning:db:export] OK';
    }

    const lines = [
      '[planning:db:export] DB-rendered planning artifacts drift from current generated files.',
    ];

    for (const artifactPath of report.missing) {
      lines.push(`- missing: ${artifactPath}`);
    }

    for (const artifactPath of report.changed) {
      lines.push(`- changed: ${artifactPath}`);
    }

    return lines.join('\n');
  }

  async exportPlanningDerivedSurfaces(options = {}) {
    const client =
      options.client ||
      new this.deps.Client({ connectionString: this.databaseUrl(options.databaseUrl) });
    const ownsClient = !options.client;
    const cleanupDirs = [];

    if (ownsClient) {
      await client.connect();
    }

    try {
      const publicationRows = await this.readPublicationRows(client);

      const outputRoot = options.check
        ? this.deps.fs.mkdtempSync(
            this.deps.path.join(this.deps.os.tmpdir(), 'planning-db-export-output-')
          )
        : this.deps.path.resolve(options.outputRoot || this.parseArgs([]).outputRoot);

      if (options.check) {
        cleanupDirs.push(outputRoot);
      } else {
        this.deps.fs.mkdirSync(outputRoot, { recursive: true });
      }

      this.writeDbGovernanceSurfaceCatalog(publicationRows, outputRoot);
      this.writeGovernanceProjections(publicationRows, outputRoot);
      const report = options.check
        ? this.compareGeneratedArtifacts({
            expectedRoot: this.deps.repoRoot,
            actualRoot: outputRoot,
            artifactPaths: canonicalArtifactPaths,
          })
        : { ok: true, missing: [], changed: [] };

      if (options.check && !report.ok) {
        throw new Error(this.formatDiffReport(report));
      }

      return {
        outputRoot,
        canonicalArtifactPaths,
        report,
      };
    } finally {
      for (const dir of cleanupDirs.reverse()) {
        this.deps.fs.rmSync(dir, { recursive: true, force: true });
      }

      if (ownsClient) {
        await client.end();
      }
    }
  }
}

async function main() {
  const runner = new PlanningDbExportRunner();
  const options = runner.parseArgs(process.argv.slice(2));

  if (options.help) {
    runner.printHelp();
    return;
  }

  const result = await runner.exportPlanningDerivedSurfaces(options);
  console.log(
    `[planning:db:export] outputRoot=${dependencies.path.relative(
      dependencies.repoRoot,
      result.outputRoot
    )}`
  );
  console.log(runner.formatDiffReport(result.report));
}

if (require.main === module) {
  main().catch((error) => {
    console.error(`[planning:db:export] ${error.message}`);
    process.exit(1);
  });
}

module.exports = {
  PlanningDbExportRunner,
  canonicalArtifactPaths,
  governanceUnitManifestPath,
  governanceUnitNavigationPath,
  planStoreNavigationPath,
};
