import { pathToFileURL } from 'node:url';

import {
  beginReleaseCandidateIntegrityCheck,
  completeReleaseCandidateIntegrityCheck,
} from './releaseCandidateCheckPublication.mjs';

const SUPPORTED_FLAGS = new Set([
  'repository',
  'head',
  'details-url',
  'external-id',
  'check-run-id',
  'conclusion',
]);

function readArguments(values) {
  const parsed = new Map();
  for (let index = 0; index < values.length; index += 2) {
    const flag = values[index];
    const value = values[index + 1];
    if (!flag?.startsWith('--') || !value) {
      throw new TypeError(`Invalid release candidate check argument near ${flag ?? '<end>'}.`);
    }
    const name = flag.slice(2);
    if (!SUPPORTED_FLAGS.has(name)) {
      throw new TypeError(`Unknown release candidate check argument: ${flag}.`);
    }
    if (parsed.has(name)) {
      throw new TypeError(`Duplicate release candidate check argument: ${flag}.`);
    }
    parsed.set(name, value);
  }
  return parsed;
}

export function parseReleaseCandidateCheckArguments(argv) {
  const [command, ...rest] = argv;
  if (!['begin', 'complete'].includes(command)) {
    throw new TypeError('Release candidate check command must be begin or complete.');
  }
  const values = readArguments(rest);
  const repository = values.get('repository');
  const headSha = values.get('head');
  if (command === 'begin') {
    const detailsUrl = values.get('details-url');
    const externalId = values.get('external-id');
    if (!repository || !headSha || !detailsUrl || !externalId) {
      throw new TypeError(
        'Beginning the release candidate check requires --repository, --head, --details-url, and --external-id.'
      );
    }
    if (values.has('check-run-id') || values.has('conclusion')) {
      throw new TypeError('Beginning the release candidate check received completion arguments.');
    }
    return { command, repository, headSha, detailsUrl, externalId };
  }

  const rawCheckRunId = values.get('check-run-id');
  const conclusion = values.get('conclusion');
  if (!repository || !headSha || !rawCheckRunId || !conclusion) {
    throw new TypeError(
      'Completing the release candidate check requires --repository, --head, --check-run-id, and --conclusion.'
    );
  }
  if (values.has('details-url') || values.has('external-id')) {
    throw new TypeError('Completing the release candidate check received begin arguments.');
  }
  const checkRunId = Number(rawCheckRunId);
  return { command, repository, headSha, checkRunId, conclusion };
}

function projectCheckRun(payload) {
  return {
    id: payload.id,
    name: payload.name,
    headSha: payload.head_sha,
    status: payload.status,
    conclusion: payload.conclusion ?? undefined,
  };
}

export function createGitHubCheckRunPort({
  token,
  fetchImpl = fetch,
  apiUrl = 'https://api.github.com',
}) {
  if (!token) {
    throw new TypeError('GitHub check publication requires an API token.');
  }
  const request = async (method, path, body = undefined) => {
    const response = await fetchImpl(`${apiUrl}/${path}`, {
      method,
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!response.ok) {
      throw new Error(`GitHub Checks API failed (${response.status}): ${await response.text()}`);
    }
    return response.json();
  };

  return {
    createCheckRun: async (command) =>
      projectCheckRun(
        await request('POST', `repos/${command.repository}/check-runs`, {
          name: command.name,
          head_sha: command.headSha,
          status: command.status,
          details_url: command.detailsUrl,
          external_id: command.externalId,
          output: command.output,
        })
      ),
    completeCheckRun: async (command) => {
      const current = projectCheckRun(
        await request('GET', `repos/${command.repository}/check-runs/${command.checkRunId}`)
      );
      if (current.name !== command.name || current.headSha !== command.headSha) {
        throw new Error('GitHub check run does not belong to the authoritative pull request head.');
      }
      return projectCheckRun(
        await request('PATCH', `repos/${command.repository}/check-runs/${command.checkRunId}`, {
          name: command.name,
          status: command.status,
          conclusion: command.conclusion,
          output: command.output,
        })
      );
    },
  };
}

export async function runReleaseCandidateCheckCli(
  argv = process.argv.slice(2),
  {
    port = createGitHubCheckRunPort({ token: process.env.GH_TOKEN ?? process.env.GITHUB_TOKEN }),
    write = (value) => console.log(value),
  } = {}
) {
  const parsed = parseReleaseCandidateCheckArguments(argv);
  const result =
    parsed.command === 'begin'
      ? await beginReleaseCandidateIntegrityCheck(parsed, port)
      : await completeReleaseCandidateIntegrityCheck(parsed, port);
  write(parsed.command === 'begin' ? String(result.id) : result.conclusion);
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    process.exitCode = await runReleaseCandidateCheckCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
