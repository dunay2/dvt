import type { AuthorizedExecutionContext, IAuthenticator } from '../../application/ports/auth.js';
import { AuthorizeCommandScopeService } from '../../application/services/authorizeCommandScopeService.js';
import type { AuthorizationAction, RequestedScope } from '../../domain/auth/types.js';

import { authorizeExecutionScope } from './authorizeExecutionScope.js';
import type { HttpResponseModel } from './httpErrorContract.js';
import { httpErrorTranslation } from './httpErrorTranslation.js';

const ADMIN_ACTION_PREFIX = 'admin:';

type AdminAction = Extract<AuthorizationAction, { readonly kind: 'command' }> & {
  readonly name: `${typeof ADMIN_ACTION_PREFIX}${string}`;
};

export async function authorizeAdminExecutionScope<TAction extends AdminAction>(deps: {
  readonly authenticator: IAuthenticator;
  readonly authorizer: AuthorizeCommandScopeService;
  readonly token: string | undefined;
  readonly requestId: string;
  readonly requestedScope: RequestedScope & { readonly action: TAction };
}): Promise<
  | { readonly ok: true; readonly context: AuthorizedExecutionContext<TAction> }
  | { readonly ok: false; readonly response: HttpResponseModel }
> {
  const authorization = await authorizeExecutionScope(deps);
  if (!authorization.ok) {
    return authorization;
  }

  if (!authorization.context.action.name.startsWith(ADMIN_ACTION_PREFIX)) {
    return {
      ok: false,
      response: httpErrorTranslation.auth.unauthorized('ACTION_NOT_GRANTED'),
    };
  }

  return authorization;
}
