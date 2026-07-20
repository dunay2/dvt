import { pathToFileURL } from 'node:url';

import { classifyReleaseCandidateAuthority } from './releaseCandidateAuthority.mjs';

const SUPPORTED_FLAGS = new Set([
  'base-ref',
  'head-ref',
  'base-repository',
  'head-repository',
  'head-sha',
  'merge-sha',
]);

export function parseReleaseCandidateAuthorityArguments(argv) {
  const values = new Map();
  for (let index = 0; index < argv.length; index += 2) {
    const flag = argv[index];
    const value = argv[index + 1];
    if (!flag?.startsWith('--') || value === undefined) {
      throw new TypeError(`Invalid release candidate authority argument near ${flag ?? '<end>'}.`);
    }
    const name = flag.slice(2);
    if (!SUPPORTED_FLAGS.has(name)) {
      throw new TypeError(`Unknown release candidate authority argument: ${flag}.`);
    }
    if (values.has(name)) {
      throw new TypeError(`Duplicate release candidate authority argument: ${flag}.`);
    }
    values.set(name, value);
  }

  const missing = [...SUPPORTED_FLAGS].filter((name) => !values.has(name));
  if (missing.length > 0) {
    throw new TypeError(
      'Release candidate authority requires --base-ref, --head-ref, --base-repository, ' +
        '--head-repository, --head-sha, and --merge-sha.'
    );
  }

  return {
    baseRef: values.get('base-ref'),
    headRef: values.get('head-ref'),
    baseRepository: values.get('base-repository'),
    headRepository: values.get('head-repository'),
    headSha: values.get('head-sha'),
    mergeSha: values.get('merge-sha') || undefined,
  };
}

export async function runReleaseCandidateAuthorityCli(
  argv = process.argv.slice(2),
  { write = (value) => console.log(value) } = {}
) {
  const classification = classifyReleaseCandidateAuthority(
    parseReleaseCandidateAuthorityArguments(argv)
  );
  write(JSON.stringify(classification));
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    process.exitCode = await runReleaseCandidateAuthorityCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
