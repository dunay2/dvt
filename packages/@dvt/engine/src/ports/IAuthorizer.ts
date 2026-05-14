/**
 * @file packages/@dvt/engine/src/ports/IAuthorizer.ts
 * @baseline ADR-0003: Execution Model Sovereignty
 * @baseline ADR-0031: Storage Adapter Tenant Isolation Strategy
 * @ownedConcern Public authorization role interface for engine consumers.
 * @decision Keep the authorization role interface in the engine public ports surface.
 * @consequence Consumers can depend on the role contract without importing the security implementation module.
 * @version 1.0.0
 * @date 2026-05-14
 */
export type { IAuthorizer } from '../security/authorizer.js';
