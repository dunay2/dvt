# Runbook: Plugin Quarantine & Recovery

Owner: TBD (Platform Security)
Severity: P1

Goal: Quarantine a plugin version that causes runtime failures, route runs to fallback, and restore safe operation.

Preconditions:

- Plugin registry access (artifact storage + metadata)
- Planner access to update selection policies
- Monitoring for plugin error rate (ex: `plugin_errors_total{pluginId,pluginVersion}`)

Steps:

1. Detect and assess
   - Alert: `plugin_errors_total` spike or `PluginQuarantined` events
   - Confirm failure pattern: reproducible crash, OOM, or security violation

2. Quarantine action (fast)
   - Mark plugin version `vX` as quarantined in StateStore plugin registry: `{ pluginId, pluginVersion: vX, status: "quarantined", reason: "..." }`
   - Update planner policy to exclude `vX` and select `fallback_version`
   - Emit `PluginQuarantined` event for audit

3. Route running traffic
   - Planner should prefer `fallback_version` for new runs
   - For in-flight runs using `vX`, evaluate risk; if critical, cancel and restart with fallback

4. Investigate and fix
   - Reproduce locally using sandbox parameters matching production limits
   - If fixable, produce `vX+1` with tests; otherwise deprecate

5. Recovery
   - After validated fix, unquarantine by updating registry and planner rules
   - Monitor metrics closely for regression

Notes:

- Plugin artifacts must be signed; registry SHOULD validate digest before allowing activation.
