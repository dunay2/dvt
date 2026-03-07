import {
  CONTRACT_SCOPE_PATTERNS,
  PR_QUALITY_SCOPE_PATTERNS,
  TEST_SCOPE_PATTERNS,
  computeBooleanScope,
  getChangedFiles,
  isPullRequestEvent,
  setGitHubOutput,
} from './scope-config.mjs';

const MODES = {
  contracts: CONTRACT_SCOPE_PATTERNS,
  'pr-quality': PR_QUALITY_SCOPE_PATTERNS,
  test: TEST_SCOPE_PATTERNS,
};

function parseMode(argv) {
  const modeFlagIndex = argv.findIndex((argument) => argument === '--mode');
  if (modeFlagIndex === -1) {
    throw new TypeError('MODE_REQUIRED');
  }

  const mode = argv[modeFlagIndex + 1];
  if (!mode || !(mode in MODES)) {
    throw new TypeError(`UNSUPPORTED_MODE: ${mode ?? 'undefined'}`);
  }

  return mode;
}

async function main() {
  const mode = parseMode(process.argv.slice(2));
  const eventName = process.env.EVENT_NAME ?? process.env.GITHUB_EVENT_NAME ?? '';
  const scopePatterns = MODES[mode];

  if (!isPullRequestEvent(eventName)) {
    for (const key of Object.keys(scopePatterns)) {
      setGitHubOutput(key, true);
    }
    return;
  }

  const changedFiles = await getChangedFiles(process.env.GIT_BASE, process.env.GIT_HEAD);
  const scope = computeBooleanScope(changedFiles, scopePatterns);

  for (const [key, value] of Object.entries(scope)) {
    setGitHubOutput(key, value);
  }
}

await main();
