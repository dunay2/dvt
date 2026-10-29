/** Owned concern: read the fixed current Planning DB schema bundle in memory. */
const fs = require('node:fs');
const path = require('node:path');
const { currentSchemaSources } = require('../../tools/planning-db/schema/manifest.cjs');

function readCurrentPlanningDbSchema() {
  if (arguments.length !== 0) throw new Error('Current schema reader accepts no arguments.');
  if (!Array.isArray(currentSchemaSources) || currentSchemaSources.length === 0) {
    throw new Error('Current schema manifest must contain source files.');
  }
  const root = path.resolve(__dirname, '..', '..');
  const seen = new Set();
  const targets = new Set();
  return currentSchemaSources
    .map((source) => {
      if (
        typeof source !== 'string' ||
        !/^tools\/planning-db\/schema\/(?:[a-z0-9-]+\/)*[a-z0-9-]+\.sql$/u.test(source) ||
        seen.has(source)
      ) {
        throw new Error('Current schema manifest requires unique canonical SQL paths.');
      }
      seen.add(source);
      let target = root;
      let stats;
      for (const segment of source.split('/')) {
        target = path.join(target, segment);
        stats = fs.lstatSync(target);
        if (stats.isSymbolicLink())
          throw new Error('Current schema source cannot use symbolic links.');
      }
      if (!stats.isFile()) throw new Error('Current schema source must be a regular file.');
      const actual = fs.realpathSync(target);
      if (targets.has(actual))
        throw new Error('Current schema source cannot alias another source.');
      targets.add(actual);
      const sql = fs.readFileSync(target, 'utf8');
      if (!sql.trim()) throw new Error('Current schema source cannot be empty.');
      if (/^\s*\\/mu.test(sql))
        throw new Error('Current schema source cannot contain psql metacommands.');
      return sql;
    })
    .join('');
}

module.exports = { readCurrentPlanningDbSchema };
