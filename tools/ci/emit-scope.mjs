import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

import {
  buildChangedScopeContext,
  computeWorkflowModeScopeOutputs,
  getChangedFiles,
  isPullRequestEvent,
  parseScopeMode,
  setGitHubOutput,
} from './scope-config.mjs';

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
  const mode = parseScopeMode(process.argv.slice(2));
  const eventName = process.env.GITHUB_EVENT_NAME ?? '';

  if (!isPullRequestEvent(eventName)) {
    const scope = computeWorkflowModeScopeOutputs(mode, ['.github/workflows/ci.yml']);
    for (const key of Object.keys(scope)) {
      setGitHubOutput(key, true);
    }
    return;
  }

  const baseRef = process.env.GIT_BASE;
  const headRef = process.env.GIT_HEAD;
  ensureGitCommitAvailable(baseRef);
  const changedFiles = await getChangedFiles(baseRef, headRef);
  const scopeContext = await buildChangedScopeContext(changedFiles, { baseRef, headRef });
  const scope = computeWorkflowModeScopeOutputs(mode, changedFiles, scopeContext);

  for (const [key, value] of Object.entries(scope)) {
    setGitHubOutput(key, value);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
