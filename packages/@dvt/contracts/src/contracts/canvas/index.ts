/**
 * Owned concern: expose Canvas-specific contracts through one package boundary.
 * @baseline ADR-0064: Substrait Semantic Reference And Bounded Logical Profile
 * @decision Re-export only governed Canvas contracts from this narrow barrel.
 * @consequence Consumers receive one Canvas contract vocabulary without unrelated package leakage.
 * @version 1.0.0
 */
export * from './TransformDataSample.v1.js';
