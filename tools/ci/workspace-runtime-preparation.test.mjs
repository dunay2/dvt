import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { runInNewContext } from 'node:vm';

const repoRoot = path.resolve('.');
const source = readFileSync('scripts/build-workspace-runtime-deps.cjs', 'utf8');
const workspace = (name) => ({ name, path: path.join(repoRoot, 'packages', name) });

function runPreparation(
  argv,
  {
    listings = {},
    buildResult = { status: 0 },
    platform = 'win32',
    selfManifest = { scripts: { build: 'node build.mjs' } },
  } = {}
) {
  const calls = [];
  const messages = [];
  const exited = new Error('CLI exited');
  let status = 0;
  try {
    runInNewContext(source, {
      __dirname: path.join(repoRoot, 'scripts'),
      console: {
        log: (message) => messages.push(message),
        error: (message) => messages.push(message),
      },
      process: {
        argv: ['node', 'build-workspace-runtime-deps.cjs', ...argv],
        env: { PRESERVED: 'yes' },
        platform,
        stdout: { write: (message) => messages.push(message) },
        stderr: { write: (message) => messages.push(message) },
        exit: (code) => {
          status = code;
          throw exited;
        },
      },
      require: (name) => {
        if (name === 'node:path') return path;
        if (name === 'node:fs') return { readFileSync: () => JSON.stringify(selfManifest) };
        assert.equal(name, 'node:child_process');
        return {
          spawnSync: (command, args, options) => {
            calls.push({ command, args: Array.from(args), options });
            if (args[0] !== 'list') return buildResult;
            const listing = listings[args[2].slice(0, -3)] ?? [];
            return Array.isArray(listing)
              ? { status: 0, stdout: JSON.stringify(listing) }
              : listing;
          },
        };
      },
    });
  } catch (error) {
    if (error !== exited) throw error;
  }
  return { calls, messages: messages.join('\n'), status };
}

test('runtime preparation builds the exact deduplicated production closure through one Turbo graph', () => {
  const result = runPreparation(
    ['@dvt/app', '--include-package', '@dvt/test-support', '--build-self'],
    {
      listings: {
        '@dvt/app': [workspace('@dvt/app'), workspace('@dvt/shared')],
        '@dvt/test-support': [workspace('@dvt/test-support'), workspace('@dvt/shared')],
      },
    }
  );
  assert.equal(result.status, 0);
  assert.deepEqual(
    result.calls.slice(0, 2).map(({ args }) => args),
    [
      ['list', '--filter-prod', '@dvt/app...', '--json', '--depth', '-1'],
      ['list', '--filter-prod', '@dvt/test-support...', '--json', '--depth', '-1'],
    ]
  );
  assert.equal(result.calls.length, 3);
  const build = result.calls[2];
  assert.deepEqual(build.args, [
    'exec',
    'turbo',
    'run',
    'build',
    '--only',
    '--concurrency=4',
    '--filter=@dvt/app',
    '--filter=@dvt/shared',
    '--filter=@dvt/test-support',
  ]);
  assert.equal(build.options.cwd, repoRoot);
  assert.equal(build.options.env.DVT_CI, '1');
  assert.equal(build.options.env.PRESERVED, 'yes');
  assert.equal(build.options.shell, true);
});

test('runtime preparation excludes the consumer unless self-build was requested', () => {
  const result = runPreparation(['@dvt/app'], {
    listings: { '@dvt/app': [workspace('@dvt/app'), workspace('@dvt/shared')] },
    platform: 'linux',
  });
  assert.equal(result.status, 0);
  assert.deepEqual(
    result.calls[1].args.filter((arg) => arg.startsWith('--filter=')),
    ['--filter=@dvt/shared']
  );
  assert.equal(result.calls[1].options.shell, false);
});

