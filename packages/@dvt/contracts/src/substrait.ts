/**
 * Bounded public export for the VTX2 Substrait semantic profile.
 *
 * Keep this surface separate from the generic planner barrel: it exposes only
 * the exact Substrait profile coordinates, semantic Plan envelope, and DVT
 * stable authoring bindings selected by ADR-0064.
 */
export * from './contracts/planner/DvtSubstraitProfile.v1.js';
