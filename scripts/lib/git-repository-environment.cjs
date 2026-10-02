/** Owned concern: isolate child Git repository context without changing the caller environment. */
const { execFileSync } = require('node:child_process');

let repositoryLocalVariableNames;

function createGitRepositoryEnvironment(environment = process.env) {
  if (!repositoryLocalVariableNames) {
    // Discovery is read-only. It must not itself inherit foreign Git config/context.
    const discoveryEnvironment = Object.fromEntries(
      Object.entries(environment).filter(([name]) => !name.toUpperCase().startsWith('GIT_'))
    );
    const names = execFileSync('git', ['rev-parse', '--local-env-vars'], {
      env: discoveryEnvironment,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    })
      .trim()
      .split(/\r?\n/u)
      .filter(Boolean);
    if (names.length === 0)
      throw new Error('Git did not declare its repository-local environment.');
    repositoryLocalVariableNames = new Set(names);
  }
  return Object.fromEntries(
    Object.entries(environment).filter(([name]) => {
      const key = name.toUpperCase();
      return !repositoryLocalVariableNames.has(key) && !/^GIT_CONFIG_(KEY|VALUE)_\d+$/u.test(key);
    })
  );
}

module.exports = { createGitRepositoryEnvironment };
