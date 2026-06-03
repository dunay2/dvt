/** Owned concern: normalize protected Canvas draft query auth transport failures. */
import { ApiError } from '../../services/api/createApiClient';

export type CanvasDraftAuthTransportPosture = 'none' | 'unauthorized_final';

export function deriveCanvasDraftAuthTransportPosture(args: {
  draftReadError: unknown;
}): CanvasDraftAuthTransportPosture {
  return args.draftReadError instanceof ApiError && args.draftReadError.category === 'unauthorized'
    ? 'unauthorized_final'
    : 'none';
}
