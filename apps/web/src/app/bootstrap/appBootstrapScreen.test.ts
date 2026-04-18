// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  completeBootstrapScreen,
  setBootstrapStepStatus,
  showBootstrapFailure,
  startBootstrapScreen,
} from './appBootstrapScreen';

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
      '4/5 startup steps settled. Waiting on a required prerequisite.'
    );

    setBootstrapStepStatus('route', 'complete');
    completeBootstrapScreen();
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
