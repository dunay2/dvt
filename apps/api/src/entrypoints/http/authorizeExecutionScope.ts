/**
 * Owned concern: adapt protected HTTP authentication plus requested-scope
 * authorization into one route-facing allow/deny helper.
 */
import type {
  AuthorizationAction,
  RequestedScope,
} from '../../application/ports/accessDecision.js';
import type { AuthorizedExecutionContext, IAuthenticator } from '../../application/ports/auth.js';
import { AuthorizeCommandScopeService } from '../../application/services/authorizeCommandScopeService.js';

import type { HttpResponseModel } from './httpErrorContract.js';
import { httpErrorTranslation } from './httpErrorTranslation.js';

export async function authorizeExecutionScope<TAction extends AuthorizationAction>(deps: {
  readonly authenticator: IAuthenticator;
  readonly authorizer: AuthorizeCommandScopeService;
  readonly token: string | undefined;
  readonly requestId: string;
  readonly requestedScope: RequestedScope<TAction>;
}): Promise<
  | { readonly ok: true; readonly context: AuthorizedExecutionContext<TAction> }
  | { readonly ok: false; readonly response: HttpResponseModel }
> {
  const authentication = await deps.authenticator.authenticateBearerToken(deps.token);
  if (!authentication.ok) {
    return {
      ok: false,
      response: httpErrorTranslation.auth.unauthenticated(authentication.code),
    };
  }

  const authorization = await deps.authorizer.authorize(
    authentication.principal,
    deps.requestedScope,
    deps.requestId
  );
  if (!authorization.ok) {
    return {
      ok: false,
      response: httpErrorTranslation.auth.unauthorized(authorization.reason),
    };
  }

  return { ok: true, context: authorization.context };
}
