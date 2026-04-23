import type {
  AuthenticatedPrincipal,
  AuthorizationAction,
  DeniedReason,
  ExecutionScope,
  RequestedScope,
} from '../../domain/auth/types.js';

export type AccessDecision<TAction extends AuthorizationAction = AuthorizationAction> =
  | {
      readonly ok: true;
      readonly approvedScope: ExecutionScope;
    }
  | {
      readonly ok: false;
      readonly reason: DeniedReason;
    };

export interface IAccessDecisionService {
  decide<TAction extends AuthorizationAction>(
    principal: AuthenticatedPrincipal,
    requestedScope: RequestedScope & { readonly action: TAction }
  ): Promise<AccessDecision<TAction>>;
}
