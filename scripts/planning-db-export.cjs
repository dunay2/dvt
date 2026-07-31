#!/usr/bin/env node

'use strict';

const dependencies = (() => {
  const path = require('node:path');

  return {
    fs: require('node:fs'),
    os: require('node:os'),
    path,
    Client: require('pg').Client,
    defaultPgUrl: require('./planning-db-run.cjs').defaultPgUrl,
    schemaName: require('./planning-db-migrate.cjs').schemaName,
    repoRoot: path.resolve(__dirname, '..'),
  };
})();

const canonicalStateArtifactPath = 'tools/planning-db/state/canonical-state.json';
const canonicalArtifactPaths = [canonicalStateArtifactPath];

class PlanningDbExportRunner {
  constructor(deps = dependencies) {
    this.deps = deps;
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

  async readCanonicalStateRows(client) {
    const [
      featureMechanizationRails,
      featureMechanizationRailOperations,
      architectureComponentStatusOverrides,
    ] = await Promise.all([
      client.query(`
        select
          rail.rail_id as "railId",
          rail.feature_id as "featureId",
          rail.mechanization_status as "mechanizationStatus",
          rail.rail_name as "railName",
          rail.normalized_rail_name as "normalizedRailName",
          rail.rail_type as "railType",
          rail.ddd_owner as "dddOwner",
          rail.rail_status as "railStatus",
          rail.symbol_refs as "symbolRefs",
          rail.implementation_refs as "implementationRefs",
          rail.documentation_refs as "documentationRefs",
          rail.governing_sources as "governingSources",
          rail.allowed_implementation_surfaces as "allowedImplementationSurfaces",
          rail.architecture_guards as "architectureGuards",
          rail.completion_gate as "completionGate",
          rail.source_path as "sourcePath",
          rail.source_content_sha256 as "sourceContentSha256",
          rail.raw_rail as "rawRail",
          rail.raw_manifest as "rawManifest",
          rail.revision,
          rail.created_by as "createdBy",
          rail.created_at as "createdAt"
        from ${this.deps.schemaName}.feature_mechanization_local_rails rail
        where rail.source_path not like 'tools/planning-db/migrations/%'
          and exists (
            select 1
            from ${this.deps.schemaName}.feature_mechanization_local_operations operation
            where operation.rail_id = rail.rail_id
          )
        order by rail.rail_id
      `),
      client.query(`
        select
          operation.operation_id as "operationId",
          operation.idempotency_key as "idempotencyKey",
          operation.operation_type as "operationType",
          operation.actor,
          operation.rail_id as "railId",
          operation.source_path as "sourcePath",
          operation.source_content_sha256 as "sourceContentSha256",
          operation.expected_revision as "expectedRevision",
          operation.previous_revision as "previousRevision",
          operation.resulting_revision as "resultingRevision",
          operation.payload,
          operation.created_at as "createdAt"
        from ${this.deps.schemaName}.feature_mechanization_local_operations operation
        where exists (
          select 1
          from ${this.deps.schemaName}.feature_mechanization_local_rails rail
          where rail.rail_id = operation.rail_id
            and rail.source_path not like 'tools/planning-db/migrations/%'
        )
        order by operation.created_at, operation.operation_id
      `),
      client.query(`
        with ranked_overrides as (
          select
            operation.payload->>'componentId' as component_id,
            operation.payload->>'status' as status,
            operation.source_ref,
            operation.source_content_sha256,
            row_number() over (
              partition by operation.payload->>'componentId'
              order by operation.created_at desc, operation.operation_id desc
            ) as row_number
          from architecture.design_operations operation
          where operation.operation_type = 'architecture_component_record'
            and operation.source_ref not like 'tools/planning-db/migrations/%'
        )
        select
          component_id as "componentId",
          status,
          source_ref as "sourceRef",
          source_content_sha256 as "sourceContentSha256"
        from ranked_overrides
        where row_number = 1
          and status = 'deprecated'
        order by component_id
      `),
    ]);

    return {
      architectureComponentStatusOverrides: architectureComponentStatusOverrides.rows,
      featureMechanizationRails: featureMechanizationRails.rows,
      featureMechanizationRailOperations: featureMechanizationRailOperations.rows,
    };
  }

  writeCanonicalState(snapshotRows, outputRoot) {
    const artifactPath = this.deps.path.join(outputRoot, canonicalStateArtifactPath);
    this.deps.fs.mkdirSync(this.deps.path.dirname(artifactPath), { recursive: true });
    this.deps.fs.writeFileSync(
      artifactPath,
      `${JSON.stringify(
        {
          schemaVersion: 1,
          architectureComponentStatusOverrides: snapshotRows.architectureComponentStatusOverrides,
          featureMechanizationRails: snapshotRows.featureMechanizationRails,
          featureMechanizationRailOperations: snapshotRows.featureMechanizationRailOperations,
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
    if (artifactPath === canonicalStateArtifactPath) {
      return JSON.stringify(this.canonicalizeStructuredValue(JSON.parse(content)));
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
      const canonicalStateRows = await this.readCanonicalStateRows(client);

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

      this.writeCanonicalState(canonicalStateRows, outputRoot);
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
        canonicalArchitectureComponentStatusOverrides:
          canonicalStateRows.architectureComponentStatusOverrides.length,
        canonicalFeatureMechanizationRails: canonicalStateRows.featureMechanizationRails.length,
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
    `[planning:db:export] canonicalState=${canonicalStateArtifactPath} outputRoot=${dependencies.path.relative(
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
  canonicalStateArtifactPath,
};
