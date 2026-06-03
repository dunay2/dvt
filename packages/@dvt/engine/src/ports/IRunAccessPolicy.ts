/**
 * @file packages/@dvt/engine/src/ports/IRunAccessPolicy.ts
 * @baseline ADR-0003: Execution Model Sovereignty
 * @baseline ADR-0031: Storage Adapter Tenant Isolation Strategy
 * @ownedConcern Public run access policy role interface for engine consumers.
 * @decision Keep run access policy as a public role interface instead of exporting security implementation details.
 * @consequence Consumers can type authorization boundaries through the public ports surface.
 * @version 1.0.0
 * @date 2026-05-14
 */
export type { IRunAccessPolicy } from '../security/RunAccessPolicy.js';
