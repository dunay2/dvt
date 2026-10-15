/// <reference types="node" />
/** Owned concern: own opt-in Chromium capture lifecycle and publish only its safe projection. */
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmdirSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, isAbsolute, join, resolve } from 'node:path';

import type {} from 'cypress';

import { projectChromiumNetworkCapture } from './chromiumNetworkProjection';

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

export function createChromiumNetworkDiagnostics(
  options: Readonly<{ enabled: boolean; workspaceRoot: string }>
): ChromiumNetworkDiagnosticsBinding | null {
  if (!options.enabled) return null;
  const directory = mkdtempSync(join(tmpdir(), 'dvt-chromium-network-'));
  return {
    directory,
    beforeBrowserLaunch(browser: Cypress.Browser, launch: Cypress.BeforeBrowserLaunchOptions) {
      return attachChromiumCapture(directory, browser, launch);
    },
    afterRun() {
      const captures = readdirSync(directory, { withFileTypes: true });
      let failed = captures.length === 0;
      for (const capture of captures) {
        if (!capture.isDirectory() || !/^chrome-[A-Za-z0-9]+$/u.test(capture.name))
          throw new Error('Unexpected Chromium capture entry');
        const browserDirectory = join(directory, capture.name);
        const file = join(browserDirectory, 'netlog.json');
        try {
          const report = projectChromiumNetworkCapture(readFileSync(file, 'utf8'));
          const evidence = resolve(options.workspaceRoot, '.dvt/evidence/chromium-network');
          mkdirSync(evidence, { recursive: true });
          writeFileSync(
            join(evidence, `${basename(directory)}-${capture.name}.json`),
            JSON.stringify(report)
          );
        } catch {
          failed = true;
        } finally {
          if (existsSync(file)) unlinkSync(file);
          rmdirSync(browserDirectory);
        }
      }
      rmdirSync(directory);
      if (failed) throw new Error('Chromium network diagnostics failed');
    },
  };
}

function attachChromiumCapture(
  directory: string,
  browser: Cypress.Browser,
  launch: Cypress.BeforeBrowserLaunchOptions
): Cypress.BeforeBrowserLaunchOptions {
  if (browser.family !== 'chromium') return launch;
  const capture = mkdtempSync(join(directory, 'chrome-'));
  launch.args.push(
    `--log-net-log=${join(capture, 'netlog.json')}`,
    '--net-log-capture-mode=Default'
  );
  return launch;
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
    on('before:browser:launch', (browser, launch) =>
      attachChromiumCapture(directory, browser, launch)
    );
  }
  return config;
}
