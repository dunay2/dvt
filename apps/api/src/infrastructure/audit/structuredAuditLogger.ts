import type { Logger } from 'pino';

import type { AuthAuditEvent, IAuthAuditPort } from '../../application/ports/auth.js';

export class StructuredAuditLogger implements IAuthAuditPort {
  public constructor(private readonly logger: Logger) {}

  public async record(event: AuthAuditEvent): Promise<void> {
    const entry = {
      audit: true,
      eventType: event.eventType,
      requestId: event.requestId,
      principalId: event.principalId,
      principalType: event.principalType,
      tenantId: event.tenantId,
      action: event.action,
      denialReason: event.denialReason,
      occurredAt: event.occurredAt.toISOString(),
    };

    if (event.eventType === 'AUTH_GRANTED') {
      this.logger.info(entry, 'auth.granted');
    } else {
      this.logger.warn(entry, 'auth.denied');
    }
  }
}
