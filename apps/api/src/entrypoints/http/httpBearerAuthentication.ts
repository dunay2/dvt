import type { FastifyReply, FastifyRequest } from 'fastify';

import type { IAuthenticator } from '../../application/ports/auth.js';

import { extractBearerToken } from './authHeaders.js';

export async function authenticateHttpBearerRequest(
  request: FastifyRequest,
  reply: FastifyReply,
  authenticator: IAuthenticator
) {
  const authResult = await authenticator.authenticateBearerToken(
    extractBearerToken(request.headers.authorization)
  );
  if (!authResult.ok) {
    reply.code(401).send({
      error: {
        type: 'unauthorized',
        reason: 'authentication_failed',
      },
    });
    return null;
  }

  return authResult.principal;
}
