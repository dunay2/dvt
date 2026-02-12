# Changelog

All notable changes to this project will be documented in this file.


## Unreleased

### ♻️ Refactoring & repo layout
- Migración completa del engine a `packages/engine` con módulos desacoplados: `WorkflowEngine`, `SnapshotProjector`, `idempotency`, `state store`, `outbox`, y helpers deterministas (`clock`, `jcs`, `sha256`).
- Infraestructura de monorepo consolidada: workspaces pnpm, tsconfig base, tooling y scripts por paquete.
- Legacy folders (`engine/`, `adapters/`) now contain only redirects or are deprecated.

### 🔧 Tooling & configuration
- ESLint y Vitest configurados para monorepo, con soporte para tests deterministas y clock sin Date.
- Nuevos scripts y lockfile para dependencias de adaptadores y engine.
- Soporte para Prisma y tooling de base de datos en `adapter-postgres` (infra inicial).

### ✅ Tests & correctness
- Nuevos tests unitarios y de contrato para engine: determinismo de hash, idempotencia, validación de PlanRef, integridad de plan, edge cases de clock, tipos de contrato.
- Todos los tests de `@dvt/engine` pasan localmente tras la migración y refactorización.
- Clock determinista (`SequenceClock`) y helpers de fecha validados (sin uso de Date).

### ⚠️ Behavior & API changes
- `WorkflowEngine`: proyección y eventos ahora 100% deterministas, con hash canónico y orden de eventos estable (RunQueued → RunStarted → provider events → RunCompleted).
- Contratos y tipos normalizados/exportados para uso cross-package.
- Outbox worker y state store desacoplados y probados.

### 📝 Documentation & housekeeping
- Documentation and runbooks moved to `runbooks/`.
- Actualización de referencias y diagramas en docs.

### 🧩 Related issues (implemented / referenced)
- Cerradas: #2 (tipos), #6 (state store infra), #7 (determinism lint), #10 (golden paths infra), #14 (core engine y projector), #16 (outbox worker), #17 (CI pipeline infra).
- En progreso: #5 (TemporalAdapter), #15 (Temporal Interpreter), #8 (Glossary), #9 (RunEventCatalog), #3 (Mermaid diagrams), #19 (Security docs).

### 🔜 In progress / follow-ups
- Integración real de adaptadores (Temporal, Conductor): #5, #68, #69.
- Fixtures y determinism matrix: #70, #73.
- Documentación y diagramas: #3, #19.
- Lint/style cleanup (import/order, explicit return types): follow-up PR recomendado.

---

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

### [2.4.9](https://github.com/dunay2/dvt/compare/v2.4.8...v2.4.9) (2026-02-12)


### 🐛 Bug Fixes

