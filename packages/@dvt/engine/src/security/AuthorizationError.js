'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.AuthorizationError = void 0;
/**
 * @file packages/@dvt/engine/src/security/AuthorizationError.ts
 * @baseline ADR-0003: Execution Model Sovereignty
 * @decision Decision — Tenant access rejections are represented with a typed error and stable code
 * @consequence The engine security layer communicates authorization failures consistently
 * @version 1.0.0
 * @date 2026-02-21
 */
class AuthorizationError extends Error {
  constructor(message = 'Authorization denied') {
    super(message);
    this.code = 'AUTHZ_DENIED';
    this.name = 'AuthorizationError';
    Object.setPrototypeOf(this, AuthorizationError.prototype);
  }
}
exports.AuthorizationError = AuthorizationError;
//# sourceMappingURL=AuthorizationError.js.map
