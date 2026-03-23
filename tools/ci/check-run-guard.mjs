import process from 'node:process';

export function selectLatestCheckRunByName(checkRuns, checkName) {
  const matches = (checkRuns ?? []).filter((run) => run?.name === checkName);
  if (matches.length === 0) return undefined;

  const score = (run) => {
    const raw = run.completed_at ?? run.started_at ?? run.created_at ?? '';
    const timestamp = Date.parse(raw);
    return Number.isNaN(timestamp) ? 0 : timestamp;
  };

  return matches.sort((a, b) => score(b) - score(a))[0];
}

export function evaluateCheckRunResult(run) {
  if (!run) return { status: 'not_found' };
  if (run.status !== 'completed') return { status: 'pending', run };
  if (run.conclusion === 'success') return { status: 'success', run };
  return { status: 'failure', run };
}

export async function waitForCheckRun({
  fetchRuns,
  checkName,
  retries = 60,
  delayMs = 10000,
  sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  log = () => {},
}) {
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    const checkRuns = await fetchRuns();
    const run = selectLatestCheckRunByName(checkRuns, checkName);
    const evaluation = evaluateCheckRunResult(run);

    if (evaluation.status === 'success') return { ok: true, run };
    if (evaluation.status === 'failure') return { ok: false, reason: 'failed', run };

    log(
      `[${attempt}/${retries}] Check "${checkName}" status: ${evaluation.status}${
        run ? ` (${run.status})` : ''
      }`,
    );
    await sleep(delayMs);
  }

  return { ok: false, reason: 'timeout' };
}

export async function listCheckRunsForRef({ owner, repo, ref, token, fetchImpl = fetch }) {
  const response = await fetchImpl(
    `https://api.github.com/repos/${owner}/${repo}/commits/${ref}/check-runs?per_page=100`,
    {
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'X-GitHub-Api-Version': '2022-11-28',
      },
    },
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`GitHub Checks API failed (${response.status}): ${body}`);
  }

  const payload = await response.json();
  return payload.check_runs ?? [];
}

async function runCli() {
  const token = process.env.GITHUB_TOKEN;
  const repository = process.env.GITHUB_REPOSITORY;
  const ref = process.env.GITHUB_REF_SHA;
  const checkName = process.env.CHECK_NAME;
  const retries = Number(process.env.CHECK_RETRIES ?? '60');
  const delayMs = Number(process.env.CHECK_DELAY_MS ?? '10000');

  if (!token || !repository || !ref || !checkName) {
    console.error(
      'Missing required env vars: GITHUB_TOKEN, GITHUB_REPOSITORY, GITHUB_REF_SHA, CHECK_NAME',
    );
    process.exit(2);
  }

  const [owner, repo] = repository.split('/');
  const result = await waitForCheckRun({
    checkName,
    retries,
    delayMs,
    fetchRuns: () => listCheckRunsForRef({ owner, repo, ref, token }),
    log: (msg) => console.log(msg),
  });

  if (!result.ok) {
    if (result.reason === 'failed' && result.run) {
      console.error(
        `Required check "${checkName}" concluded with "${result.run.conclusion}" (status "${result.run.status}").`,
      );
    } else {
      console.error(`Required check "${checkName}" did not complete in time.`);
    }
    process.exit(1);
  }

  console.log(`Required check "${checkName}" passed.`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runCli().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
