/**
 * Bounded public export for the VTX2 Substrait semantic profile.
 *
 * Keep this surface separate from the generic planner barrel: it exposes only
 * the exact Substrait profile coordinates, semantic Plan envelope, DVT stable
 * authoring bindings, and the product-governance capability catalog selected
 * by ADR-0064.
 *
 * @baseline ADR-0064: Substrait semantic reference and bounded logical profile
 * @decision Export the pinned Substrait profile, stable authoring bindings, and single semantic capability catalog through one bounded public contract surface.
 * @version 1.1.0
 */
export * from './contracts/planner/DvtSubstraitProfile.v1.js';
export * from './contracts/planner/DvtSubstraitPlanBinary.v1.js';
export * from './contracts/planner/DvtSubstraitSemanticDocument.v1.js';
export * from './contracts/planner/DvtSubstraitCapabilityCatalog.v1.js';
export * from './contracts/planner/DvtSubstraitCapabilityAdmission.v1.js';
