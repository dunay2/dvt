// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WORKSPACE_SCOPE_SELECTION_REJECTION_REASON } from '../../ports/workspaceScopeSelection';
import { useSessionStore } from '../../stores/sessionStore';
import {
  createWorkspaceScopeSelectionPort,
  readGrantedWorkspaceScope,
  resolveSelectedWorkspaceScope,
  WorkspaceScopeSelectionError,
} from './workspaceScopeSelectionPort';

describe('workspace scope selection command', () => {
  const originalSessionState = useSessionStore.getState();
  const selectedScope = {
    tenantId: 'tenant-a',
    projectId: 'project-a',
    environmentId: 'prod',
  };
  const alternateScope = {
    tenantId: 'tenant-a',
    projectId: 'project-b',
    environmentId: 'stage',
  };

  beforeEach(() => {
    useSessionStore.setState({
      tenantId: selectedScope.tenantId,
      projectId: selectedScope.projectId,
      environmentId: selectedScope.environmentId,
      targetAdapter: 'temporal',
      availableTargetAdapters: ['temporal'],
      availableWorkspaces: [selectedScope, alternateScope],
      workspaceScopeSelectionStatus: 'selected',
      workspaceScopeSelectionRejectionReason: undefined,
      rejectedWorkspaceScope: undefined,
    });
  });

  afterEach(() => {
    useSessionStore.setState({
      tenantId: originalSessionState.tenantId,
      projectId: originalSessionState.projectId,
      environmentId: originalSessionState.environmentId,
      targetAdapter: originalSessionState.targetAdapter,
      availableTargetAdapters: originalSessionState.availableTargetAdapters,
      availableWorkspaces: originalSessionState.availableWorkspaces,
      workspaceScopeSelectionStatus: originalSessionState.workspaceScopeSelectionStatus,
      workspaceScopeSelectionRejectionReason:
        originalSessionState.workspaceScopeSelectionRejectionReason,
      rejectedWorkspaceScope: originalSessionState.rejectedWorkspaceScope,
    });
  });

  it('selects a server-granted workspace scope', () => {
    const port = createWorkspaceScopeSelectionPort();

    expect(port.selectWorkspaceScope(alternateScope)).toEqual({
      status: 'selected',
      selectedScope: alternateScope,
    });
    expect(useSessionStore.getState()).toMatchObject(alternateScope);
    expect(readGrantedWorkspaceScope()).toMatchObject({
      ...alternateScope,
      targetAdapter: 'temporal',
    });
  });

  it('returns a stable selection snapshot until the workspace or deployment selection changes', () => {
    const port = createWorkspaceScopeSelectionPort();

    const firstSelection = port.getSelection();

    expect(port.getSelection()).toBe(firstSelection);

    useSessionStore.setState({
      availableWorkspaces: [selectedScope, alternateScope],
    });

    expect(port.getSelection()).toBe(firstSelection);

    expect(port.selectWorkspaceScope(alternateScope)).toEqual({
      status: 'selected',
      selectedScope: alternateScope,
    });

    const changedSelection = port.getSelection();

    expect(changedSelection).not.toBe(firstSelection);
    expect(changedSelection).toMatchObject({
      selectedScope: alternateScope,
      targetAdapter: 'temporal',
      status: 'selected',
    });
    expect(port.getSelection()).toBe(changedSelection);

    useSessionStore.setState({
      targetAdapter: 'temporal',
      availableTargetAdapters: [],
    });

    const deploymentChangedSelection = port.getSelection();

    expect(deploymentChangedSelection).not.toBe(changedSelection);
    expect(deploymentChangedSelection.availableTargetAdapters).toEqual([]);
  });

  it('notifies every subscriber when the workspace selection changes', () => {
    const port = createWorkspaceScopeSelectionPort();
    const firstSubscriberChanges: string[] = [];
    const secondSubscriberChanges: string[] = [];

    const unsubscribeFirst = port.subscribeSelection(() => {
      firstSubscriberChanges.push(port.getSelection().selectedScope.projectId);
    });
    const unsubscribeSecond = port.subscribeSelection(() => {
      secondSubscriberChanges.push(port.getSelection().selectedScope.projectId);
    });

    try {
      expect(port.selectWorkspaceScope(alternateScope)).toEqual({
        status: 'selected',
        selectedScope: alternateScope,
      });

      expect(firstSubscriberChanges).toEqual(['project-b']);
      expect(secondSubscriberChanges).toEqual(['project-b']);
    } finally {
      unsubscribeFirst();
      unsubscribeSecond();
    }
  });

  it('rejects an unavailable workspace without mutating the selected scope', () => {
    const port = createWorkspaceScopeSelectionPort();
    const unavailableScope = {
      tenantId: 'tenant-a',
      projectId: 'project-c',
      environmentId: 'prod',
    };

    expect(port.selectWorkspaceScope(unavailableScope)).toEqual({
      status: 'rejected',
      reason: WORKSPACE_SCOPE_SELECTION_REJECTION_REASON.unavailable,
      requestedScope: unavailableScope,
      selectedScope,
    });
    expect(useSessionStore.getState()).toMatchObject(selectedScope);
    expect(port.getSelection()).toMatchObject({
      status: 'rejected',
      rejectionReason: WORKSPACE_SCOPE_SELECTION_REJECTION_REASON.unavailable,
      rejectedScope: unavailableScope,
    });
  });

  it('fails closed when protected operations read scope before server context resolves', () => {
    useSessionStore.setState({
      availableWorkspaces: [],
      workspaceScopeSelectionStatus: 'unresolved',
    });

    expect(() => readGrantedWorkspaceScope()).toThrow(WorkspaceScopeSelectionError);
    expect(() => readGrantedWorkspaceScope()).toThrow(
      WORKSPACE_SCOPE_SELECTION_REJECTION_REASON.unresolved
    );
  });

  it('fails closed when the selected deployment adapter is not server-granted', () => {
    useSessionStore.setState({
      availableTargetAdapters: [],
    });

    expect(() => readGrantedWorkspaceScope()).toThrow(WorkspaceScopeSelectionError);
    expect(() => readGrantedWorkspaceScope()).toThrow(
      WORKSPACE_SCOPE_SELECTION_REJECTION_REASON.unavailable
    );
  });

  it('falls back to the effective workspace when a preselected scope is not granted', () => {
    expect(
      resolveSelectedWorkspaceScope({
        currentScope: {
          tenantId: 'tenant-x',
          projectId: 'project-x',
          environmentId: 'dev',
        },
        defaultWorkspace: selectedScope,
        availableWorkspaces: [selectedScope, alternateScope],
      })
    ).toEqual({
      selectedScope,
      availableWorkspaces: [selectedScope, alternateScope],
    });
  });
});
