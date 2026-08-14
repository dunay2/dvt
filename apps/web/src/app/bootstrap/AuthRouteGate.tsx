/** Owned concern: gate protected product routes behind authenticated session profile resolution. */
import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router';

import { completeBootstrapScreen, setBootstrapStepStatus } from './appBootstrapScreen';
import { createApiClient, type ApiError } from '../services/api/createApiClient';
import type {
  CreateProjectResponse,
  EffectiveProjectWorkspaceContext,
} from '../services/projectOnboarding/projectOnboardingService';
import { activateProjectWorkspace } from '../services/projectOnboarding/activateProjectWorkspace';
import { resolveProtectedRouteSessionContext } from '../services/session/protectedRouteSessionContext';
import ProjectOnboardingView from '../views/ProjectOnboardingView';

type AuthGateState =
  { kind: 'checking' } | { kind: 'allowed' } | { kind: 'denied'; reason: AuthGateDeniedReason };

type AuthGateDeniedReason =
  'unauthenticated' | 'workspace_context_not_granted' | 'runtime_unavailable' | 'transport_error';

const sessionApiClient = createApiClient();

function hasWorkspaceContextNotGrantedBody(apiError: Pick<ApiError, 'responseBody'>): boolean {
  const body = apiError.responseBody;
  if (typeof body !== 'object' || body === null) {
    return false;
  }

  const errorBody = (body as { readonly error?: { readonly reason?: unknown } }).error;
  return errorBody?.reason === 'workspace_context_not_granted';
}

export function classifyProtectedRouteSessionError(error: unknown): AuthGateDeniedReason {
  const apiError = error as Partial<ApiError>;
  if (apiError?.statusCode === 404 && apiError.endpoint === '/session') {
    return 'runtime_unavailable';
  }

  if (
    apiError?.statusCode === 403 &&
    apiError.endpoint === '/workspace/context' &&
    hasWorkspaceContextNotGrantedBody(apiError as ApiError)
  ) {
    return 'workspace_context_not_granted';
  }

  if (apiError?.statusCode === 401 || apiError?.statusCode === 403) {
    return 'unauthenticated';
  }

  return 'transport_error';
}

export default function AuthRouteGate({
  children,
}: Readonly<{ children: React.ReactNode }>): JSX.Element {
  const location = useLocation();
  const [state, setState] = useState<AuthGateState>({ kind: 'checking' });

  async function handleProjectCreated(response: CreateProjectResponse): Promise<void> {
    await activateProjectWorkspace(response.defaultWorkspace, { apiClient: sessionApiClient });
    setState({ kind: 'allowed' });
  }

  async function handleProjectSelected(selection: EffectiveProjectWorkspaceContext): Promise<void> {
    await activateProjectWorkspace(selection, { apiClient: sessionApiClient });
    setState({ kind: 'allowed' });
  }

  useEffect(() => {
    let cancelled = false;
    setState({ kind: 'checking' });
    resolveProtectedRouteSessionContext(sessionApiClient)
      .then(() => {
        if (!cancelled) {
          setState({ kind: 'allowed' });
        }
      })
      .catch((error: unknown) => {
        if (cancelled) {
          return;
        }

        setState({ kind: 'denied', reason: classifyProtectedRouteSessionError(error) });
      });

    return () => {
      cancelled = true;
    };
  }, [location.pathname, location.search, location.hash]);

  useEffect(() => {
    if (state.kind !== 'denied' || state.reason !== 'workspace_context_not_granted') {
      return;
    }

    setBootstrapStepStatus({
      step: 'capabilities',
      status: 'degraded',
      detail: 'Runtime capabilities resume after project context is ready.',
    });
    setBootstrapStepStatus({
      step: 'health',
      status: 'degraded',
      detail: 'Platform health checks resume after project context is ready.',
    });
    setBootstrapStepStatus({
      step: 'route',
      status: 'complete',
      detail: 'Project onboarding is ready.',
    });
    completeBootstrapScreen();
  }, [state]);

  if (state.kind === 'checking') {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950 text-slate-200">
        Checking session...
      </div>
    );
  }

  if (state.kind === 'denied') {
    if (state.reason === 'workspace_context_not_granted') {
      return (
        <ProjectOnboardingView
          onProjectCreated={handleProjectCreated}
          onProjectSelected={handleProjectSelected}
        />
      );
    }

    const returnTo = `${location.pathname}${location.search}${location.hash}`;
    return (
      <Navigate
        to={`/login?returnTo=${encodeURIComponent(returnTo)}`}
        replace
        state={{ reason: state.reason }}
      />
    );
  }

  return <>{children}</>;
}
