/// <reference types="node" />
/** Owned concern: own opt-in Chromium capture lifecycle and publish only its safe projection. */
import { existsSync, mkdtempSync, readdirSync, rmdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, isAbsolute, join } from 'node:path';

import type {} from 'cypress';

import {
  ChromiumDiagnosticsError,
  classifyChromiumFailure,
  finalizeChromiumCapture,
  publishChromiumLifecycleFailures,
  stageChromiumObservation,
  type ChromiumLifecycleFailure,
} from './chromiumNetworkEvidence';
import {
  startChromiumProcessObserver,
  type ChromiumProcessObserverBinding,
} from './chromiumProcessObserver';

type ChromiumNetworkDiagnosticsBinding = Readonly<{
  directory: string;
  beforeBrowserLaunch(
    browser: Cypress.Browser,
    launch: Cypress.BeforeBrowserLaunchOptions
  ): Cypress.BeforeBrowserLaunchOptions;
  afterRun(): void;
}>;

function diagnosticsEnabled(): boolean {
  const flag = process.env.DVT_CYPRESS_NETWORK_DIAGNOSTICS;
  if (flag !== undefined && flag !== '' && flag !== '1')
    throw new Error('Invalid Chromium network diagnostics flag');
  return flag === '1';
}

function browserCaptures(
  directory: string
): Readonly<{ directories: string[]; unexpected: boolean }> {
  const entries = readdirSync(directory, { withFileTypes: true });
  const directories = entries
    .filter((capture) => capture.isDirectory() && /^chrome-[A-Za-z0-9]+$/u.test(capture.name))
    .map((capture) => join(directory, capture.name));
  return { directories, unexpected: entries.length !== directories.length };
}

export function createChromiumNetworkDiagnostics(
  options: Readonly<{ enabled: boolean; workspaceRoot: string }>
): ChromiumNetworkDiagnosticsBinding | null {
  if (!options.enabled) return null;
  const directory = mkdtempSync(join(tmpdir(), 'dvt-chromium-network-'));
  return {
    directory,
    beforeBrowserLaunch(browser: Cypress.Browser, launch: Cypress.BeforeBrowserLaunchOptions) {
      return attachChromiumCapture(directory, browser, launch).launch;
    },
    afterRun() {
      const failures: ChromiumLifecycleFailure[] = [];
      let captures: string[] = [];
      try {
        const inventory = browserCaptures(directory);
        captures = inventory.directories;
        if (inventory.unexpected) failures.push({ phase: 'capture-enumeration', code: 'invalid' });
        if (captures.length === 0) failures.push({ phase: 'capture-enumeration', code: 'missing' });
      } catch (error) {
        failures.push(...classifyChromiumFailure('capture-enumeration', error));
      }
      for (const browserDirectory of captures) {
        try {
          finalizeChromiumCapture(browserDirectory, options.workspaceRoot);
        } catch (error) {
          failures.push(...classifyChromiumFailure('capture-enumeration', error));
        }
      }
      try {
        rmdirSync(directory);
      } catch (error) {
        failures.push(...classifyChromiumFailure('capture-cleanup', error));
      }
      if (failures.length > 0) throw new ChromiumDiagnosticsError(failures);
    },
  };
}

function attachChromiumCapture(
  directory: string,
  browser: Cypress.Browser,
  launch: Cypress.BeforeBrowserLaunchOptions
): Readonly<{ captureDirectory: string | null; launch: Cypress.BeforeBrowserLaunchOptions }> {
  if (browser.family !== 'chromium') return { captureDirectory: null, launch };
  const capture = mkdtempSync(join(directory, 'chrome-'));
  launch.args.push(
    `--log-net-log=${join(capture, 'netlog.json')}`,
    '--net-log-capture-mode=Default',
    '--enable-logging',
    `--log-file=${join(capture, 'process.log')}`
  );
  return { captureDirectory: capture, launch };
}

