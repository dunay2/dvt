---
title: Guide — 12-Factor App Checklist (Cloud-native)
status: Guide
tags: [12factor, cloud, deployability]
---

# 12-Factor App Checklist (Cloud-native)

Use this guide when changes affect deployability, config, processes, runtime behavior.

Reference: https://12factor.net/

Key factors to enforce (pragmatic subset):

1. **Config**: externalized via env/config providers (no secrets in repo)
2. **Backing services**: treat DB/broker as attached resources
3. **Build/Release/Run**: immutable builds, environment-specific config
4. **Concurrency**: scale via processes/workers; avoid singleton assumptions
5. **Disposability**: fast startup/shutdown; handle SIGTERM gracefully
6. **Logs**: treat logs as event streams (structured logs preferred)

Verification:

- CI checks for env var usage patterns (light)
- Integration tests for startup/shutdown paths (if relevant)
