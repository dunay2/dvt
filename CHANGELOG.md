# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.1.0](https://github.com/dunay2/dvt/compare/v2.0.1...v2.1.0) (2026-02-11)


### ✨ Features

* implement outbox delivery worker with comprehensive tests ([45a7f78](https://github.com/dunay2/dvt/commit/45a7f78b5592c0aae5269648e80aa63c79d21975))


### 📝 Documentation

* add comprehensive implementation notes for outbox worker ([1f991be](https://github.com/dunay2/dvt/commit/1f991be88d74b6db2f157df739aaeb4ebfde5706))
* add comprehensive README and index exports for outbox worker ([d9434fc](https://github.com/dunay2/dvt/commit/d9434fc26f19452f1f5ddaf2ede39fcc83f62b68))


### 🐛 Bug Fixes

* address code review feedback ([9c81f2b](https://github.com/dunay2/dvt/commit/9c81f2b08f27569175c444c059bcf082d34a62fa))
* **outbox:** accurate metrics + ordering ([412dbc3](https://github.com/dunay2/dvt/commit/412dbc39647eb2002438325e67a465f50c450350))

### [2.0.1](https://github.com/dunay2/dvt/compare/v2.0.0...v2.0.1) (2026-02-11)

## 2.0.0 (2026-02-11)


### ⚠ BREAKING CHANGES

* **ci:** None (new tooling only, no semantic changes)

### 🐛 Bug Fixes

* agregar scripts placeholder para workflow engine y simplificar config markdownlint ([f9fec6b](https://github.com/dunay2/dvt/commit/f9fec6ba888d67ae22377bcd5ab63b4e686f0079))
* aplicar auto-fix de markdownlint para corregir formato ([e01bc8a](https://github.com/dunay2/dvt/commit/e01bc8a7954208d9b1461afa473f59ad787a64b9))
* corregir enlaces rotos en adapters y arreglar validación de contratos normativos (grep -F para búsqueda literal) ([6a63ca8](https://github.com/dunay2/dvt/commit/6a63ca8dd6cf0b4b2d27c859b43ab8499354038f))
* corregir enlaces rotos en IWorkflowEngine.v1.md (capabilities/ y extensions/ paths) ([b51b4b0](https://github.com/dunay2/dvt/commit/b51b4b0f29716c207fd6f9868254dca4526a5736))
* corregir enlaces rotos en VERSIONING.md y deshabilitar temporalmente validación TypeScript (demasiado estricta para pseudocódigo) ([0910e02](https://github.com/dunay2/dvt/commit/0910e0284b870440d24f5ca7e00f7fdbd9071216))
* corregir errores markdownlint en MIGRATION_GUIDE y CONTRIBUTING ([f03d1c1](https://github.com/dunay2/dvt/commit/f03d1c1e91abef3300d46f7f450e9d15b88fd349))
* corregir líneas >120 caracteres en archivos críticos (MD013) ([9a1e258](https://github.com/dunay2/dvt/commit/9a1e25847a83ca9bd8f054a106053993c04f72a7))
* corregir MD051 y MD013 en MIGRATION_GUIDE y CONTRIBUTING ([a4e9ad4](https://github.com/dunay2/dvt/commit/a4e9ad442d03b24b4349144898ee6e1aaca7326e))
* deshabilitar reglas adicionales de markdownlint (MD003, MD009, MD012, MD034, MD036, MD051) ([07715fc](https://github.com/dunay2/dvt/commit/07715fc10d43c583057e9e395b386be67a8c7904))
* deshabilitar reglas estrictas de markdownlint (MD022, MD026, MD031, MD032, MD040, MD047, MD060) ([515848b](https://github.com/dunay2/dvt/commit/515848b6d12a6144d726585c19bc95f4d7fde7b9))
* remover cache npm del workflow y comentar enlace a Conductor EnginePolicies (no existe aún) ([b86e220](https://github.com/dunay2/dvt/commit/b86e220bfafd50c4130d3db53242c6205abaa48d))
* simplificar reglas de markdownlint para enfoque en errores críticos ([09713be](https://github.com/dunay2/dvt/commit/09713be57a569396b71242eca96603b4e380019b))


### ♻️ Code Refactoring

* make ROADMAP.md adapter-agnostic (move Postgres details to adapter docs) ([33e2395](https://github.com/dunay2/dvt/commit/33e2395d5d999cbf2452a90bdcae17cea624318b))


### ✨ Features

* add contract testing scripts and infrastructure ([6fe7ff1](https://github.com/dunay2/dvt/commit/6fe7ff1b5a41e47199ae8a74a2b3cbd9f073d097))
* agregar package.json y configurar npm para el proyecto ([c9ac38a](https://github.com/dunay2/dvt/commit/c9ac38a4ed2a9ba7e520bab814063a7b17ded317))
* **ci:** add comprehensive quality tooling and documentation improvements ([044a180](https://github.com/dunay2/dvt/commit/044a180f86068e5010c11bafc74b38c76cd50c92)), closes [#1](https://github.com/dunay2/dvt/issues/1) [#2](https://github.com/dunay2/dvt/issues/2) [#3](https://github.com/dunay2/dvt/issues/3)
* complete Phase 1 implementation roadmap with epics and automation ([e4813e8](https://github.com/dunay2/dvt/commit/e4813e83d11c6e5dcd97127bb29d049c19c33451)), closes [#14](https://github.com/dunay2/dvt/issues/14) [-#18](https://github.com/dunay2/dvt/issues/18) [#14](https://github.com/dunay2/dvt/issues/14) [#15](https://github.com/dunay2/dvt/issues/15) [#16](https://github.com/dunay2/dvt/issues/16) [#17](https://github.com/dunay2/dvt/issues/17) [#18](https://github.com/dunay2/dvt/issues/18) [#8](https://github.com/dunay2/dvt/issues/8) [#9](https://github.com/dunay2/dvt/issues/9) [#2](https://github.com/dunay2/dvt/issues/2) [#14](https://github.com/dunay2/dvt/issues/14) [#15](https://github.com/dunay2/dvt/issues/15) [#5](https://github.com/dunay2/dvt/issues/5) [#6](https://github.com/dunay2/dvt/issues/6) [#16](https://github.com/dunay2/dvt/issues/16) [#10](https://github.com/dunay2/dvt/issues/10) [#17](https://github.com/dunay2/dvt/issues/17) [#14](https://github.com/dunay2/dvt/issues/14) [#15](https://github.com/dunay2/dvt/issues/15) [#18](https://github.com/dunay2/dvt/issues/18)
* **security:** add issue template for THREAT_MODEL.md v1.4 update ([471e674](https://github.com/dunay2/dvt/commit/471e674b253cba24934160cc56badd326e441573))


### 📝 Documentation

* add documentation for contract testing infrastructure ([916d2f6](https://github.com/dunay2/dvt/commit/916d2f6fedceb986fb9de27eb08c1e23df8974ec))
* add implementation summary for contract testing pipeline ([b7cab14](https://github.com/dunay2/dvt/commit/b7cab146b24275812973d38e20420784f426e289))
* add Mermaid diagrams to ExecutionSemantics.v1.md ([81574ed](https://github.com/dunay2/dvt/commit/81574edabd5acc54d5ab791e782b6c61fd721f7e))
* add security architecture documentation (Phase 1) ([f3c4a8e](https://github.com/dunay2/dvt/commit/f3c4a8e1991d13a684fffa71eb0d0b81ae860a3c)), closes [#19](https://github.com/dunay2/dvt/issues/19)
* improve diagram headings to use proper markdown levels ([79fa448](https://github.com/dunay2/dvt/commit/79fa448cfee98d67a9f3baaf962ed65a1d55ae8c))
* replace HTML br tags with Mermaid line breaks ([c5f9fcc](https://github.com/dunay2/dvt/commit/c5f9fcc8a60db955508e9e8566c3830389a64ee4))
* replace HTML br tags with Mermaid line breaks ([2f17c37](https://github.com/dunay2/dvt/commit/2f17c37d26e564f1ade2049bd7c5338fb3ed6e0a))
* update ROADMAP.md with security docs issue [#19](https://github.com/dunay2/dvt/issues/19) ([17c88f0](https://github.com/dunay2/dvt/commit/17c88f0588f523a2c7a018b1010811aefbcbd990))

## [1.0.0] - 2026-02-11

### ✨ Features

- **engine**: Initial workflow engine architecture documentation
- **contracts**: Core execution semantics and IWorkflowEngine contract
- **adapters**: Temporal and State Store adapter specifications
- **docs**: Comprehensive architecture documentation

### 📝 Documentation

- Added ExecutionSemantics.v1.md with normative event specifications
- Added IWorkflowEngine.v1.md with interface contracts
- Added TemporalAdapter.spec.md with platform-specific policies
- Added Appendix A with detailed RunStarted event schema
- Documented PAUSE limitations in Conductor adapter
- Added strict SHA256 validation requirements for fetchPlan

### 🏗️ Build System

- Initial project setup with npm
- Added markdownlint configuration

### 👷 CI/CD

- Added GitHub Actions workflows for markdown linting
- Added determinism pattern checks
- Added contract validation
- Added CODEOWNERS for automated review routing
