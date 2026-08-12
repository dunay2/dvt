/** Owned concern: parse the bounded governed-source current-content command. */
const { normalizeGovernedSourcePath } = require('../governed-source-refresh-write-rail.cjs');

const supportedFlags = new Set(['path', 'expected-content-sha256', 'actor', 'idempotency-key']);

function parseExpectedContentHashes(values) {
  const entries = Array.isArray(values) ? values : values ? [values] : [];
  const result = {};

  for (const entry of entries) {
    const separator = String(entry).indexOf('=');
    if (separator < 1) {
      throw new Error(
        `Invalid --expected-content-sha256 "${entry}". Expected <path>=<lowercase-sha256>.`
      );
    }
    const sourcePath = normalizeGovernedSourcePath(String(entry).slice(0, separator));
    const contentHash = String(entry).slice(separator + 1);
    if (!/^[a-f0-9]{64}$/u.test(contentHash)) {
      throw new Error(
        `Invalid --expected-content-sha256 for "${sourcePath}". Expected a lowercase sha256 digest.`
      );
    }
    if (result[sourcePath] && result[sourcePath] !== contentHash) {
      throw new Error(`Conflicting expected content hashes for "${sourcePath}".`);
    }
    result[sourcePath] = contentHash;
  }

  return result;
}

function createGovernedSourceRefreshCommandParser(deps) {
  const { normalizeOptionalText, requireOption } = deps;

  function parseGovernedSourceFlags(args) {
    const options = {};
    const repeatable = new Set(['path', 'expected-content-sha256']);
    for (let index = 0; index < args.length; index += 2) {
      const flag = args[index];
      const value = args[index + 1];
      if (!flag?.startsWith('--') || value === undefined || value.startsWith('--')) {
        throw new Error(`Invalid governed-source flag sequence near "${flag || ''}".`);
      }
      const key = flag.slice(2);
      if (!supportedFlags.has(key)) {
        throw new Error(`Unknown governed-source flag "${flag}".`);
      }
      const camelKey = key.replace(/-([a-z])/gu, (_, character) => character.toUpperCase());
      if (repeatable.has(key)) {
        options[camelKey] = options[camelKey] || [];
        options[camelKey].push(value);
      } else {
        options[camelKey] = value;
      }
    }
    return options;
  }

  return function parseGovernedSourceRefreshCommand(action, args) {
    if (action !== 'refresh') {
      throw new Error(`Unknown governed-source operation "${action}". Expected refresh.`);
    }

    const options = parseGovernedSourceFlags(args);
    const paths = [
      ...new Set(
        (Array.isArray(options.path) ? options.path : [options.path])
          .filter(Boolean)
          .map(normalizeGovernedSourcePath)
      ),
    ].sort();
    if (paths.length === 0) {
      throw new Error('RefreshGovernedSourceContent requires at least one --path.');
    }

    const expectedContentSha256ByPath = parseExpectedContentHashes(options.expectedContentSha256);
    for (const sourcePath of Object.keys(expectedContentSha256ByPath)) {
      if (!paths.includes(sourcePath)) {
        throw new Error(`Expected content hash was supplied for unrequested path "${sourcePath}".`);
      }
    }

    const command = {
      kind: 'governed_source_content_refresh',
      paths,
      expectedContentSha256ByPath,
      actor: requireOption(options, 'actor'),
      idempotencyKey: normalizeOptionalText(options.idempotencyKey),
    };

    return command;
  };
}

module.exports = {
  createGovernedSourceRefreshCommandParser,
  parseExpectedContentHashes,
};
