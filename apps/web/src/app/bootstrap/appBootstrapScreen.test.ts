// @vitest-environment jsdom

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  completeBootstrapScreen,
  setBootstrapStepStatus,
  showBootstrapFailure,
  startBootstrapScreen,
} from './appBootstrapScreen';
import { renderBootstrapProgress } from './bootstrapProgressBar';

const WEB_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const INDEX_HTML_PATH = resolve(WEB_ROOT, 'index.html');
const BOOTSTRAP_STEP_ORDER = ['hydrate', 'services', 'capabilities', 'health', 'route'];

function extractCssRule(source: string, selector: string): string {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = source.match(new RegExp(`${escapedSelector}\\s*\\{(?<body>[^}]*)\\}`));
  return match?.groups?.body ?? '';
}

function mountBootstrapDom(): void {
  document.body.innerHTML = `
    <div id="app-loading-screen" data-state="loading">
      <h1 id="app-loading-title"></h1>
      <p id="app-loading-message"></p>
      <ul id="app-loading-steps">
        <li data-bootstrap-step="hydrate" data-status="pending"><span data-bootstrap-detail></span></li>
        <li data-bootstrap-step="services" data-status="pending"><span data-bootstrap-detail></span></li>
        <li data-bootstrap-step="capabilities" data-status="pending"><span data-bootstrap-detail></span></li>
        <li data-bootstrap-step="health" data-status="pending"><span data-bootstrap-detail></span></li>
        <li data-bootstrap-step="route" data-status="pending"><span data-bootstrap-detail></span></li>
      </ul>
      <div id="app-loading-progress"></div>
      <footer id="app-loading-meta">
        <span id="app-loading-version"></span>
        <span id="app-loading-build-date">Build --</span>
      </footer>
    </div>
  `;
}

function mountProductionBootstrapDom(): HTMLElement {
  const indexHtml = readFileSync(INDEX_HTML_PATH, 'utf8');
  const parsedDocument = new DOMParser().parseFromString(indexHtml, 'text/html');
  const productionScreen = parsedDocument.getElementById('app-loading-screen');

  if (!productionScreen) {
    throw new Error('Production bootstrap shell is missing #app-loading-screen');
  }

  document.body.innerHTML = productionScreen.outerHTML;

  const mountedScreen = document.getElementById('app-loading-screen');
  if (!mountedScreen) {
    throw new Error('Production bootstrap shell could not be mounted in the test DOM');
  }

  return mountedScreen;
}

function getProgressLabel(): string | undefined {
  return document.querySelector('[data-app-loading-progress-label]')?.textContent ?? undefined;
}

function getProgressSegmentStatuses(): string[] {
  return Array.from(document.querySelectorAll('[data-app-loading-progress-segment]')).map(
    (segment) => segment.getAttribute('data-status') ?? ''
  );
}

