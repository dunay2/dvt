import type { FastifyReply, FastifyRequest } from 'fastify';

import type { PreviewPlanUseCase } from '../../application/services/PreviewPlanUseCase.js';

import { sendHttpResponse } from './httpErrorContract.js';
import {
  resolvePreviewPlanRouteRequest,
  type PreviewPlanRouteRequestResolverDeps,
} from './previewPlanRouteRequestResolver.js';
import {
  mapPreviewPlanInternalError,
  mapPreviewPlanUseCaseResult,
} from './previewPlanRouteResponseMapper.js';

type PreviewPlanRouteDeps = PreviewPlanRouteRequestResolverDeps & {
  readonly useCase: Pick<PreviewPlanUseCase, 'execute'>;
};

export async function previewPlanRoute(
  request: FastifyRequest<{ Body: unknown }>,
  reply: FastifyReply,
  deps: PreviewPlanRouteDeps
): Promise<void> {
  const resolvedRequest = await resolvePreviewPlanRouteRequest(request, deps);
  if (!resolvedRequest.ok) {
    sendHttpResponse(reply, resolvedRequest.response);
    return;
  }

  try {
    const result = await deps.useCase.execute(
      resolvedRequest.parsedRequest.command,
      resolvedRequest.context
    );
    const mappedResult = mapPreviewPlanUseCaseResult(
      result,
      resolvedRequest.parsedRequest
    );
    if (mappedResult.kind === 'rejected') {
      sendHttpResponse(reply, mappedResult.response);
      return;
    }

    reply.code(200).send(mappedResult.payload);
  } catch (error) {
    request.log.error({ err: error }, 'plan preview failed');
    sendHttpResponse(reply, mapPreviewPlanInternalError());
  }
}
