/// <reference types="node" />
/** Owned concern: own opt-in Chromium capture lifecycle and publish only its safe projection. */
import { existsSync, mkdtempSync, readdirSync, rmdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, isAbsolute, join } from 'node:path';

import type {} from 'cypress';

import { finalizeChromiumCapture, stageChromiumObservation } from './chromiumNetworkEvidence';

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

function browserCaptures(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).map((capture) => {
    if (!capture.isDirectory() || !/^chrome-[A-Za-z0-9]+$/u.test(capture.name))
      throw new Error('Unexpected Chromium capture entry');
    return join(directory, capture.name);
  });
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
      const captures = browserCaptures(directory);
      let failed = captures.length === 0;
      for (const browserDirectory of captures) {
        try {
          finalizeChromiumCapture(browserDirectory, options.workspaceRoot);
        } catch {
          failed = true;
        }
      }
      try {
        rmdirSync(directory);
      } catch {
        failed = true;
      }
      if (failed) throw new Error('Chromium network diagnostics failed');
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
  operation: () => Promise<T>
): Promise<T> {
  const binding = createChromiumNetworkDiagnostics({
    enabled: diagnosticsEnabled(),
    workspaceRoot,
  });
  if (binding === null) return operation();
  const previous = process.env.DVT_CHROMIUM_NETWORK_CAPTURE_ROOT;
  process.env.DVT_CHROMIUM_NETWORK_CAPTURE_ROOT = binding.directory;
  try {
    return await operation();
  } finally {
    if (previous === undefined) delete process.env.DVT_CHROMIUM_NETWORK_CAPTURE_ROOT;
    else process.env.DVT_CHROMIUM_NETWORK_CAPTURE_ROOT = previous;
    binding.afterRun();
  }
}

export function configureChromiumNetworkDiagnostics(
  on: Cypress.PluginEvents,
  config: Cypress.PluginConfigOptions
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
      const attached = attachChromiumCapture(directory, browser, launch);
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
  }
  return config;
}
