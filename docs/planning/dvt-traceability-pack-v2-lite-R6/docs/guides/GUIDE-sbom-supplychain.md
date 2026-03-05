---
title: Guide — SBOM & Supply Chain (SPDX, CycloneDX, SLSA)
status: Guide
tags: [sbom, supply-chain, spdx, cyclonedx, slsa]
---

# SBOM & Supply Chain (SPDX, CycloneDX, SLSA)

Use this guide when:

- you have compliance/security requirements
- you distribute artifacts or run in regulated environments

## 1) SBOM standards

- SPDX: https://spdx.dev/
- CycloneDX: https://cyclonedx.org/

## 2) Build provenance (SLSA)

SLSA provides a maturity model for supply chain security:

- https://slsa.dev/

## 3) Practical steps

- Generate SBOM in CI for releases
- Keep dependency lockfiles committed
- Scan dependencies (OSV / npm audit)

OSV:

- https://google.github.io/osv-scanner/
