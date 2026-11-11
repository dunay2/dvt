/**
 * Owned concern: admit unambiguous changed-suite CLI arguments.
 * @reason GH-3853 separates CLI admission, Git acquisition and evidence execution.
 * @consequence The existing changed-suite rail retains direct owners and unchanged inputs.
 */
import { WEB_CYPRESS_CAPABILITIES } from '../cypress.catalog';
import type { WebCypressCapability, WebCypressShard } from '../cypress.changed';

import {
  isWebVitestExecutionGroup,
  type WebVitestExecutionGroup,
} from './vitest-execution-partitions';

type WebEvidencePhase = 'all' | 'vitest' | 'browser';

type ChangedSuiteArgs = Readonly<{
  plan: boolean;
  full: boolean;
  phase: WebEvidencePhase;
  browserCapability?: WebCypressCapability;
  browserShard?: WebCypressShard;
  vitestGroup?: WebVitestExecutionGroup;
  files: readonly string[];
}>;

const WEB_EVIDENCE_PHASES: ReadonlyMap<string, WebEvidencePhase> = new Map([
  ['--phase=vitest', 'vitest'],
  ['--phase=browser', 'browser'],
]);
const WEB_BROWSER_CAPABILITIES: ReadonlyMap<string, WebCypressCapability> = new Map(
  WEB_CYPRESS_CAPABILITIES.map((capability) => [`--browser-capability=${capability}`, capability])
);

export function parseChangedSuiteArgs(argv: readonly string[]): ChangedSuiteArgs {
  const flags = new Set<string>();
  const files: string[] = [];
  let phase: WebEvidencePhase = 'all';
  let browserCapability: WebCypressCapability | undefined;
  let browserShard: WebCypressShard | undefined;
  let vitestGroup: WebVitestExecutionGroup | undefined;
  for (const arg of argv) {
    if (arg === '--') continue;
    if (!arg.startsWith('--')) {
      files.push(arg);
      continue;
    }
    const selectedPhase = WEB_EVIDENCE_PHASES.get(arg);
    const selectedCapability = WEB_BROWSER_CAPABILITIES.get(arg);
    const selectedShard = /^--browser-shard=([1-9]\d*)\/([1-9]\d*)$/.exec(arg);
    const selectedVitestGroup = arg.startsWith('--vitest-group=')
      ? arg.slice('--vitest-group='.length)
      : undefined;
    const flag = arg.split('=', 1)[0]!;
    if (
      (selectedPhase === undefined &&
        selectedCapability === undefined &&
        selectedShard === null &&
        !(selectedVitestGroup !== undefined && isWebVitestExecutionGroup(selectedVitestGroup)) &&
        !['--plan', '--full', '--files'].includes(arg)) ||
      flags.has(flag)
    ) {
      throw new Error(`Invalid or repeated changed-suite argument: ${arg}`);
    }
    flags.add(flag);
    phase = selectedPhase ?? phase;
    browserCapability = selectedCapability ?? browserCapability;
    if (selectedVitestGroup !== undefined && isWebVitestExecutionGroup(selectedVitestGroup)) {
      vitestGroup = selectedVitestGroup;
    }
    if (selectedShard) {
      const index = Number(selectedShard[1]);
      const count = Number(selectedShard[2]);
      if (!Number.isSafeInteger(index) || !Number.isSafeInteger(count) || index > count) {
        throw new Error(`Invalid browser shard selector: ${arg}`);
      }
      browserShard = { index, count };
    }
  }
  const plan = flags.has('--plan');
  const full = flags.has('--full');
  if (vitestGroup !== undefined && phase !== 'vitest') {
    throw new Error('--vitest-group requires --phase=vitest.');
  }
  if (browserCapability !== undefined && phase !== 'browser') {
    throw new Error('--browser-capability requires --phase=browser.');
  }
  if (
    browserShard !== undefined &&
    browserCapability !== 'available' &&
    browserCapability !== 'controlled'
  ) {
    throw new Error(
      '--browser-shard requires --phase=browser and --browser-capability=controlled or available.'
    );
  }
  if ((full && !plan && phase !== 'browser') || (flags.has('--files') && files.length === 0)) {
    throw new Error(
      'Use --phase=browser with --full alongside the full Vitest gate; --files requires paths.'
    );
  }
  return {
    plan,
    full,
    phase,
    files,
    ...(browserCapability === undefined ? {} : { browserCapability }),
    ...(browserShard === undefined ? {} : { browserShard }),
    ...(vitestGroup === undefined ? {} : { vitestGroup }),
  };
}