test('an included package can require the original consumer as a transitive dependency', () => {
  const result = runPreparation(['@dvt/app', '--include-package', '@dvt/consumer'], {
    listings: {
      '@dvt/app': [workspace('@dvt/app'), workspace('@dvt/shared')],
      '@dvt/consumer': [
        workspace('@dvt/consumer'),
        workspace('@dvt/app'),
        workspace('@dvt/shared'),
      ],
    },
  });
  assert.equal(result.status, 0);
  assert.deepEqual(
    result.calls.at(-1).args.filter((arg) => arg.startsWith('--filter=')),
    ['--filter=@dvt/app', '--filter=@dvt/consumer', '--filter=@dvt/shared']
  );
});

test('a leaf preparation does not start an unfiltered whole-workspace build', () => {
  const result = runPreparation(['@dvt/leaf'], {
    listings: { '@dvt/leaf': [workspace('@dvt/leaf')] },
  });
  assert.equal(result.status, 0);
  assert.equal(result.calls.length, 1);
  assert.match(result.messages, /No runtime workspace dependencies/);
});

test('every explicitly included package must exist even when the primary closure is valid', () => {
  const result = runPreparation(['@dvt/app', '--include-package', '@dvt/missing'], {
    listings: { '@dvt/app': [workspace('@dvt/app'), workspace('@dvt/shared')] },
  });
  assert.equal(result.status, 1);
  assert.equal(result.calls.length, 2);
  assert.match(result.messages, /WORKSPACE_PACKAGE_NOT_FOUND: @dvt\/missing/);
});

test('self-build requires a build script instead of accepting a successful zero-task Turbo run', () => {
  const result = runPreparation(['@dvt/leaf', '--build-self'], {
    listings: { '@dvt/leaf': [workspace('@dvt/leaf')] },
    selfManifest: {},
  });
  assert.equal(result.status, 1);
  assert.match(result.messages, /WORKSPACE_BUILD_SCRIPT_MISSING/);
  assert.equal(result.calls.length, 1);
});

test('similarly prefixed directories outside the workspace cannot satisfy package selection', () => {
  const result = runPreparation(['@dvt/app'], {
    listings: { '@dvt/app': [{ name: '@dvt/app', path: `${repoRoot}-other` }] },
  });
  assert.equal(result.status, 1);
  assert.match(result.messages, /WORKSPACE_PACKAGE_NOT_FOUND/);
  assert.equal(result.calls.length, 1);
});

for (const argv of [
  [],
  ['@dvt/app', '--unknown'],
  ['@dvt/app', '--include-package'],
  ['bad&command'],
  ['@dvt/app', '--include-package', 'bad name'],
]) {
  test(`invalid or shell-unsafe arguments reject before spawning: ${JSON.stringify(argv)}`, () => {
    const result = runPreparation(argv);
    assert.equal(result.status, 1);
    assert.equal(result.calls.length, 0);
  });
}

for (const [name, listing, error] of [
  ['missing package', [], /WORKSPACE_PACKAGE_NOT_FOUND/],
  ['malformed JSON', { status: 0, stdout: '{' }, /INVALID_PNPM_JSON/],
  ['failed listing', { status: 7, stderr: 'listing failed' }, /listing failed/],
  ['spawn failure', { error: new Error('spawn failed') }, /PNPM_SPAWN_FAILED/],
]) {
  test(`runtime preparation fails closed on ${name}`, () => {
    const result = runPreparation(['@dvt/app'], { listings: { '@dvt/app': listing } });
    assert.notEqual(result.status, 0);
    assert.match(result.messages, error);
    assert.equal(result.calls.length, 1);
  });
}

test('a failed or signalled Turbo process cannot report successful preparation', () => {
  for (const buildResult of [
    { status: 9 },
    { status: null },
    { error: new Error('build spawn failed') },
  ]) {
    const result = runPreparation(['@dvt/leaf', '--build-self'], {
      listings: { '@dvt/leaf': [workspace('@dvt/leaf')] },
      buildResult,
    });
    assert.notEqual(result.status, 0);
  }
});
