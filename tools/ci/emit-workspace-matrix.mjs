import { computeWorkspaceMatrix, getChangedFiles, isPullRequestEvent, setGitHubOutput } from './scope-config.mjs';

async function main() {
  const eventName = process.env.GITHUB_EVENT_NAME ?? '';

  if (!isPullRequestEvent(eventName)) {
    const { anyChanged, include } = computeWorkspaceMatrix(['.github/workflows/ci.yml']);
    setGitHubOutput('any_changed', anyChanged);
    setGitHubOutput('matrix', JSON.stringify({ include }));
    return;
  }

  const baseRef = process.env.GIT_BASE;
  const headRef = process.env.GIT_HEAD;
  const changedFiles = await getChangedFiles(baseRef, headRef);
  const { anyChanged, include } = computeWorkspaceMatrix(changedFiles);

  setGitHubOutput('any_changed', anyChanged);
  setGitHubOutput('matrix', JSON.stringify({ include }));
}

await main();
