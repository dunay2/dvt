// @vitest-environment node
/**
 * Owned concern: prove selected LIVE prerequisites reject before costly execution.
 * @reason GH-3853 observed late environment rejection after 52 controlled specs.
 * @consequence Planning and unselected capabilities never acquire provider requirements.
 */
import { spawnSync } from 'node:child_process';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { main } from '../../scripts/run-vitest-changed-suites';
import { resolveWebEvidenceEnvironment } from '../../scripts/web-evidence-environment';

const { resolveDbt } = vi.hoisted(() => ({ resolveDbt: vi.fn() }));
vi.mock('node:child_process', async (original) => ({
  ...(await original<typeof import('node:child_process')>()),
  spawnSync: vi.fn(() => ({ status: 0 })),
}));
vi.mock('../../scripts/web-evidence-environment', async (original) => {
  const actual = await original<typeof import('../../scripts/web-evidence-environment')>();
  return {
    resolveWebEvidenceEnvironment: vi.fn(
      (
        commands: Parameters<typeof actual.resolveWebEvidenceEnvironment>[0],
        env: NodeJS.ProcessEnv
      ) => actual.resolveWebEvidenceEnvironment(commands, env, resolveDbt)
    ),
  };
});

const boundary = 'apps/web/scripts/run-vitest-changed-suites.ts';
const files = ['--files', boundary];

beforeEach(() => {
  vi.clearAllMocks();
  resolveDbt.mockReset().mockReturnValue('/tools/dbt');
  vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
});
afterEach(() => vi.restoreAllMocks());

describe('selected Web execution prerequisites', () => {
  it('rejects a missing LIVE prerequisite before dependency or proof processes', () => {
    resolveDbt.mockImplementation(() => {
      throw new Error('dbt unavailable');
    });
    expect(() => main(files)).toThrow('dbt unavailable');
    expect(resolveDbt).toHaveBeenCalledOnce();
    expect(spawnSync).not.toHaveBeenCalled();
  });

  it.each([['--phase=vitest'], ['--phase=browser', '--browser-capability=controlled']])(
    'does not require dbt for selected partition %j',
    (...selectors) => {
      resolveDbt.mockImplementation(() => {
        throw new Error('unselected prerequisite must not be acquired');
      });
      main([...selectors, ...files]);
      expect(resolveDbt).not.toHaveBeenCalled();
      expect(spawnSync).toHaveBeenCalled();
    }
  );

  it.each(['available', 'unavailable'])(
    'resolves dbt before the %s LIVE partition',
    (capability) => {
      main(['--phase=browser', `--browser-capability=${capability}`, ...files]);
      expect(resolveDbt).toHaveBeenCalledOnce();
      expect(resolveDbt.mock.invocationCallOrder[0]).toBeLessThan(
        vi.mocked(spawnSync).mock.invocationCallOrder[0]!
      );
      for (const [, options] of vi.mocked(spawnSync).mock.calls) {
        expect(options).toMatchObject({
          env: { DVT_DBT_BIN: '/tools/dbt', DVT_DBT_ANALYZER_BIN: '/tools/dbt' },
        });
      }
    }
  );

  it('emits the complete dry plan without resolving provider prerequisites', () => {
    main(['--plan', ...files]);
    expect(resolveWebEvidenceEnvironment).not.toHaveBeenCalled();
    expect(resolveDbt).not.toHaveBeenCalled();
    expect(spawnSync).not.toHaveBeenCalled();
    const output = vi
      .mocked(process.stdout.write)
      .mock.calls.map(([chunk]) => chunk)
      .join('');
    expect(
      JSON.parse(output).browserCommands.map((entry: { capability: string }) => entry.capability)
    ).toEqual(['controlled', 'controlled', 'controlled', 'available', 'unavailable']);
  });

  it('does not acquire execution requirements when no evidence is selected', () => {
    main(['--files', 'README.md']);
    expect(resolveWebEvidenceEnvironment).not.toHaveBeenCalled();
    expect(resolveDbt).not.toHaveBeenCalled();
    expect(spawnSync).not.toHaveBeenCalled();
  });

  it('does not mutate the parent environment when normalizing the LIVE binary', () => {
    const env = Object.freeze({ DVT_DBT_BIN: '/tools/dbt', PATH: '/tools' });
    resolveWebEvidenceEnvironment([{ capability: 'available' }], env);
    expect(env).toEqual({ DVT_DBT_BIN: '/tools/dbt', PATH: '/tools' });
    expect(resolveDbt).toHaveBeenCalledWith(env);
  });
});
