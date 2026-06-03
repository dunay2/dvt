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
    schemaName: require('./planning-db-migrate.cjs').schemaName,
    repoRoot: path.resolve(__dirname, '..'),
  };
})();

const exportedGovernanceArtifactPaths = [
  '.generated-docs/planning/status/system-governance-file-index.files.yaml',
  '.generated-docs/planning/status/system-governance-component-index.components.yaml',
  '.generated-docs/planning/status/system-governance-component-file-map.components.yaml',
  '.generated-docs/planning/status/system-governance-file-fingerprint-baseline.yaml',
  '.generated-docs/planning/status/system-governance-coverage-report.coverage.yaml',
  '.generated-docs/planning/status/system-governance-remediation-queue.queue.yaml',
];

class GovernanceDbExportRunner {
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
      databaseUrl: null,
      help: false,
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

      throw new Error(`Unknown governance DB export option "${token}".`);
    }

    options.outputRoot =
      options.outputRoot ||
      this.deps.path.join(this.deps.repoRoot, '.generated-docs', 'governance-db-export');

    return options;
  }

  printHelp() {
    console.log('Usage: pnpm governance:db:export [--check] [--output-root <path>]');
  }

  async readSourceRows(client) {
    const result = await client.query(`
      select
        source_path as "sourcePath",
        raw_source as "rawSource",
        raw_source_text as "rawSourceText"
      from ${this.deps.schemaName}.governance_sources
      where raw_source is not null
        and source_path like '.generated-docs/%'
      order by source_path
    `);

    return result.rows;
  }

  renderYaml(value) {
    return this.deps.yaml.dump(value, {
      lineWidth: 100,
      noRefs: true,
      sortKeys: false,
    });
  }

  writeSourceDocuments(rows, outputRoot) {
    for (const row of rows) {
      const sourcePath = String(row.sourcePath || '').replace(/\\/g, '/');
      if (!sourcePath.startsWith('.generated-docs/')) {
        throw new Error(
          `Refusing to export governance DB source outside .generated-docs: ${sourcePath}`
        );
      }

      const outputPath = this.deps.path.join(outputRoot, sourcePath);
      this.deps.fs.mkdirSync(this.deps.path.dirname(outputPath), { recursive: true });
      const content =
        typeof row.rawSourceText === 'string' ? row.rawSourceText : this.renderYaml(row.rawSource);
      this.deps.fs.writeFileSync(outputPath, content, 'utf8');
    }
  }

  readArtifact(root, artifactPath) {
    const absolutePath = this.deps.path.join(root, artifactPath);
    if (!this.deps.fs.existsSync(absolutePath)) {
      return null;
    }

    return this.deps.fs.readFileSync(absolutePath, 'utf8');
  }

  compareGeneratedArtifacts({
    expectedRoot,
    actualRoot,
    artifactPaths = exportedGovernanceArtifactPaths,
  }) {
    const missing = [];
    const changed = [];

    for (const artifactPath of artifactPaths) {
      const expected = this.readArtifact(expectedRoot, artifactPath);
      const actual = this.readArtifact(actualRoot, artifactPath);

      if (expected === null || actual === null) {
        missing.push(artifactPath);
        continue;
      }

      if (expected !== actual) {
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
      return '[governance:db:export] OK';
    }

    const lines = [
      '[governance:db:export] DB-rendered governance artifacts drift from current generated files.',
    ];

    for (const artifactPath of report.missing) {
      lines.push(`- missing: ${artifactPath}`);
    }

    for (const artifactPath of report.changed) {
      lines.push(`- changed: ${artifactPath}`);
    }

    return lines.join('\n');
  }

  async exportGovernanceDerivedSurfaces(options = {}) {
    const client =
      options.client ||
      new this.deps.Client({ connectionString: this.databaseUrl(options.databaseUrl) });
    const ownsClient = !options.client;
    const cleanupDirs = [];

    if (ownsClient) {
      await client.connect();
    }

    try {
      const rows = await this.readSourceRows(client);
      const outputRoot = options.check
        ? this.deps.fs.mkdtempSync(
            this.deps.path.join(this.deps.os.tmpdir(), 'governance-db-export-output-')
          )
        : this.deps.path.resolve(options.outputRoot || this.parseArgs([]).outputRoot);

      if (options.check) {
        cleanupDirs.push(outputRoot);
      } else {
        this.deps.fs.mkdirSync(outputRoot, { recursive: true });
      }

      this.writeSourceDocuments(rows, outputRoot);

      const artifactPaths = rows.map((row) => String(row.sourcePath).replace(/\\/g, '/')).sort();
      const report = options.check
        ? this.compareGeneratedArtifacts({
            expectedRoot: this.deps.repoRoot,
            actualRoot: outputRoot,
            artifactPaths,
          })
        : { ok: true, missing: [], changed: [] };

      if (options.check && !report.ok) {
        throw new Error(this.formatDiffReport(report));
      }

      return {
        sources: rows.length,
        outputRoot,
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
  const runner = new GovernanceDbExportRunner();
  const options = runner.parseArgs(process.argv.slice(2));

  if (options.help) {
    runner.printHelp();
    return;
  }

  const result = await runner.exportGovernanceDerivedSurfaces(options);
  console.log(
    `[governance:db:export] sources=${result.sources} outputRoot=${dependencies.path.relative(
      dependencies.repoRoot,
      result.outputRoot
    )}`
  );
  console.log(runner.formatDiffReport(result.report));
}

if (require.main === module) {
  main().catch((error) => {
    console.error(`[governance:db:export] ${error.message}`);
    process.exit(1);
  });
}

module.exports = {
  GovernanceDbExportRunner,
  exportedGovernanceArtifactPaths,
};
