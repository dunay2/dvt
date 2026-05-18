/**
 * Owned concern: guard Runs domain boundary semantics, port isolation, CQRS
 * rail separation, owned-concern encapsulation, and documentation traceability.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const TEST_DIR = import.meta.dirname;
const APP_ROOT = path.resolve(TEST_DIR, '../..');

function readAppSource(relativePath: string): string {
  return readFileSync(path.join(APP_ROOT, relativePath), 'utf8');
}

function readRepoFile(...segments: string[]): string {
  return readFileSync(path.resolve(TEST_DIR, '../../../../../..', ...segments), 'utf8');
}

function hasOwnedConcernDocblock(source: string): boolean {
  return /\/\*\*\s*\*?\s*Owned concern:/.test(source.trimStart());
}

describe('Runs domain boundary', () => {
  it('documents public API, invariants, transitions, and consumers', () => {
    const componentGuide = readRepoFile('docs/architecture/components/web/runs/component-runs.md');
    const userStories = readRepoFile('docs/architecture/components/web/runs/user-stories-runs.md');

    for (const section of [
      '## Public API',
      '## Invariants',
      '## State Transitions',
      '## Consumers',
      '## Architecture Diagram',
      '```mermaid',
      'IRunsPort',
      'RunSummaryItem',
      'RunSnapshot',
      'RunEventTimelinePage',
      'Run Event Timeline Component',
    ]) {
      expect(componentGuide).toContain(section);
    }

    const eventTimelineGuide = readRepoFile(
      'docs/architecture/components/web/runs/run-event-timeline-component.md'
    );
    const eventTimelineStories = readRepoFile(
      'docs/architecture/components/web/runs/run-event-timeline-user-stories.md'
    );

    for (const section of [
      '## Public API',
      '## Invariants',
      '## Transitions',
      '## Consumer Diagram',
      '## Consumers',
      'RUN_EVENT_LIVE_POLL_INTERVAL_MS',
      'isRunEventStreamLiveStatus',
      'normalizeRunEventTimelinePage',
      'mergeRunEventTimelinePage',
      'RunEventTimelineTable',
      '```mermaid',
    ]) {
      expect(eventTimelineGuide).toContain(section);
    }

    const denseTableGuide = readRepoFile(
      'docs/architecture/components/web/runs/dense-operational-tables-component.md'
    );
    const denseTableStories = readRepoFile(
      'docs/architecture/components/web/runs/dense-operational-tables-user-stories.md'
    );

    for (const section of [
      '## Public API',
      '## Invariants',
      '## State Transitions',
      '## Consumer Diagram',
      '## Consumers',
      'buildRunOperationalRows',
      'filterRunOperationalRows',
      'sortRunOperationalRows',
      'buildRunEventTableRows',
      'RunOperationalTable',
      'RunEventTimelineTable',
      'TanStack Table',
      '```mermaid',
    ]) {
      expect(denseTableGuide).toContain(section);
    }

    for (const storyId of [
      'US-F16-01',
      'US-F16-02',
      'US-F16-03',
      'US-F16-04',
      'US-F16-05',
      'US-F16-06',
      'US-F16-07',
    ]) {
      expect(denseTableStories).toContain(storyId);
    }

    for (const legacyPhrase of [
      'RunTimelineEventCard',
      'timeline cards',
      'event cards',
      'structured cards',
      'card shows',
      'card-owned',
    ]) {
      expect(eventTimelineGuide).not.toContain(legacyPhrase);
      expect(eventTimelineStories).not.toContain(legacyPhrase);
      expect(denseTableGuide).not.toContain(legacyPhrase);
      expect(denseTableStories).not.toContain(legacyPhrase);
      expect(userStories).not.toContain(legacyPhrase);
    }

    for (const storyId of [
      'US-F10-01',
      'US-F10-02',
      'US-F10-03',
      'US-F10-04',
      'US-F10-05',
      'US-F10-06',
      'US-F10-07',
      'US-F10-08',
      'US-F10-09',
      'US-F10-10',
    ]) {
      expect(eventTimelineStories).toContain(storyId);
    }

    for (const storyId of [
      'US-01',
      'US-02',
      'US-03',
      'US-04',
      'US-05',
      'US-06',
      'US-07',
      'US-08',
      'US-09',
      'US-10',
      'US-11',
      'US-12',
      'US-13',
      'US-14',
    ]) {
      expect(userStories).toContain(storyId);
    }
  });

  it('annotates runs boundary modules with an owned-concern docblock', () => {
    expect(hasOwnedConcernDocblock(readAppSource('ports/runs.ts'))).toBe(true);

    for (const modulePath of [
      'services/api/classifyHttpError.ts',
      'services/runs/runsService.ts',
      'services/runs/runsService.api.ts',
      'services/runs/runsApiPayloads.ts',
      'services/runs/runsApiDecoders.ts',
      'services/runs/runsApiSnapshotMapper.ts',
      'services/runs/runWorkspaceFacade.ts',
      'services/runs/runEventPresentationModel.ts',
      'services/runs/runEventPresentationCopy.ts',
      'services/runs/runEventTimelineModel.ts',
    ]) {
      const source = readAppSource(modulePath);
      expect(
        hasOwnedConcernDocblock(source),
        `${modulePath} must start with an Owned concern docblock`
      ).toBe(true);
    }

    for (const modulePath of [
      'views/runs/runWorkbenchStateModel.ts',
      'views/runs/runStatesModel.ts',
      'views/runs/runStatesCopy.ts',
      'views/runs/runsRouteBootstrap.ts',
      'views/runs/useRunWorkspace.ts',
      'views/runs/CanvasRunsTabView.tsx',
      'views/runs/RunListStateView.tsx',
      'views/runs/RunOperationalTable.tsx',
      'views/runs/RunEventTimelineTable.tsx',
      'views/runs/runOperationalTableModel.ts',
      'views/runs/runEventTableModel.ts',
      'views/runs/RunDetailStateViews.tsx',
      'views/runs/RunStates.tsx',
      'views/runs/RunWorkspaceStateView.tsx',
    ]) {
      const source = readAppSource(modulePath);
      expect(
        hasOwnedConcernDocblock(source),
        `${modulePath} must start with an Owned concern docblock`
      ).toBe(true);
    }
  });

  it('keeps adapter implementation details out of view modules', () => {
    const viewSources = [
      readAppSource('views/runs/useRunWorkspace.ts'),
      readAppSource('views/runs/RunWorkspaceStateView.tsx'),
      readAppSource('views/runs/RunListStateView.tsx'),
      readAppSource('views/runs/RunDetailStateViews.tsx'),
      readAppSource('views/runs/CanvasRunsTabView.tsx'),
    ].join('\n');

    expect(viewSources).not.toContain("from './runsService.api'");
    expect(viewSources).not.toContain("from '../runs/runsService.api'");
    expect(viewSources).not.toContain('interface IRunsPort');
    expect(viewSources).not.toContain('type StartRunInput');
    expect(viewSources).not.toContain('type RunStartReceipt');
  });

  it('separates command and query rails at the port boundary', () => {
    const portSource = readAppSource('ports/runs.ts');

    expect(portSource).toContain('startRun: (input: StartRunInput) => Promise<RunStartReceipt>;');
    expect(portSource).toContain('getRunSnapshot: (runId: string) => Promise<RunSnapshot | null>;');
    expect(portSource).toContain('listRunSummaries: () => Promise<RunSummaryItem[]>;');
    expect(portSource).toContain(
      'listRunEvents: (runId: string, afterSeq?: number) => Promise<RunEventTimelinePage>;'
    );

    const apiServiceSource = readAppSource('services/runs/runsService.api.ts');
    expect(apiServiceSource).toContain('apiClient.postJson<');
    expect(apiServiceSource).toContain("'/runs/start'");
    expect(apiServiceSource).toContain('apiClient.getJson<');
    expect(apiServiceSource).toContain('`/runs?');
    expect(apiServiceSource).toContain('`/runs/${runId}?');
    expect(apiServiceSource).toContain('`/runs/${runId}/events?');
  });

  it('guards platform-owned start-run identity with executable service coverage', () => {
    const apiServiceSource = readAppSource('services/runs/runsService.api.ts');
    expect(apiServiceSource).toContain('candidate.runId');
    expect(apiServiceSource).not.toContain('clientRunId');
    expect(apiServiceSource).not.toContain('client_run_id');

    const serviceTestSource = readAppSource('services/runs/runsService.test.ts');
    expect(serviceTestSource).toContain('does not send client-authored run identity for startRun');
    expect(serviceTestSource).toContain("expect(payload).not.toHaveProperty('runId')");
    expect(serviceTestSource).toContain("expect(payload).not.toHaveProperty('context')");

    expect(serviceTestSource).toContain('createMockRunsService');
  });

  it('models workbench state as a discriminated union with explicit variants', () => {
    const stateModelSource = readAppSource('views/runs/runWorkbenchStateModel.ts');
    const routeBootstrapSource = readAppSource('views/runs/runsRouteBootstrap.ts');

    expect(stateModelSource).toContain('type RunsWorkbenchState');

    for (const variant of [
      'runs-error',
      'runs-empty',
      'runs-list',
      'run-loading',
      'run-error',
      'run-missing',
      'run-workspace',
    ]) {
      expect(stateModelSource).toContain(`'${variant}'`);
    }

    expect(stateModelSource).toContain('kind:');
    expect(routeBootstrapSource).toContain('switch (workbenchState.kind)');
  });

  it('maps missing snapshots to null at the adapter boundary instead of throwing', () => {
    const apiServiceSource = readAppSource('services/runs/runsService.api.ts');

    expect(apiServiceSource).toContain('statusCode === 404');
    expect(apiServiceSource).toContain('return null');
  });

  it('classifies snapshot load errors without leaking HTTP internals to views', () => {
    const facadeSource = readAppSource('services/runs/runWorkspaceFacade.ts');
    const useWorkspaceSource = readAppSource('views/runs/useRunWorkspace.ts');

    expect(facadeSource).toContain('classifySnapshotError');
    expect(facadeSource).toContain('RunWorkspaceLoadErrorKind');
    expect(facadeSource).toContain('classifyHttpError');
    expect(useWorkspaceSource).toContain('classifyHttpError');
  });

  it('converges console and Runs timeline consumers on one semantic event timeline model', () => {
    const timelineModelSource = readAppSource('services/runs/runEventTimelineModel.ts');
    const facadeSource = readAppSource('services/runs/runWorkspaceFacade.ts');
    const consoleHookSource = readAppSource('components/console/useConsoleLogStream.ts');
    const workspaceSource = readAppSource('views/runs/RunWorkspaceStateView.tsx');
    const timelineTableSource = readAppSource('views/runs/RunEventTimelineTable.tsx');
    const timelineTableModelSource = readAppSource('views/runs/runEventTableModel.ts');

    expect(timelineModelSource).toContain('normalizeRunEventTimelinePage');
    expect(timelineModelSource).toContain('mergeRunEventTimelinePage');
    expect(timelineModelSource).toContain('isRunEventStreamLiveStatus');
    expect(timelineModelSource).toContain('RUN_EVENT_LIVE_POLL_INTERVAL_MS');

    expect(facadeSource).toContain('normalizeRunEventTimelinePage');
    expect(consoleHookSource).toContain('mergeRunEventTimelinePage');
    expect(consoleHookSource).toContain('isRunEventStreamLiveStatus');
    expect(consoleHookSource).toContain('RUN_EVENT_LIVE_POLL_INTERVAL_MS');

    expect(workspaceSource).toContain('RunEventTimelineTable');
    expect(workspaceSource).not.toContain('RunTimelineEventCard');
    expect(timelineTableSource).toContain('useReactTable');
    expect(timelineTableSource).toContain('buildRunEventTableRows');
    expect(timelineTableSource).toContain('getRowId: (row) => row.eventId');
    expect(timelineTableModelSource).toContain('buildRunEventPresentationModel');
    expect(timelineTableModelSource).toContain('resolveRunEventHeadline');
    expect(timelineTableModelSource).not.toContain('listRunEvents');
    expect(timelineTableModelSource).not.toContain('getRunSnapshot');
  });

  it('guards dense operational table semantics instead of only table component presence', () => {
    const packageJson = readRepoFile('apps/web/package.json');
    const listViewSource = readAppSource('views/runs/RunListStateView.tsx');
    const runTableSource = readAppSource('views/runs/RunOperationalTable.tsx');
    const runTableModelSource = readAppSource('views/runs/runOperationalTableModel.ts');

    expect(packageJson).toContain('@tanstack/react-table');
    expect(listViewSource).toContain('parseRunOperationalTableSearchParams');
    expect(listViewSource).toContain('serializeRunOperationalTableSearchParams');
    expect(listViewSource).toContain('RunOperationalTable');
    expect(listViewSource).not.toContain('Card');
    expect(runTableSource).toContain('useReactTable');
    expect(runTableSource).toContain('data-slot="run-operational-table"');
    expect(runTableSource).toContain('getRowId: (row) => row.runId');
    expect(runTableModelSource).toContain('filterRunOperationalRows');
    expect(runTableModelSource).toContain('sortRunOperationalRows');
    expect(runTableModelSource).toContain('isKnownRunField');
  });
});
