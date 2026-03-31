import type { AuthorizedExecutionContext, IAuthenticator } from '../../application/ports/auth.js';
import { AuthorizeCommandScopeService } from '../../application/services/authorizeCommandScopeService.js';
import type { AuthorizationAction, RequestedScope } from '../../domain/auth/types.js';

import {
  mapAuthenticationFailure,
  mapAuthorizationFailure,
} from './httpErrorMapper.js';
import type { HttpResponseModel } from './httpErrorContract.js';

export async function authorizeExecutionScope<TAction extends AuthorizationAction>(deps: {
  readonly authenticator: IAuthenticator;
  readonly authorizer: AuthorizeCommandScopeService;
  readonly token: string | undefined;
  readonly requestId: string;
  readonly requestedScope: RequestedScope & { readonly action: TAction };
}): Promise<
  | { readonly ok: true; readonly context: AuthorizedExecutionContext<TAction> }
  | { readonly ok: false; readonly response: HttpResponseModel }
> {
  const authentication = await deps.authenticator.authenticateBearerToken(deps.token);
  if (!authentication.ok) {
    return { ok: false, response: mapAuthenticationFailure(authentication.code) };
  }

  const authorization = await deps.authorizer.authorize(
    authentication.principal,
    deps.requestedScope,
    deps.requestId
  );
  if (!authorization.ok) {
    return { ok: false, response: mapAuthorizationFailure(authorization.reason) };
  }

  return { ok: true, context: authorization.context };
}
