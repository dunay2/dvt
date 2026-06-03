#!/usr/bin/env node

'use strict';

const { runPlanningImport } = require('./planning-db-import.cjs');

function parseArgs(argv = process.argv.slice(2)) {
  const options = {
    databaseUrl: null,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    if (token === '--') {
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

    if (token === '--if-stale') {
      options.ifStale = true;
      continue;
    }

    if (token === '--help' || token === '-h') {
      options.help = true;
      continue;
    }

    throw new Error(`Unknown governance DB import option "${token}".`);
  }

  return options;
}

function printHelp() {
  console.log('Usage: pnpm governance:db:import [--if-stale] [--database-url <url>]');
}

async function runGovernanceImport(options = {}, deps = { runPlanningImport }) {
  return deps.runPlanningImport({
    databaseUrl: options.databaseUrl,
    ifStale: options.ifStale,
    includePlanning: false,
    includeGovernance: true,
  });
}

async function main() {
  const options = parseArgs();
  if (options.help) {
    printHelp();
    return;
  }

  const result = await runGovernanceImport(options);
  console.log(
    `[governance:db:import] governanceFiles=${result.governanceFiles} governanceComponents=${result.governanceComponents} governanceRemediationTasks=${result.governanceRemediationTasks}`
  );
}

if (require.main === module) {
  main().catch((error) => {
    console.error(`[governance:db:import] ${error.message}`);
    process.exit(1);
  });
}

module.exports = {
  parseArgs,
  runGovernanceImport,
};
