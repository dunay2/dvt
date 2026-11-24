/** Prove the dbt command settles only after its real child releases owned resources. */
import { ChildProcess } from 'node:child_process';
import { mkdir, mkdtemp, realpath, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, join } from 'node:path';

import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import { runDbtCommand } from '../src/dbtCliProcess.js';

let tempParent: string;
let root: string;
let cwd: string;
let profilesDir: string;
let childObserved: boolean;
let closeObserved: boolean;
let childClosed: Promise<void>;
let resolveClose: () => void;
let onSpawn: () => void;
let restoreChildEvents: () => void;

function observeOwnedChild(): () => void {
  const originalEmit = ChildProcess.prototype.emit;
  const observer = vi.spyOn(ChildProcess.prototype, 'emit').mockImplementation(function (
    this: ChildProcess,
    event: string | symbol,
    ...args: unknown[]
  ) {
    if (this.spawnargs.some((arg) => arg.startsWith(root))) {
      childObserved = true;
      if (event === 'close') {
        closeObserved = true;
        resolveClose();
      }
      if (event === 'spawn') onSpawn();
    }
    return originalEmit.call(this, event, ...args);
  });
  return () => observer.mockRestore();
}

beforeEach(async () => {
  tempParent = await realpath(tmpdir());
  root = await mkdtemp(join(tempParent, 'dvt-dbt-child-close-'));
  cwd = join(root, 'project');
  profilesDir = join(root, 'profile');
  await mkdir(cwd);
  await mkdir(profilesDir);
  await writeFile(join(cwd, 'run'), 'setInterval(() => undefined, 1_000);\n');
  childObserved = false;
  closeObserved = false;
  childClosed = new Promise<void>((resolve) => {
    resolveClose = resolve;
  });
  onSpawn = () => undefined;
  restoreChildEvents = observeOwnedChild();
});

afterEach(async () => {
  if (childObserved) await childClosed;
  restoreChildEvents();
  expect(dirname(root)).toBe(tempParent);
  expect(basename(root)).toMatch(/^dvt-dbt-child-close-/u);
  await rm(root, { recursive: true, force: true });
});

function runCommand(args: string[], dbtBin = process.execPath): ReturnType<typeof runDbtCommand> {
  return runDbtCommand(dbtBin, args, { cwd });
}

async function assertClosedBeforeCleanup(): Promise<void> {
  expect(childObserved).toBe(true);
  expect(closeObserved).toBe(true);
  await rm(profilesDir, { recursive: true, force: true });
  await rm(cwd, { recursive: true, force: true });
  await expect(stat(profilesDir)).rejects.toMatchObject({ code: 'ENOENT' });
  await expect(stat(cwd)).rejects.toMatchObject({ code: 'ENOENT' });
}

it('preserves AbortError and closes the real child before resource cleanup', async () => {
  const controller = new globalThis.AbortController();
  onSpawn = () => controller.abort();
  await expect(
    runDbtCommand(process.execPath, ['run', '--profiles-dir', profilesDir], {
      cwd,
      signal: controller.signal,
    })
  ).rejects.toMatchObject({ name: 'AbortError', code: 'ABORT_ERR' });
  await assertClosedBeforeCleanup();
});

it.each([
  {
    label: 'a nonzero exit',
    args: ['-e', 'process.stderr.write("dbt rejected"); process.exitCode = 7;', '--'],
    binary: () => process.execPath,
    error: { code: 7, stderr: 'dbt rejected' },
  },
  {
    label: 'stdout exceeding maxBuffer',
    args: ['-e', 'process.stdout.write("x".repeat(10 * 1024 * 1024 + 1));', '--'],
    binary: () => process.execPath,
    error: { code: 'ERR_CHILD_PROCESS_STDIO_MAXBUFFER' },
  },
  {
    label: 'a missing executable',
    args: ['run'],
    binary: () => join(cwd, 'missing-dbt-executable'),
    error: { code: 'ENOENT' },
  },
])('preserves $label after the actual child closes', async ({ args, binary, error }) => {
  await expect(runCommand(args, binary())).rejects.toMatchObject(error);
  await assertClosedBeforeCleanup();
});

it('preserves successful stdout and stderr after the actual child closes', async () => {
  const program = `
    const args = process.argv.slice(1);
    const target = args[args.indexOf('--target-path') + 1];
    require('fs').writeFileSync(require('path').join(target, 'run_results.json'),
      JSON.stringify({ results: [{ unique_id: 'model.orders', status: 'success' }] }));
    process.stdout.write('dbt stdout');
    process.stderr.write('dbt stderr');
  `;
  await expect(runCommand(['-e', program, '--'])).resolves.toEqual({
    stdout: 'dbt stdout',
    stderr: 'dbt stderr',
  });
  await assertClosedBeforeCleanup();
});

it('preserves synchronous argument validation when no child is created', async () => {
  await expect(runCommand(['run'], '')).rejects.toMatchObject({ code: 'ERR_INVALID_ARG_VALUE' });
  expect(childObserved).toBe(false);
});