describe('appBootstrapScreen', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mountBootstrapDom();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
    document.body.innerHTML = '';
  });

  it('keeps the production HTML shell aligned with the bootstrap DOM contract before React executes', () => {
    const screen = mountProductionBootstrapDom();

    expect(screen.dataset.state).toBe('loading');
    expect(screen.getAttribute('role')).toBe('status');
    expect(screen.getAttribute('aria-label')).toBe('Raven startup status');
    expect(screen.getAttribute('aria-live')).toBe('polite');
    expect(screen.getAttribute('aria-atomic')).toBe('true');
    expect(screen.getAttribute('aria-busy')).toBe('true');
    expect(screen.getAttribute('aria-describedby')).toBe(
      'app-loading-message app-loading-progress'
    );

    expect(document.getElementById('app-loading-title')?.textContent?.trim()).toBe(
      'Preparing Raven'
    );
    expect(document.getElementById('app-loading-message')?.textContent).toContain(
      'Loading startup modules in order.'
    );
    expect(document.getElementById('app-loading-progress')).not.toBeNull();
    expect(document.getElementById('app-loading-version')?.textContent?.trim()).toBe('Version --');
    expect(document.getElementById('app-loading-build-date')?.textContent?.trim()).toBe('Build --');

    const stepNodes = Array.from(document.querySelectorAll<HTMLElement>('[data-bootstrap-step]'));
    expect(stepNodes.map((node) => node.dataset.bootstrapStep)).toEqual(BOOTSTRAP_STEP_ORDER);
    stepNodes.forEach((stepNode) => {
      expect(stepNode.dataset.status).toBe('pending');
      expect(stepNode.querySelector('[data-bootstrap-detail]')).not.toBeNull();
    });

    startBootstrapScreen();

    expect(document.getElementById('app-loading-progress')?.textContent).toContain(
      '0/5 startup checks settled'
    );
    expect(document.querySelectorAll('[data-app-loading-progress-segment]').length).toBe(
      BOOTSTRAP_STEP_ORDER.length
    );
    expect(document.querySelector('[data-app-loading-progress-value]')).toBeNull();
  });

  it('keeps the Raven startup surface visible until every critical step reaches an allowed terminal state', () => {
    startBootstrapScreen();

    setBootstrapStepStatus('hydrate', 'complete');
    setBootstrapStepStatus('services', 'complete');
    setBootstrapStepStatus('capabilities', 'degraded', 'Capabilities settled in fallback mode.');
    setBootstrapStepStatus('health', 'complete');
    setBootstrapStepStatus('route', 'blocked', 'Backend readiness is still blocked.');

    completeBootstrapScreen();
    expect(document.getElementById('app-loading-screen')).not.toBeNull();
    expect(document.getElementById('app-loading-screen')?.getAttribute('data-state')).toBe(
      'blocked'
    );
    expect(document.getElementById('app-loading-title')?.textContent).toBe(
      'Raven is waiting for startup prerequisites'
    );
    expect(document.getElementById('app-loading-progress')?.textContent).toContain(
      '4/5 startup checks settled. Required startup blockers remain.'
    );
    expect(document.querySelector('[data-app-loading-progress-value]')).toBeNull();
    expect(
      document.querySelector<HTMLElement>('[data-app-loading-progress-segment="route"]')?.dataset
        .status
    ).toBe('blocked');
    expect(getProgressSegmentStatuses()).toEqual([
      'complete',
      'complete',
      'degraded',
      'complete',
      'blocked',
    ]);

    setBootstrapStepStatus('route', 'complete');
    completeBootstrapScreen();
    vi.advanceTimersByTime(120);

    expect(document.getElementById('app-loading-screen')).toBeNull();
  });

  it('allows a failed non-critical health check to settle startup without looking pending or degraded', () => {
    startBootstrapScreen();

    setBootstrapStepStatus('hydrate', 'complete');
    setBootstrapStepStatus('services', 'complete');
    setBootstrapStepStatus('capabilities', 'complete');
    setBootstrapStepStatus('health', 'failed', 'Request to /healthz failed (NETWORK)');
    setBootstrapStepStatus('route', 'complete', 'Canvas backend block is routable');

    completeBootstrapScreen();

    expect(
      document.querySelector<HTMLElement>('[data-bootstrap-step="health"]')?.dataset.status
    ).toBe('failed');
    expect(document.getElementById('app-loading-screen')?.dataset.state).toBe('complete');
    expect(document.getElementById('app-loading-progress')?.textContent).toContain(
      '5/5 startup checks settled'
    );
  });

  it('keeps error step colors aligned with the semantic readiness label', () => {
    startBootstrapScreen();

    setBootstrapStepStatus('hydrate', 'complete');
    setBootstrapStepStatus('services', 'complete');
    setBootstrapStepStatus('capabilities', 'complete');
    setBootstrapStepStatus('health', 'error', 'Unable to reach /healthz.');
    setBootstrapStepStatus('route', 'error', 'Request to /workspace/graph failed (NETWORK)');

    expect(document.getElementById('app-loading-screen')?.getAttribute('data-state')).toBe('error');
    expect(document.querySelector('[data-app-loading-progress-value]')).toBeNull();
    expect(getProgressLabel()).toBe('3/5 startup checks settled. Startup error needs attention.');
    expect(getProgressSegmentStatuses()).toEqual([
      'complete',
      'complete',
      'complete',
      'error',
      'error',
    ]);
  });

  it('keeps pending neutral and failed red in the production bootstrap CSS', () => {
    const indexHtml = readFileSync(INDEX_HTML_PATH, 'utf8');
    const pendingRule = extractCssRule(
      indexHtml,
      "#app-loading-steps li[data-status='pending']::before"
    );
    const failedRule = extractCssRule(
      indexHtml,
      "#app-loading-steps li[data-status='failed']::before"
    );
    const failedSegmentRule = extractCssRule(
      indexHtml,
      ".app-loading-progress-segment[data-status='failed']"
    );

    expect(pendingRule).not.toContain('#f59e0b');
    expect(failedRule).toContain('#ef4444');
    expect(failedSegmentRule).toContain('#ef4444');
  });

  it('renders progress segment data as DOM attributes instead of parsing markup', () => {
    renderBootstrapProgress({
      tone: 'loading',
      label: 'Startup checks pending',
      settledCount: 0,
      totalCount: 1,
      segments: [
        {
          id: 'route" data-injected="true',
          label: 'Route <strong>startup</strong>',
          status: 'pending',
        },
      ],
    });

    expect(document.querySelector('[data-injected="true"]')).toBeNull();
    expect(
      document
        .querySelector('[data-app-loading-progress-segment]')
        ?.getAttribute('data-app-loading-progress-segment')
    ).toBe('route" data-injected="true');
    expect(
      document.querySelector('[data-app-loading-progress-segment]')?.getAttribute('aria-label')
    ).toBe('Route <strong>startup</strong>: pending');
  });

  it('publishes the startup gate as an accessible busy status until bootstrap completes', () => {
    startBootstrapScreen();

    const screen = document.getElementById('app-loading-screen');
    expect(screen?.getAttribute('role')).toBe('status');
    expect(screen?.getAttribute('aria-label')).toBe('Raven startup status');
    expect(screen?.getAttribute('aria-live')).toBe('polite');
    expect(screen?.getAttribute('aria-atomic')).toBe('true');
    expect(screen?.getAttribute('aria-busy')).toBe('true');

    setBootstrapStepStatus('hydrate', 'complete');
    setBootstrapStepStatus('services', 'complete');
    setBootstrapStepStatus('capabilities', 'complete');
    setBootstrapStepStatus('health', 'complete');
    setBootstrapStepStatus('route', 'complete');
    completeBootstrapScreen();

    expect(screen?.dataset.state).toBe('complete');
    expect(screen?.getAttribute('aria-busy')).toBe('false');
  });

  it('does not reopen the startup surface after bootstrap has already completed', () => {
    startBootstrapScreen();

    setBootstrapStepStatus('hydrate', 'complete');
    setBootstrapStepStatus('services', 'complete');
    setBootstrapStepStatus('capabilities', 'complete');
    setBootstrapStepStatus('health', 'complete');
    setBootstrapStepStatus('route', 'complete');

    completeBootstrapScreen();
    setBootstrapStepStatus('route', 'complete', 'Initial route is ready');
    vi.advanceTimersByTime(120);

    expect(document.getElementById('app-loading-screen')).toBeNull();
  });

  it('updates the startup surface with a controlled failure instead of dropping to a second screen', () => {
    showBootstrapFailure('Startup blew up.');

    expect(document.getElementById('app-loading-title')?.textContent).toBe(
      'Raven could not finish startup'
    );
    expect(document.getElementById('app-loading-message')?.textContent).toBe('Startup blew up.');
    const routeStep = document.querySelector('[data-bootstrap-step="route"]');
    expect(routeStep?.getAttribute('data-status')).toBe('error');

    completeBootstrapScreen();
    vi.advanceTimersByTime(120);

    expect(document.getElementById('app-loading-screen')).not.toBeNull();
  });

  it('hides the build-date meta item when no explicit build date is injected', () => {
    startBootstrapScreen();

    expect(document.getElementById('app-loading-version')?.textContent).toBe('Version 0.0.0');
    expect(document.getElementById('app-loading-build-date')?.textContent).toBe('');
    expect(document.getElementById('app-loading-build-date')?.hidden).toBe(true);
  });

  it('shows a formatted build date when explicit metadata is injected', () => {
    vi.stubEnv('VITE_APP_BUILD_DATE', '2026-04-18T10:20:00.000Z');

    startBootstrapScreen();

    expect(document.getElementById('app-loading-build-date')?.textContent).toBe(
      'Build 2026-04-18 10:20 UTC'
    );
    expect(document.getElementById('app-loading-build-date')?.hidden).toBe(false);
  });
});