export async function withChromiumNetworkDiagnostics<T>(
  workspaceRoot: string,
  operation: () => Promise<T>,
  observeProcesses: typeof startChromiumProcessObserver = startChromiumProcessObserver
): Promise<T> {
  const binding = createChromiumNetworkDiagnostics({
    enabled: diagnosticsEnabled(),
    workspaceRoot,
  });
  if (binding === null) return operation();
  const previous = process.env.DVT_CHROMIUM_NETWORK_CAPTURE_ROOT;
  process.env.DVT_CHROMIUM_NETWORK_CAPTURE_ROOT = binding.directory;
  let observer: ChromiumProcessObserverBinding | null = null;
  try {
    const completion = await Promise.allSettled([
      (async () => {
        observer = await observeProcesses({ workspaceRoot, captureRoot: binding.directory });
        return operation();
      })(),
    ]);
    const stopped = await Promise.allSettled([Promise.resolve().then(() => observer?.stop())]);
    const finalized = await Promise.allSettled([Promise.resolve().then(() => binding.afterRun())]);
    const outcomes = [
      ['native-operation', completion[0]],
      ['observer-stop', stopped[0]],
      ['capture-enumeration', finalized[0]],
    ] as const;
    const failures = outcomes.flatMap(([, outcome]) =>
      outcome.status === 'rejected' ? [outcome.reason] : []
    );
    if (failures.length > 0) {
      const classified = outcomes.flatMap(([phase, outcome]) =>
        outcome.status === 'rejected' ? classifyChromiumFailure(phase, outcome.reason) : []
      );
      try {
        publishChromiumLifecycleFailures(workspaceRoot, classified);
      } catch (error) {
        failures.push(
          new ChromiumDiagnosticsError(classifyChromiumFailure('capture-publication', error))
        );
      }
    }
    if (failures.length > 1)
      throw new AggregateError(failures, 'Chromium diagnostics completion failed');
    if (failures.length === 1) throw failures[0];
    const outcome = completion[0];
    if (outcome.status === 'fulfilled') return outcome.value;
    throw outcome.reason;
  } finally {
    if (previous === undefined) delete process.env.DVT_CHROMIUM_NETWORK_CAPTURE_ROOT;
    else process.env.DVT_CHROMIUM_NETWORK_CAPTURE_ROOT = previous;
  }
}

export function configureChromiumNetworkDiagnostics(
  on: Cypress.PluginEvents,
  config: Cypress.PluginConfigOptions,
  prepareBrowserLaunch?: (
    browser: Cypress.Browser,
    launch: Cypress.BeforeBrowserLaunchOptions
  ) => Cypress.BeforeBrowserLaunchOptions
): Cypress.PluginConfigOptions {
  if (diagnosticsEnabled()) {
    const directory = process.env.DVT_CHROMIUM_NETWORK_CAPTURE_ROOT;
    if (
      directory === undefined ||
      !isAbsolute(directory) ||
      !basename(directory).startsWith('dvt-chromium-network-') ||
      !existsSync(directory)
    )
      throw new Error('Missing owned Chromium capture lease');
    let activeCapture: string | null = null;
    on('before:browser:launch', (browser, launch) => {
      const attached = attachChromiumCapture(
        directory,
        browser,
        prepareBrowserLaunch?.(browser, launch) ?? launch
      );
      activeCapture = attached.captureDirectory;
      return attached.launch;
    });
    let sequence = 0;
    on('after:spec', (spec, results) => {
      if (results === undefined || results.stats.failures === 0) return;
      try {
        const relative = spec.relative.replace(/\\/gu, '/');
        if (activeCapture === null) throw new Error('Missing Chromium capture');
        sequence += 1;
        stageChromiumObservation(activeCapture, { sequence, spec: relative });
      } catch {
        throw new Error('Chromium network snapshot failed');
      }
    });
  } else if (prepareBrowserLaunch != null) {
    on('before:browser:launch', prepareBrowserLaunch);
  }
  return config;
}
