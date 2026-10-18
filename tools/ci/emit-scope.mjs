import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

import {
  buildChangedScopeContext,
  getChangedFiles,
  isPullRequestEvent,
  setGitHubOutput,
} from './scope-config.mjs';
import { buildCiScopeOutputs } from './ci-scope-outputs.mjs';

function ensureGitCommitAvailable(ref) {
  if (!ref) return;

  try {
    execFileSync('git', ['cat-file', '-e', `${ref}^{commit}`], { stdio: 'ignore' });
    return;
  } catch {
    // Shallow PR checkouts may not contain the event's exact base SHA.
  }

  execFileSync('git', ['fetch', '--no-tags', '--depth=1', 'origin', ref], {
    stdio: 'inherit',
  });
}

export async function main() {
  if (process.argv.length > 2) throw new TypeError('SCOPE_ARGUMENTS_NOT_SUPPORTED');
  const eventName = process.env.GITHUB_EVENT_NAME ?? '';
  const full = !isPullRequestEvent(eventName);
  let changedFiles = [];
  let scopeContext = {};
  if (!full) {
    const baseRef = process.env.GIT_BASE;
    const headRef = process.env.GIT_HEAD;
    ensureGitCommitAvailable(baseRef);
    changedFiles = await getChangedFiles(baseRef, headRef);
    scopeContext = await buildChangedScopeContext(changedFiles, { baseRef, headRef });
  }
  const scope = buildCiScopeOutputs(changedFiles, scopeContext, { full });

  for (const [key, value] of Object.entries(scope)) {
    setGitHubOutput(key, value);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
