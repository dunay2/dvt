/**
 * Port for the admission guard — evaluates whether a tenant's run request
 * should be admitted based on backpressure signals.
 *
 * Throws a typed BackpressureError subclass when admission is denied.
 * Any non-backpressure error is propagated unchanged.
 */
export interface IAdmissionGuard {
  assertAdmissible(tenantId: string): Promise<void>;
}