* **docs:** Extract normative security invariants from THREAT_MODEL [#63](https://github.com/dunay2/dvt/issues/63) ([#64](https://github.com/dunay2/dvt/issues/64)) ([dae7055](https://github.com/dunay2/dvt/commit/dae7055b9435225a592e130f10837528d46cbf9a)), closes [#13](https://github.com/dunay2/dvt/issues/13)

### [2.4.8](https://github.com/dunay2/dvt/compare/v2.4.7...v2.4.8) (2026-02-12)


### 📝 Documentation

* **engine:** Add Security section to INDEX.md ([#62](https://github.com/dunay2/dvt/issues/62)) ([6a04ff1](https://github.com/dunay2/dvt/commit/6a04ff17c7a56c4421b3ea5c63b32f0292c42835)), closes [#13](https://github.com/dunay2/dvt/issues/13)

### [2.4.7](https://github.com/dunay2/dvt/compare/v2.4.6...v2.4.7) (2026-02-12)


### 📝 Documentation

* update quality summary ([#41](https://github.com/dunay2/dvt/issues/41)) ([58b0497](https://github.com/dunay2/dvt/commit/58b0497b0186fa66d27ae02a46e57b668c3c12da))

### [2.4.6](https://github.com/dunay2/dvt/compare/v2.4.5...v2.4.6) (2026-02-12)

### [2.4.5](https://github.com/dunay2/dvt/compare/v2.4.4...v2.4.5) (2026-02-12)

### [2.4.4](https://github.com/dunay2/dvt/compare/v2.4.3...v2.4.4) (2026-02-12)

### [2.4.3](https://github.com/dunay2/dvt/compare/v2.4.2...v2.4.3) (2026-02-12)

### [2.4.2](https://github.com/dunay2/dvt/compare/v2.4.1...v2.4.2) (2026-02-12)

### [2.4.1](https://github.com/dunay2/dvt/compare/v2.4.0...v2.4.1) (2026-02-12)

## [2.4.0](https://github.com/dunay2/dvt/compare/v2.3.0...v2.4.0) (2026-02-12)


### ✨ Features

* Phase 2 - Projector and Engine adapter contracts ([#56](https://github.com/dunay2/dvt/issues/56)) ([81bfec8](https://github.com/dunay2/dvt/commit/81bfec85d59eb1b20be88fecd805dcbb75c44ebd))


### 📝 Documentation

* clarify determinism test README ([#43](https://github.com/dunay2/dvt/issues/43)) ([957f9f0](https://github.com/dunay2/dvt/commit/957f9f0a232646fbacd35128908453ffa34a004e))
* refresh root README ([#42](https://github.com/dunay2/dvt/issues/42)) ([3397514](https://github.com/dunay2/dvt/commit/3397514155393df3fd365454ccab72f2dbb907f2))

## [2.3.0](https://github.com/dunay2/dvt/compare/v2.2.0...v2.3.0) (2026-02-11)

### ✨ Features

* TypeScript project structure with adapter-agnostic contracts ([#55](https://github.com/dunay2/dvt/issues/55)) ([566f707](https://github.com/dunay2/dvt/commit/566f70746e52f2f485fa5a82966a007843da2eab)), closes [#2](https://github.com/dunay2/dvt/issues/2) [#2](https://github.com/dunay2/dvt/issues/2)

## [2.2.0](https://github.com/dunay2/dvt/compare/v2.1.2...v2.2.0) (2026-02-11)

### ✨ Features - TypeScript

* implement TypeScript types for engine contracts ([090be4e](https://github.com/dunay2/dvt/commit/090be4e9cd97f50b76827f09db71ba58c3534ae0))

### 📝 Documentation - Types

* improve JSDoc clarity in type definitions ([4029760](https://github.com/dunay2/dvt/commit/402976025a7d803c856353821df5ba0062ab6c05))

### 🐛 Bug Fixes - Formatting

* align spacing in .golden/README.md with main branch ([0e68a10](https://github.com/dunay2/dvt/commit/0e68a1047f298ad1f0014b17e2370f58c3202f6f))
* apply Prettier formatting to all files ([97b0e5d](https://github.com/dunay2/dvt/commit/97b0e5d56d51ed963005981bec51aacfb6cb9821))
* resolve merge conflict in .golden/README.md ([db41a99](https://github.com/dunay2/dvt/commit/db41a990bc173c8ed57be095300fb81ee1619bc4))
* update pnpm version to 9 in all workflow files ([04de73b](https://github.com/dunay2/dvt/commit/04de73bf3ac4b4571c14ae9916080b58845709eb))
* use relative paths in JSDoc references ([e5c2996](https://github.com/dunay2/dvt/commit/e5c29960d05716ce5261782122d8e3ecc00d3118))

### [2.1.2](https://github.com/dunay2/dvt/compare/v2.1.1...v2.1.2) (2026-02-11)

### 📝 Documentation - Golden Paths

* fix markdown lint errors in golden paths ([3a551f0](https://github.com/dunay2/dvt/commit/3a551f01ace7632dbc8a96c7826accbe695e9bf1))
* implement golden paths examples with executable plans ([e6a8a91](https://github.com/dunay2/dvt/commit/e6a8a9137e04d74df88391cf0f803d7ee824af2f))

### 🐛 Bug Fixes - ESLint

* add .eslintignore to exclude test files from type-aware linting ([33b3c23](https://github.com/dunay2/dvt/commit/33b3c232a6f9e1564eeccd445a191cfe5782c01c))

### 🏗️ Build System

* add pnpm-lock.yaml for CI reproducible builds ([8c99ba8](https://github.com/dunay2/dvt/commit/8c99ba8e219bedf0b87b36d98a313e4fb0879f27))

### [2.1.1](https://github.com/dunay2/dvt/compare/v2.1.0...v2.1.1) (2026-02-11)

## [2.1.0](https://github.com/dunay2/dvt/compare/v2.0.1...v2.1.0) (2026-02-11)

### ✨ Features - Outbox Worker

* implement outbox delivery worker with comprehensive tests ([45a7f78](https://github.com/dunay2/dvt/commit/45a7f78b5592c0aae5269648e80aa63c79d21975))

### 📝 Documentation - Outbox Worker

* add comprehensive implementation notes for outbox worker ([1f991be](https://github.com/dunay2/dvt/commit/1f991be88d74b6db2f157df739aaeb4ebfde5706))
* add comprehensive README and index exports for outbox worker ([d9434fc](https://github.com/dunay2/dvt/commit/d9434fc26f19452f1f5ddaf2ede39fcc83f62b68))

### 🐛 Bug Fixes - Outbox

* address code review feedback ([9c81f2b](https://github.com/dunay2/dvt/commit/9c81f2b08f27569175c444c059bcf082d34a62fa))
* **outbox:** accurate metrics + ordering ([412dbc3](https://github.com/dunay2/dvt/commit/412dbc39647eb2002438325e67a465f50c450350))

### [2.0.1](https://github.com/dunay2/dvt/compare/v2.0.0...v2.0.1) (2026-02-11)

## 2.0.0 (2026-02-11)

### ⚠ BREAKING CHANGES

* **ci:** None (new tooling only, no semantic changes)

### 🐛 Bug Fixes - Markdown

* aplicar auto-fix de markdownlint para corregir formato ([e01bc8a](https://github.com/dunay2/dvt/commit/e01bc8a7954208d9b1461afa473f59ad787a64b9))
* corregir enlaces rotos en adapters y arreglar validación de contratos normativos (grep -F para búsqueda literal) ([6a63ca8](https://github.com/dunay2/dvt/commit/6a63ca8dd6cf0b4b2d27c859b43ab8499354038f))
* corregir enlaces rotos en IWorkflowEngine.v1.md (capabilities/ y extensions/ paths) ([b51b4b0](https://github.com/dunay2/dvt/commit/b51b4b0f29716c207fd6f9868254dca4526a5736))
* corregir enlaces rotos en VERSIONING.md y deshabilitar temporalmente validación TypeScript (demasiado estricta para pseudocódigo) ([0910e02](https://github.com/dunay2/dvt/commit/0910e0284b870440d24f5ca7e00f7fdbd9071216))
* corregir errores markdownlint en MIGRATION_GUIDE y CONTRIBUTING ([f03d1c1](https://github.com/dunay2/dvt/commit/f03d1c1e91abef3300d46f7f450e9d15b88fd349))
* fix lines longer than 120 characters in critical files (MD013) ([9a1e258](https://github.com/dunay2/dvt/commit/9a1e25847a83ca9bd8f054a106053993c04f72a7))
* corregir MD051 y MD013 en MIGRATION_GUIDE y CONTRIBUTING ([a4e9ad4](https://github.com/dunay2/dvt/commit/a4e9ad442d03b24b4349144898ee6e1aaca7326e))
* deshabilitar reglas adicionales de markdownlint (MD003, MD009, MD012, MD034, MD036, MD051) ([07715fc](https://github.com/dunay2/dvt/commit/07715fc10d43c583057e9e395b386be67a8c7904))
* deshabilitar reglas estrictas de markdownlint (MD022, MD026, MD031, MD032, MD040, MD047, MD060) ([515848b](https://github.com/dunay2/dvt/commit/515848b6d12a6144d726585c19bc95f4d7fde7b9))
* remove npm cache from workflow and comment out link to Conductor EnginePolicies (not present yet) ([b86e220](https://github.com/dunay2/dvt/commit/b86e220bfafd50c4130d3db53242c6205abaa48d))
* simplificar reglas de markdownlint para enfoque en errores críticos ([09713be](https://github.com/dunay2/dvt/commit/09713be57a569396b71242eca96603b4e380019b))

### ♻️ Code Refactoring

* make ROADMAP.md adapter-agnostic (move Postgres details to adapter docs) ([33e2395](https://github.com/dunay2/dvt/commit/33e2395d5d999cbf2452a90bdcae17cea624318b))

### ✨ Features - Contract Testing

* add contract testing scripts and infrastructure ([6fe7ff1](https://github.com/dunay2/dvt/commit/6fe7ff1b5a41e47199ae8a74a2b3cbd9f073d097))
* add package.json and configure npm for the project ([c9ac38a](https://github.com/dunay2/dvt/commit/c9ac38a4ed2a9ba7e520bab814063a7b17ded317))
* **ci:** add comprehensive quality tooling and documentation improvements ([044a180](https://github.com/dunay2/dvt/commit/044a180f86068e5010c11bafc74b38c76cd50c92)), closes [#1](https://github.com/dunay2/dvt/issues/1) [#2](https://github.com/dunay2/dvt/issues/2) [#3](https://github.com/dunay2/dvt/issues/3)
* complete Phase 1 implementation roadmap with epics and automation ([e4813e8](https://github.com/dunay2/dvt/commit/e4813e83d11c6e5dcd97127bb29d049c19c33451)), closes [#14](https://github.com/dunay2/dvt/issues/14) [-#18](https://github.com/dunay2/dvt/issues/18) [#14](https://github.com/dunay2/dvt/issues/14) [#15](https://github.com/dunay2/dvt/issues/15) [#16](https://github.com/dunay2/dvt/issues/16) [#17](https://github.com/dunay2/dvt/issues/17) [#18](https://github.com/dunay2/dvt/issues/18) [#8](https://github.com/dunay2/dvt/issues/8) [#9](https://github.com/dunay2/dvt/issues/9) [#2](https://github.com/dunay2/dvt/issues/2) [#14](https://github.com/dunay2/dvt/issues/14) [#15](https://github.com/dunay2/dvt/issues/15) [#5](https://github.com/dunay2/dvt/issues/5) [#6](https://github.com/dunay2/dvt/issues/6) [#16](https://github.com/dunay2/dvt/issues/16) [#10](https://github.com/dunay2/dvt/issues/10) [#17](https://github.com/dunay2/dvt/issues/17) [#14](https://github.com/dunay2/dvt/issues/14) [#15](https://github.com/dunay2/dvt/issues/15) [#18](https://github.com/dunay2/dvt/issues/18)
* **security:** add issue template for THREAT_MODEL.md v1.4 update ([471e674](https://github.com/dunay2/dvt/commit/471e674b253cba24934160cc56badd326e441573))

### 📝 Documentation - Contracts

* add documentation for contract testing infrastructure ([916d2f6](https://github.com/dunay2/dvt/commit/916d2f6fedceb986fb9de27eb08c1e23df8974ec))
* add implementation summary for contract testing pipeline ([b7cab14](https://github.com/dunay2/dvt/commit/b7cab146b24275812973d38e20420784f426e289))
* add Mermaid diagrams to ExecutionSemantics.v1.md ([81574ed](https://github.com/dunay2/dvt/commit/81574edabd5acc54d5ab791e782b6c61fd721f7e))
* add security architecture documentation (Phase 1) ([f3c4a8e](https://github.com/dunay2/dvt/commit/f3c4a8e1991d13a684fffa71eb0d0b81ae860a3c)), closes [#19](https://github.com/dunay2/dvt/issues/19)
* improve diagram headings to use proper markdown levels ([79fa448](https://github.com/dunay2/dvt/commit/79fa448cfee98d67a9f3baaf962ed65a1d55ae8c))
* replace HTML br tags with Mermaid line breaks ([c5f9fcc](https://github.com/dunay2/dvt/commit/c5f9fcc8a60db955508e9e8566c3830389a64ee4))
* replace HTML br tags with Mermaid line breaks ([2f17c37](https://github.com/dunay2/dvt/commit/2f17c37d26e564f1ade2049bd7c5338fb3ed6e0a))
* update ROADMAP.md with security docs issue [#19](https://github.com/dunay2/dvt/issues/19) ([17c88f0](https://github.com/dunay2/dvt/commit/17c88f0588f523a2c7a018b1010811aefbcbd990))

## [1.0.0] - 2026-02-11

### ✨ Features - v1.0.0

* **engine**: Initial workflow engine architecture documentation
* **contracts**: Core execution semantics and IWorkflowEngine contract
* **adapters**: Temporal and State Store adapter specifications
* **docs**: Comprehensive architecture documentation

### 📝 Documentation - v1.0.0

* Added ExecutionSemantics.v1.md with normative event specifications
* Added IWorkflowEngine.v1.md with interface contracts
* Added TemporalAdapter.spec.md with platform-specific policies
* Added Appendix A with detailed RunStarted event schema
* Documented PAUSE limitations in Conductor adapter
* Added strict SHA256 validation requirements for fetchPlan

### 🏗️ Build System - v1.0.0

* Initial project setup with npm
* Added markdownlint configuration

### 👷 CI/CD - v1.0.0

* Added GitHub Actions workflows for markdown linting
* Added determinism pattern checks
* Added contract validation
* Added CODEOWNERS for automated review routing
