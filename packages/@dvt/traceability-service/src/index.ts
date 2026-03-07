/**
 * @file packages/@dvt/traceability-service/src/index.ts
 * @baseline ADR-0000: Code Generation with Enforced Normative Traceability (Automated)
 * @decision Section 4.3 - Export a canonical public API for traceability service components
 * @consequence Downstream tooling consumes stable exports for validation and manifest generation
 * @version 0.1.0
 * @date 2026-02-21
 */
export * from './types.js';
export * from './contracts.js';
export * from './service.js';

export * from './adapters/adr-catalog-filesystem.js';
export * from './adapters/header-scanner-glob.js';

export * from './core/manifest.js';
export * from './core/validator.js';
export * from './lineage/index.js';
