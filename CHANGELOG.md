# Changelog

## [5.2.0](https://github.com/dunay2/dvt/compare/v5.1.2...v5.2.0) (2026-03-30)


### Features

* **adapters:** Add lineage DLQ alerting and automatic replay controls ([#672](https://github.com/dunay2/dvt/issues/672)) ([451a60f](https://github.com/dunay2/dvt/commit/451a60f6692c07095798b45ceab6af1556644bac))

## [5.1.2](https://github.com/dunay2/dvt/compare/v5.1.1...v5.1.2) (2026-03-30)


### Bug Fixes

* **adapters:** Harden retention archive destination and object-store checks ([#666](https://github.com/dunay2/dvt/issues/666)) ([a331c7d](https://github.com/dunay2/dvt/commit/a331c7d7ff308765065abc56f8b3b1a7ff44056e))
* **state-store:** Harden archive object store adapters and lane planning updates ([#667](https://github.com/dunay2/dvt/issues/667)) ([c4222cc](https://github.com/dunay2/dvt/commit/c4222cc723631a8a0b60d46667b98d26d060b97b))

## [5.1.1](https://github.com/dunay2/dvt/compare/v5.1.0...v5.1.1) (2026-03-29)


### Bug Fixes

* **state-store:** Protect rollback disposal and retry timestamp idempotency ([#662](https://github.com/dunay2/dvt/issues/662)) ([ad9a030](https://github.com/dunay2/dvt/commit/ad9a03051f2ab668d5dd2374454105178452f28f))

## [5.1.0](https://github.com/dunay2/dvt/compare/v5.0.2...v5.1.0) (2026-03-29)


### Features

* **web:** Set raven loading screen and favicon ([#657](https://github.com/dunay2/dvt/issues/657)) ([81bf074](https://github.com/dunay2/dvt/commit/81bf074d47392bd9db15d17169f67de7202fb332))


### Bug Fixes

* **state-store:** Harden retention export idempotency and runtime abort checks ([#659](https://github.com/dunay2/dvt/issues/659)) ([651292e](https://github.com/dunay2/dvt/commit/651292e9edf35887d99fc16666a4d42e65ea2f20))

## [5.0.2](https://github.com/dunay2/dvt/compare/v5.0.1...v5.0.2) (2026-03-28)


### Bug Fixes

* **api:** Align startRun facade result contract and HTTP mapping ([#650](https://github.com/dunay2/dvt/issues/650)) ([5ce6f28](https://github.com/dunay2/dvt/commit/5ce6f2814d3e9ccfc0a71535879008daa0027567))

## [5.0.1](https://github.com/dunay2/dvt/compare/v5.0.0...v5.0.1) (2026-03-28)


### Bug Fixes

* **adapters:** Harden lineage stale-claim recovery and redaction coverage ([#647](https://github.com/dunay2/dvt/issues/647)) ([0323b54](https://github.com/dunay2/dvt/commit/0323b54af9ddc97900c236b71dffb3db486095a6))

## [5.0.0](https://github.com/dunay2/dvt/compare/v4.14.0...v5.0.0) (2026-03-28)


### ⚠ BREAKING CHANGES

* **engine:** Adapters must be wrapped with ValidatingAdapter for runtime validation boundary enforcement
* **contracts:** EngineRunRef.runId now REQUIRED (was optional)

### Features

* **adapter-temporal:** Complete T4-3 compiledCodeRef propagation ([#374](https://github.com/dunay2/dvt/issues/374)) ([7f04e42](https://github.com/dunay2/dvt/commit/7f04e427e3aec4c936adfcbea46c36d50ae433c8))
* **adapters:** Add G3/G4 planning docs and initial Postgres intent store ([#356](https://github.com/dunay2/dvt/issues/356)) ([b03ab10](https://github.com/dunay2/dvt/commit/b03ab10b8ee439f97af1e307e4d2e75f41b6d73a))
* **adapters:** Add lineage runtime and worker ([#476](https://github.com/dunay2/dvt/issues/476)) ([2c895bd](https://github.com/dunay2/dvt/commit/2c895bd171c6e73465fdc73787441cc6da84161d))
* **adapters:** Finalize outbox worker extraction and ownership hardening ([#449](https://github.com/dunay2/dvt/issues/449)) ([88c35aa](https://github.com/dunay2/dvt/commit/88c35aa929f5ce99f4ca294349e862696683d530))
* **adapters:** Implement G4 T4-4 traceability compiled-code lineage module ([#371](https://github.com/dunay2/dvt/issues/371)) ([9a55274](https://github.com/dunay2/dvt/commit/9a552745192c74861dbbbf4b15d03116096107a6))
* **adapters:** Implement PostgreSQL persistence and Issue [#6](https://github.com/dunay2/dvt/issues/6) docs ([#248](https://github.com/dunay2/dvt/issues/248)) ([1f0186b](https://github.com/dunay2/dvt/commit/1f0186b41374e67283160c3be6e40b2fd500b021))
* **adapters:** Pin archived terminal snapshots ([#525](https://github.com/dunay2/dvt/issues/525)) ([ef9efcf](https://github.com/dunay2/dvt/commit/ef9efcf30dd02bb3022ab9111dc5e174f1aaef6c))
* **adapters:** remove simulateError and harden intent identity ([#592](https://github.com/dunay2/dvt/issues/592)) ([ea6973d](https://github.com/dunay2/dvt/commit/ea6973d0a82c87a6e8318d1f8d18fccb604469b4))
* **adapters:** S06 + S01 — Migration version table and dead contract cleanup ([#538](https://github.com/dunay2/dvt/issues/538)) ([7c63073](https://github.com/dunay2/dvt/commit/7c63073e64163a9a1962d218c9c034664c5d9831))
* **adapters:** Temporal adapter implementation (core) ([cc5581b](https://github.com/dunay2/dvt/commit/cc5581bf6ad6da094101beb604e7e112a9455f6b))
* **adapters:** ValidatingAdapter MVP + tests (wrap startRun) ([4422014](https://github.com/dunay2/dvt/commit/4422014210f6a43bd5b147e6625d4b472a1496b6))
* Add G7 projector worker runtime ([#487](https://github.com/dunay2/dvt/issues/487)) ([8c6f31e](https://github.com/dunay2/dvt/commit/8c6f31e276dc08f242faa3193a158f9cd4863df0))
* **api:** Add backpressure resilience envelope ([#532](https://github.com/dunay2/dvt/issues/532)) ([f0b1577](https://github.com/dunay2/dvt/commit/f0b157705450f9cb7593edc86314da6774ed46be))
* **api:** Add explicit cancel route and shared command execution ([#640](https://github.com/dunay2/dvt/issues/640)) ([f782bd4](https://github.com/dunay2/dvt/commit/f782bd4af27591fe35aa3d222c87223f31d7c731))
* **api:** Add planner-backed stored plan start flow ([#533](https://github.com/dunay2/dvt/issues/533)) ([f960284](https://github.com/dunay2/dvt/commit/f9602845365aa0e33012bfecdfcf15b7fb12b825))
* **api:** Add raw SQL admission snapshot source ([#524](https://github.com/dunay2/dvt/issues/524)) ([6190a41](https://github.com/dunay2/dvt/commit/6190a415dacf462e7742832d8945fdedd7fe6a30))
* **api:** Add reconciler health visibility ([#564](https://github.com/dunay2/dvt/issues/564)) ([4a96f94](https://github.com/dunay2/dvt/commit/4a96f94c8e1b4bc50b180e76ce05586cd81afb56))
* **api:** Add runtime query routes and execution guards ([#517](https://github.com/dunay2/dvt/issues/517)) ([699ca7c](https://github.com/dunay2/dvt/commit/699ca7cbdfbb23d89b71373d134a9fa51bcbdb55))
* **api:** Add startRun admission foundation ([#522](https://github.com/dunay2/dvt/issues/522)) ([1c52118](https://github.com/dunay2/dvt/commit/1c52118ae16e42211650023367e6e4c0f00853cd))
* **api:** Admission control operability — decision telemetry and capacity gauges ([#628](https://github.com/dunay2/dvt/issues/628)) ([af10c43](https://github.com/dunay2/dvt/commit/af10c43f50b818cd4913cf2f9397167d69128a86))
* **api:** Harden start-run parser edges ([#570](https://github.com/dunay2/dvt/issues/570)) ([7b917fb](https://github.com/dunay2/dvt/commit/7b917fba4141e029fe516c37d810ed35028f7bd8))
* **ci:** Add modular ARC policy traceability (ADR-0000c) ([#368](https://github.com/dunay2/dvt/issues/368)) ([35b3596](https://github.com/dunay2/dvt/commit/35b35967b66a51b9d049585b633b1c8f5344eeb9))
* Close temporal operational observability gaps ([#400](https://github.com/dunay2/dvt/issues/400)) ([d358fd4](https://github.com/dunay2/dvt/commit/d358fd4ccdc39f1417e8e143f33fa8e0e1002742))
* **contracts:** add CanvasState v1 schema for issue [#220](https://github.com/dunay2/dvt/issues/220) ([#247](https://github.com/dunay2/dvt/issues/247)) ([79ddab1](https://github.com/dunay2/dvt/commit/79ddab1fd40829b54021aa9ef5f2ca4b35fad864))
* **contracts:** Add glossary usage validator (issue [#226](https://github.com/dunay2/dvt/issues/226)) ([#255](https://github.com/dunay2/dvt/issues/255)) ([1133257](https://github.com/dunay2/dvt/commit/1133257b8a3e0f8ee62a719b661a5e9da00c1bb2))
* **contracts:** add ProvenanceEvent v1 schema for issue [#221](https://github.com/dunay2/dvt/issues/221) ([#249](https://github.com/dunay2/dvt/issues/249)) ([6a0a9b1](https://github.com/dunay2/dvt/commit/6a0a9b1797e396d0ee1b4cec0565b1d16e4caec0))
* **contracts:** Add reference validation script (issue [#228](https://github.com/dunay2/dvt/issues/228)) ([#253](https://github.com/dunay2/dvt/issues/253)) ([785a4e4](https://github.com/dunay2/dvt/commit/785a4e433d2415859fd05dfb265183808fedc763))
* **contracts:** Add RFC2119 validator in warning mode (issue [#229](https://github.com/dunay2/dvt/issues/229)) ([#252](https://github.com/dunay2/dvt/issues/252)) ([0691798](https://github.com/dunay2/dvt/commit/069179883f3487a359ffc11e2d0bd13e94d3f17b))
* **contracts:** Add runtime validation at API boundaries using Zod ([#196](https://github.com/dunay2/dvt/issues/196)) ([f08acf6](https://github.com/dunay2/dvt/commit/f08acf639660ecc71c0d8a5075750353e829a97f))
* **contracts:** Artifact store port and typed compiled code refs ([#384](https://github.com/dunay2/dvt/issues/384)) ([2687b47](https://github.com/dunay2/dvt/commit/2687b47cd9a5575edb3d0bb0404b4c07f7f11f3b))
* **contracts:** Complete Issue [#2](https://github.com/dunay2/dvt/issues/2) contract alignment ([#65](https://github.com/dunay2/dvt/issues/65)) ([e6eb2a0](https://github.com/dunay2/dvt/commit/e6eb2a0ea8b528db0d8aa707b2177c537d69a0b6))
* **contracts:** Complete planner Stage 1.1 boundary canonization ([#511](https://github.com/dunay2/dvt/issues/511)) ([e3c8e24](https://github.com/dunay2/dvt/commit/e3c8e243ff9f0c3b1268e7de38c8f41bec89a5aa))
* **contracts:** Govern execution plan versioning ([#518](https://github.com/dunay2/dvt/issues/518)) ([90f445c](https://github.com/dunay2/dvt/commit/90f445c45f52c712e2e9fe8715ff4df4a8424889))
* **contracts:** Promote core exports and authorization error ([a756222](https://github.com/dunay2/dvt/commit/a756222ba185b60ef02aa834ca914a032e809b43))
* **contracts:** reapply PR [#234](https://github.com/dunay2/dvt/issues/234) changes on top of main ([#236](https://github.com/dunay2/dvt/issues/236)) ([8486f36](https://github.com/dunay2/dvt/commit/8486f36f9eade484cf38584ebcebf6ed72bd797b))
* **contracts:** Validate executable TypeScript examples ([#251](https://github.com/dunay2/dvt/issues/251)) ([62f1eb1](https://github.com/dunay2/dvt/commit/62f1eb1ecbc77c0fb96c9f795ec99dc93c0dcc23))
* **ddd-cqrs:** DDD/CQRS package skeletons and docs updates ([#284](https://github.com/dunay2/dvt/issues/284)) ([5229c04](https://github.com/dunay2/dvt/commit/5229c043c4689adfd3070ff383d762eb97caf3a3))
* **docs,adapters:** Consolidate remaining value slices ([#590](https://github.com/dunay2/dvt/issues/590)) ([ea7bbc0](https://github.com/dunay2/dvt/commit/ea7bbc0bf5b9a614c63f85b1ecc26ae7687f1263))
* **docs:** Normalize Decision node properties in English ([#215](https://github.com/dunay2/dvt/issues/215)) ([6d65f82](https://github.com/dunay2/dvt/commit/6d65f8239df82050d207f9fafad642210c48774c))
* **engine:** Activate workflows with v2 run events and transactional bootstrap ([#274](https://github.com/dunay2/dvt/issues/274)) ([c914d55](https://github.com/dunay2/dvt/commit/c914d55c0c83518799c5e8a7de0c97e9376aa97a))
* **engine:** Add ADR-0030 reconciliation follow-ups without regressions ([#346](https://github.com/dunay2/dvt/issues/346)) ([6c85a2e](https://github.com/dunay2/dvt/commit/6c85a2e9ac4b370c16afb31f220005f247756d7f))
* **engine:** Add provider selection and authorization error support ([38a2df2](https://github.com/dunay2/dvt/commit/38a2df255bd454ed03fbc354d1a4a99b725a42ee))
* **engine:** Enforce determinism linting for Temporal workflows ([#195](https://github.com/dunay2/dvt/issues/195)) ([f086ab0](https://github.com/dunay2/dvt/commit/f086ab02d771d5c7e58f68cba3a0869c69f79e80)), closes [#4](https://github.com/dunay2/dvt/issues/4)
* **engine:** Formalize snapshot recovery and startup hardening ([#459](https://github.com/dunay2/dvt/issues/459)) ([4a88b41](https://github.com/dunay2/dvt/commit/4a88b4155e0f789e0084c872330cba55f551b381))
* **engine:** Migrate observability and intent lifecycle to current main baseline ([#333](https://github.com/dunay2/dvt/issues/333)) ([875a806](https://github.com/dunay2/dvt/commit/875a806cd003a5fe5f9522cd71c97f341fa184c9))
* **engine:** Migrate observability and intent lifecycle to current main baseline ([#335](https://github.com/dunay2/dvt/issues/335)) ([40f031c](https://github.com/dunay2/dvt/commit/40f031ce4ad0bfbcb01ef81314b7cb14e4b6d312))
* **engine:** Promote dependsOn to shared execution plan contract ([#241](https://github.com/dunay2/dvt/issues/241)) ([7d259ae](https://github.com/dunay2/dvt/commit/7d259ae0494c2d23ac3d0f3d1fa1db1d0fc745f3))
* **engine:** robust runtime validation adapter with strict error mapping ([5b11d30](https://github.com/dunay2/dvt/commit/5b11d3069fafd8c51720d609bf7dfd450185a316))
* **g5:** Harden standalone outbox worker service ([#421](https://github.com/dunay2/dvt/issues/421)) ([edd4c92](https://github.com/dunay2/dvt/commit/edd4c92e03b6087dbea57f8f55b725169338d7c0))
* implement outbox delivery worker for at-least-once event delivery ([5530358](https://github.com/dunay2/dvt/commit/55303586e5b768164456100fe61a1ba115f0127f))
* implement outbox delivery worker with comprehensive tests ([45a7f78](https://github.com/dunay2/dvt/commit/45a7f78b5592c0aae5269648e80aa63c79d21975))
* implement TypeScript types for engine contracts ([aa93cf3](https://github.com/dunay2/dvt/commit/aa93cf333f6cf060ed318a94d009b15ac8700d5b))
* implement TypeScript types for engine contracts ([090be4e](https://github.com/dunay2/dvt/commit/090be4e9cd97f50b76827f09db71ba58c3534ae0))
* Phase 2 - Projector and Engine adapter contracts ([#56](https://github.com/dunay2/dvt/issues/56)) ([81bfec8](https://github.com/dunay2/dvt/commit/81bfec85d59eb1b20be88fecd805dcbb75c44ebd))
* **planner:** Add compiledCodeRef enrichment pipeline (G4 T4.2) ([#362](https://github.com/dunay2/dvt/issues/362)) ([89ab09f](https://github.com/dunay2/dvt/commit/89ab09f6c8dac1a6a8eab7a8a6572dc8da9b65eb))
* Promote AuthorizationError and provider selection core exports ([39585cb](https://github.com/dunay2/dvt/commit/39585cbef4598e17e587a11b65b6adf60e394cc3))
* **state-store:** Add archive artifact helpers ([#523](https://github.com/dunay2/dvt/issues/523)) ([065ac4d](https://github.com/dunay2/dvt/commit/065ac4d090d71ba2e07b652a3a61b1d9b1254fff))
* **state-store:** Archive export, verifier, Postgres adapter, and test coverage ([#535](https://github.com/dunay2/dvt/issues/535)) ([bac3b4c](https://github.com/dunay2/dvt/commit/bac3b4c9bbc79c035284045b75f5ab782c8510cb))
* **state-store:** G5-PR2 — Deferred deletion and restore ([#536](https://github.com/dunay2/dvt/issues/536)) ([91fa3a0](https://github.com/dunay2/dvt/commit/91fa3a0eb21e41fe2f7d5691fde62e2490928f2c))
* **state-store:** G5-PR3 — Delivery buffer retention and purge ([#540](https://github.com/dunay2/dvt/issues/540)) ([709782b](https://github.com/dunay2/dvt/commit/709782bae3e8a4abba0e9666bad18ed82e6ea4ce))
* **state-store:** Implement issue [#6](https://github.com/dunay2/dvt/issues/6) postgres adapter foundation ([#202](https://github.com/dunay2/dvt/issues/202)) ([b112354](https://github.com/dunay2/dvt/commit/b1123545e9ef0e1e669d64519ea6a1c916553a6a))
* **state-store:** S12 — Remove deprecated write paths ([#597](https://github.com/dunay2/dvt/issues/597)) ([19181b6](https://github.com/dunay2/dvt/commit/19181b60027e51e9374a9e4f60461954592735a5))
* **temporal:** deterministic continue-as-new policy for [#15](https://github.com/dunay2/dvt/issues/15) (slice 3) ([#242](https://github.com/dunay2/dvt/issues/242)) ([084fe78](https://github.com/dunay2/dvt/commit/084fe78694ddac73c0e84ffb37993e114c1d22e9))
* **temporal:** deterministic DAG-layer scheduler slice for [#15](https://github.com/dunay2/dvt/issues/15) ([#240](https://github.com/dunay2/dvt/issues/240)) ([941670a](https://github.com/dunay2/dvt/commit/941670a944047ab9a29681b2cef433fa6c93d0d7))
* **temporal:** Preserve completed step results across continue-as-new ([#596](https://github.com/dunay2/dvt/issues/596)) ([dcd9a70](https://github.com/dunay2/dvt/commit/dcd9a70fe205c2b99996f2a95923d1c89b77b041))
* **traceability:** Govern OpenLineage facet contracts ([#415](https://github.com/dunay2/dvt/issues/415)) ([3e738e0](https://github.com/dunay2/dvt/commit/3e738e0d350b3b0318e299052824e15574930566))
* TypeScript project structure with adapter-agnostic contracts ([566f707](https://github.com/dunay2/dvt/commit/566f70746e52f2f485fa5a82966a007843da2eab)), closes [#2](https://github.com/dunay2/dvt/issues/2)
* TypeScript project structure with adapter-agnostic contracts ([#55](https://github.com/dunay2/dvt/issues/55)) ([566f707](https://github.com/dunay2/dvt/commit/566f70746e52f2f485fa5a82966a007843da2eab))
* U2 temporal lookup run ref ([#352](https://github.com/dunay2/dvt/issues/352)) ([ba0df13](https://github.com/dunay2/dvt/commit/ba0df13b5ae792177ce7417c66773ff998b0df97))


### Bug Fixes

* **adapter-postgres:** quote stale snapshot schema ([#468](https://github.com/dunay2/dvt/issues/468)) ([5d7c1d0](https://github.com/dunay2/dvt/commit/5d7c1d044d5f96c3c503e8414d08e46a1d4c0524))
* **adapters:** Corrige advertencias SonarQube y tipado ([#355](https://github.com/dunay2/dvt/issues/355)) ([d353e5a](https://github.com/dunay2/dvt/commit/d353e5a70242c641122638f1daa1542bc48b63fc))
* **adapters:** Harden archive SQL and validation ([#587](https://github.com/dunay2/dvt/issues/587)) ([b59c29c](https://github.com/dunay2/dvt/commit/b59c29cca737088977fa2b02f790988b31b67ffe))
* **adapters:** Harden outbox worker runtime lifecycle ([d2544c6](https://github.com/dunay2/dvt/commit/d2544c64484cf7c2012d154e5f2e54800cd6bd49))
* **adapters:** Harden outbox-worker cleanup error serialization ([#483](https://github.com/dunay2/dvt/issues/483)) ([d97f755](https://github.com/dunay2/dvt/commit/d97f755f08568fca0b469f9dcef0202b998d7a2a))
* **adapters:** Make outbox claim timeout configurable ([#568](https://github.com/dunay2/dvt/issues/568)) ([f1b3b31](https://github.com/dunay2/dvt/commit/f1b3b3163401f138a19b81d8a34a3be69822dba3))
* **adapters:** Normalize Temporal not-found detection robustness ([#572](https://github.com/dunay2/dvt/issues/572)) ([f848b4a](https://github.com/dunay2/dvt/commit/f848b4a0fa6c7f1c95f8b6897f77e2c17edc9a8a))
* **adapters:** Tighten claim timeout and docs guards ([#576](https://github.com/dunay2/dvt/issues/576)) ([30d3907](https://github.com/dunay2/dvt/commit/30d39078030718b7bab7c8cfd61fb2e52af1c558))
* add .eslintignore to exclude test files from type-aware linting ([33b3c23](https://github.com/dunay2/dvt/commit/33b3c232a6f9e1564eeccd445a191cfe5782c01c))
* address code review feedback ([9c81f2b](https://github.com/dunay2/dvt/commit/9c81f2b08f27569175c444c059bcf082d34a62fa))
* ADR-0031 tenant isolation for adapter-postgres ([#342](https://github.com/dunay2/dvt/issues/342)) ([45a40c1](https://github.com/dunay2/dvt/commit/45a40c17469a4e9067d0618287dc69519d6a5e7a))
* align spacing in .golden/README.md with main branch ([0e68a10](https://github.com/dunay2/dvt/commit/0e68a1047f298ad1f0014b17e2370f58c3202f6f))
* **api:** Build observability packages before API tests ([#351](https://github.com/dunay2/dvt/issues/351)) ([70793e1](https://github.com/dunay2/dvt/commit/70793e16f962a69e7a2542167e6fe8b326a1f813))
* **api:** Harden planner-backed startRun validation and evidence ([#541](https://github.com/dunay2/dvt/issues/541)) ([6ffc260](https://github.com/dunay2/dvt/commit/6ffc260e7e60f38ae373117f1efe85cd97f6b635))
* **api:** Harden RC-D1 health runtime watchdog and QA closure ([#555](https://github.com/dunay2/dvt/issues/555)) ([681c27c](https://github.com/dunay2/dvt/commit/681c27c0131d1ebccedf5ddceb35f9661125490c))
* **api:** Make fallback writes atomic ([#583](https://github.com/dunay2/dvt/issues/583)) ([5760fcf](https://github.com/dunay2/dvt/commit/5760fcf20fdfb0b352c40ebc32fdf97b7f721a64))
* **api:** Map missing startRun adapter to 422 ([#480](https://github.com/dunay2/dvt/issues/480)) ([470d994](https://github.com/dunay2/dvt/commit/470d99468d117f7b9de335325cd6eea3f3a09c11))
* **api:** split startRun route parser ([#580](https://github.com/dunay2/dvt/issues/580)) ([8abd9d6](https://github.com/dunay2/dvt/commit/8abd9d638896d5793ceaaf57d14bdb383a04794d))
* apply Prettier formatting to all files ([97b0e5d](https://github.com/dunay2/dvt/commit/97b0e5d56d51ed963005981bec51aacfb6cb9821))
* **ci:** Avoid incompatible Vitest ESLint plugin load ([21c5620](https://github.com/dunay2/dvt/commit/21c5620b239d298f4e8f1c21c20ebcbab228c39f))
* **ci:** Ensure contracts package is built before engine tests ([#273](https://github.com/dunay2/dvt/issues/273)) ([4851e1b](https://github.com/dunay2/dvt/commit/4851e1bf05a4e085b52e748f3abbe901ef4d0271))
* **ci:** Ensure contracts package is built before engine tests ([#281](https://github.com/dunay2/dvt/issues/281)) ([9cd8e70](https://github.com/dunay2/dvt/commit/9cd8e70b2a017e1fbc2166ba3e17d428d56c6a9e))
* **ci:** Harden workspace prebuild chains ([#485](https://github.com/dunay2/dvt/issues/485)) ([91fc13a](https://github.com/dunay2/dvt/commit/91fc13ac2793257d33bdca8574e556fdebb1bbc0))
* **ci:** Lock platform baseline ([#499](https://github.com/dunay2/dvt/issues/499)) ([fd8261a](https://github.com/dunay2/dvt/commit/fd8261ab78d84d2b5dda5a3db242dd0e78e1d05b))
* **ci:** Restore @dvt/crypto resolution and normalize run context ([#337](https://github.com/dunay2/dvt/issues/337)) ([9435259](https://github.com/dunay2/dvt/commit/943525933e2ae28137d1bfc4787041cd0bda66dd))
* **ci:** Stabilize main quality checks after docs merge ([#349](https://github.com/dunay2/dvt/issues/349)) ([cb7a734](https://github.com/dunay2/dvt/commit/cb7a7348605ef53de10e781de374e73823bc86d0))
* **ci:** Use github.rest.pulls.listFiles in PR Quality Gate detect_changes step ([0676d0b](https://github.com/dunay2/dvt/commit/0676d0bc2b10d7a7b0277343480fe126e4823577))
* **ci:** Workflow correctness and efficiency improvements ([#612](https://github.com/dunay2/dvt/issues/612)) ([e2f3b7b](https://github.com/dunay2/dvt/commit/e2f3b7b607249abbc124c1be0d3094fe672e5a66))
* **contracts:** Add workflows/errors and exports ([90717b0](https://github.com/dunay2/dvt/commit/90717b0c201a8a70e6d506986a000273928b5a22))
* **contracts:** Align golden hash generator with baseline contract ([#350](https://github.com/dunay2/dvt/issues/350)) ([7a2e226](https://github.com/dunay2/dvt/commit/7a2e226104bfda2fd804b7fb893f985eb839106f))
* **contracts:** Default message param in ValidationException.fromZodError ([6891a97](https://github.com/dunay2/dvt/commit/6891a9750a943e65c3289c557c0e30e1482a67c5))
* **contracts:** Harden planner boundary validation ([#530](https://github.com/dunay2/dvt/issues/530)) ([a6f8e22](https://github.com/dunay2/dvt/commit/a6f8e2240f6a104e501e8990adddf9f819f0be8c))
* **contracts:** Wire runtime boundary validation in active engine entry points ([#204](https://github.com/dunay2/dvt/issues/204)) ([e47e4f0](https://github.com/dunay2/dvt/commit/e47e4f00481fef2d4949af7b13db48850f61f007))
* **deps:** Align adapter dependency graphs ([#503](https://github.com/dunay2/dvt/issues/503)) ([1775dfb](https://github.com/dunay2/dvt/commit/1775dfbb02762e08a51ab880d2d12f0930c9952f))
* **deps:** Make tslib explicit runtime helper ([#500](https://github.com/dunay2/dvt/issues/500)) ([a7e202a](https://github.com/dunay2/dvt/commit/a7e202a2ce193d9988876d383e6a43c6a49a3f5e))
* **docs:** avoid broken-link false positive in CONTRACT_TEMPLATE.v1.md (issue [#224](https://github.com/dunay2/dvt/issues/224)) ([#246](https://github.com/dunay2/dvt/issues/246)) ([fb11ffc](https://github.com/dunay2/dvt/commit/fb11ffc4cac9e73d087c07248d6b6d7bbdb6dcdb))
* **docs:** Extract normative security invariants from THREAT_MODEL [#63](https://github.com/dunay2/dvt/issues/63) ([#64](https://github.com/dunay2/dvt/issues/64)) ([dae7055](https://github.com/dunay2/dvt/commit/dae7055b9435225a592e130f10837528d46cbf9a))
* **docs:** Restore RC-F1 note and PR [#605](https://github.com/dunay2/dvt/issues/605) link lost in cherry-pick ([#608](https://github.com/dunay2/dvt/issues/608)) ([0585bb6](https://github.com/dunay2/dvt/commit/0585bb6979eec822fee00d4ef398d284a0e31b4e))
* **engine:** Add resilience hardening for WorkflowEngine ([#206](https://github.com/dunay2/dvt/issues/206)) ([ec0261a](https://github.com/dunay2/dvt/commit/ec0261af4b96a283b0bc9c3d396b88862231f73d))
* **engine:** Add timeouts and reduce signal complexity on runtime boundaries ([#205](https://github.com/dunay2/dvt/issues/205)) ([6b3493d](https://github.com/dunay2/dvt/commit/6b3493dd7afab6f951b1c00cbd946ed849b9f740))
* **engine:** Emit markResolved warning when metric sink fails ([#553](https://github.com/dunay2/dvt/issues/553)) ([e509b46](https://github.com/dunay2/dvt/commit/e509b462be27c2ecfc58ad4eecadadca55db2939))
* **engine:** Enforce ESLint import order and type grouping in validatingAdapter.test.ts ([c7ce279](https://github.com/dunay2/dvt/commit/c7ce279a7d58633da1a6d2dd929f97cded61ebc0))
* **engine:** Harden bootstrap ordering and projector transitions ([#452](https://github.com/dunay2/dvt/issues/452)) ([4a5d104](https://github.com/dunay2/dvt/commit/4a5d1042c6ba2698f7aced053f5a339ffb514f1e))
* **engine:** Harden G3 reconciler bootstrap and stabilize CI ([#360](https://github.com/dunay2/dvt/issues/360)) ([d7f07a5](https://github.com/dunay2/dvt/commit/d7f07a5d5f470fca437c2f9871e0c22f8922dbf5))
* **engine:** Harden markResolved observability and close RC-A5 QA findings ([#549](https://github.com/dunay2/dvt/issues/549)) ([28d8922](https://github.com/dunay2/dvt/commit/28d8922efe2edf114ad4f41cf428c4d82fc92309))
* **engine:** Harden outbox ordering and correctness ([#444](https://github.com/dunay2/dvt/issues/444)) ([8b79a98](https://github.com/dunay2/dvt/commit/8b79a980775329a3f070dda485b30496981fa7f3))
* **engine:** Harden RC-A5 markResolved observability failure handling ([#554](https://github.com/dunay2/dvt/issues/554)) ([5d891c5](https://github.com/dunay2/dvt/commit/5d891c5796abea6eeada942a4c7a1c60477ef895))
* **engine:** Inline AuthorizationError to avoid contracts entry resolution ([8c00a4d](https://github.com/dunay2/dvt/commit/8c00a4db8eed4f4973821f1f708757fce7ac475d))
* **engine:** Reconcile provider run id after pre-bootstrap start ([#497](https://github.com/dunay2/dvt/issues/497)) ([e356625](https://github.com/dunay2/dvt/commit/e356625c3010d1b1037233d71391204262442c4f))
* **engine:** Remove process.env defaults from provider selection ([#197](https://github.com/dunay2/dvt/issues/197)) ([c5d521a](https://github.com/dunay2/dvt/commit/c5d521a75a937bccd5eadfaa302107000b8ec8c5))
* **engine:** Robust default provider selection and reduce complexity ([#200](https://github.com/dunay2/dvt/issues/200)) ([4ddf2cc](https://github.com/dunay2/dvt/commit/4ddf2ccb5f1005ffdf8133b19f2ed7a8a0edcf16))
* **outbox:** accurate metrics + ordering ([412dbc3](https://github.com/dunay2/dvt/commit/412dbc39647eb2002438325e67a465f50c450350))
* Resolve engine contracts path mapping to dist declarations ([#116](https://github.com/dunay2/dvt/issues/116)) ([ca59788](https://github.com/dunay2/dvt/commit/ca597886f1ed10246c0608075baeb8f1fe36fa2e))
* resolve merge conflict in .golden/README.md ([db41a99](https://github.com/dunay2/dvt/commit/db41a990bc173c8ed57be095300fb81ee1619bc4))
* Stabilize auth runtime and planner changes ([#396](https://github.com/dunay2/dvt/issues/396)) ([2a39101](https://github.com/dunay2/dvt/commit/2a39101bc5d1abf9921c3e46f300d39cdbdba039))
* **state-store:** Add migration 002 for claimed_at/index parity (2026-02-19 22:49 UTC) ([#259](https://github.com/dunay2/dvt/issues/259)) ([52f6b3b](https://github.com/dunay2/dvt/commit/52f6b3b814c91e0112261772009cdac1d87c0e8c))
* **state-store:** Build dependency graph before tests ([#618](https://github.com/dunay2/dvt/issues/618)) ([04e3796](https://github.com/dunay2/dvt/commit/04e3796bcf39607289dc15d8249dbc8e5d88045d))
* **state-store:** Harden archive lifecycle helper validation ([#521](https://github.com/dunay2/dvt/issues/521)) ([1d5fa74](https://github.com/dunay2/dvt/commit/1d5fa746bf04f2585e1a6317273661c77e69060e))
* **state-store:** Harden intent store conflict semantics ([#475](https://github.com/dunay2/dvt/issues/475)) ([a2f2883](https://github.com/dunay2/dvt/commit/a2f2883b0c7528620b0871262c837b184c1be5b7))
* **state-store:** Preserve migration timeout semantics ([#473](https://github.com/dunay2/dvt/issues/473)) ([88d0190](https://github.com/dunay2/dvt/commit/88d01901b2a8363c3813e43cc6e457e690bc4b7f))
* **temporal:** Align logical and engine attempt semantics ([#238](https://github.com/dunay2/dvt/issues/238)) ([65d5950](https://github.com/dunay2/dvt/commit/65d59508388aed43e8e40eba085fb06acfca6440))
* **temporal:** Require explicit env injection for config loader ([#198](https://github.com/dunay2/dvt/issues/198)) ([567a835](https://github.com/dunay2/dvt/commit/567a835568c3866557f3d765a1f536ed7d5185bc))
* **temporal:** Run existing tests for integration job ([2e16418](https://github.com/dunay2/dvt/commit/2e1641800b0633c689533d20f46df48789db937f))
* update pnpm version to 9 in all workflow files ([04de73b](https://github.com/dunay2/dvt/commit/04de73bf3ac4b4571c14ae9916080b58845709eb))
* use relative paths in JSDoc references ([e5c2996](https://github.com/dunay2/dvt/commit/e5c29960d05716ce5261782122d8e3ecc00d3118))
* **validation:** make formatZodPath robust for PropertyKey[] paths ([54bfeda](https://github.com/dunay2/dvt/commit/54bfeda334cc1f1f2f0250d1acc47ffbc11938d2))
* Wire reconciler watchdog health degradation ([#611](https://github.com/dunay2/dvt/issues/611)) ([3d11bf0](https://github.com/dunay2/dvt/commit/3d11bf0893c289668636c2fa70a065866c7cd802))

## [4.14.0](https://github.com/dunay2/dvt/compare/v4.13.0...v4.14.0) (2026-03-28)


### Features

* **api:** Add explicit cancel route and shared command execution ([#640](https://github.com/dunay2/dvt/issues/640)) ([f782bd4](https://github.com/dunay2/dvt/commit/f782bd4af27591fe35aa3d222c87223f31d7c731))

## [4.13.0](https://github.com/dunay2/dvt/compare/v4.12.3...v4.13.0) (2026-03-27)


### Features

* **api:** Admission control operability — decision telemetry and capacity gauges ([#628](https://github.com/dunay2/dvt/issues/628)) ([af10c43](https://github.com/dunay2/dvt/commit/af10c43f50b818cd4913cf2f9397167d69128a86))

## [4.12.3](https://github.com/dunay2/dvt/compare/v4.12.2...v4.12.3) (2026-03-25)


### Bug Fixes

* **state-store:** Build dependency graph before tests ([#618](https://github.com/dunay2/dvt/issues/618)) ([04e3796](https://github.com/dunay2/dvt/commit/04e3796bcf39607289dc15d8249dbc8e5d88045d))

## [4.12.2](https://github.com/dunay2/dvt/compare/v4.12.1...v4.12.2) (2026-03-25)


### Bug Fixes

* **ci:** Workflow correctness and efficiency improvements ([#612](https://github.com/dunay2/dvt/issues/612)) ([e2f3b7b](https://github.com/dunay2/dvt/commit/e2f3b7b607249abbc124c1be0d3094fe672e5a66))
* Wire reconciler watchdog health degradation ([#611](https://github.com/dunay2/dvt/issues/611)) ([3d11bf0](https://github.com/dunay2/dvt/commit/3d11bf0893c289668636c2fa70a065866c7cd802))

## [4.12.1](https://github.com/dunay2/dvt/compare/v4.12.0...v4.12.1) (2026-03-25)


### Bug Fixes

* **docs:** Restore RC-F1 note and PR [#605](https://github.com/dunay2/dvt/issues/605) link lost in cherry-pick ([#608](https://github.com/dunay2/dvt/issues/608)) ([0585bb6](https://github.com/dunay2/dvt/commit/0585bb6979eec822fee00d4ef398d284a0e31b4e))

## [4.12.0](https://github.com/dunay2/dvt/compare/v4.11.0...v4.12.0) (2026-03-24)


### Features

* **state-store:** S12 — Remove deprecated write paths ([#597](https://github.com/dunay2/dvt/issues/597)) ([19181b6](https://github.com/dunay2/dvt/commit/19181b60027e51e9374a9e4f60461954592735a5))

## [4.11.0](https://github.com/dunay2/dvt/compare/v4.10.0...v4.11.0) (2026-03-24)


### Features

* **adapters:** remove simulateError and harden intent identity ([#592](https://github.com/dunay2/dvt/issues/592)) ([ea6973d](https://github.com/dunay2/dvt/commit/ea6973d0a82c87a6e8318d1f8d18fccb604469b4))
* **temporal:** Preserve completed step results across continue-as-new ([#596](https://github.com/dunay2/dvt/issues/596)) ([dcd9a70](https://github.com/dunay2/dvt/commit/dcd9a70fe205c2b99996f2a95923d1c89b77b041))

## [4.10.0](https://github.com/dunay2/dvt/compare/v4.9.3...v4.10.0) (2026-03-24)


### Features

* **docs,adapters:** Consolidate remaining value slices ([#590](https://github.com/dunay2/dvt/issues/590)) ([ea7bbc0](https://github.com/dunay2/dvt/commit/ea7bbc0bf5b9a614c63f85b1ecc26ae7687f1263))


### Bug Fixes

* **adapters:** Harden archive SQL and validation ([#587](https://github.com/dunay2/dvt/issues/587)) ([b59c29c](https://github.com/dunay2/dvt/commit/b59c29cca737088977fa2b02f790988b31b67ffe))

## [4.9.3](https://github.com/dunay2/dvt/compare/v4.9.2...v4.9.3) (2026-03-23)


### Bug Fixes

* **api:** Make fallback writes atomic ([#583](https://github.com/dunay2/dvt/issues/583)) ([5760fcf](https://github.com/dunay2/dvt/commit/5760fcf20fdfb0b352c40ebc32fdf97b7f721a64))
* **api:** split startRun route parser ([#580](https://github.com/dunay2/dvt/issues/580)) ([8abd9d6](https://github.com/dunay2/dvt/commit/8abd9d638896d5793ceaaf57d14bdb383a04794d))

## [4.9.2](https://github.com/dunay2/dvt/compare/v4.9.1...v4.9.2) (2026-03-23)


### Bug Fixes

* **adapters:** Tighten claim timeout and docs guards ([#576](https://github.com/dunay2/dvt/issues/576)) ([30d3907](https://github.com/dunay2/dvt/commit/30d39078030718b7bab7c8cfd61fb2e52af1c558))

## [4.9.1](https://github.com/dunay2/dvt/compare/v4.9.0...v4.9.1) (2026-03-23)


### Bug Fixes

* **adapters:** Normalize Temporal not-found detection robustness ([#572](https://github.com/dunay2/dvt/issues/572)) ([f848b4a](https://github.com/dunay2/dvt/commit/f848b4a0fa6c7f1c95f8b6897f77e2c17edc9a8a))

## [4.9.0](https://github.com/dunay2/dvt/compare/v4.8.1...v4.9.0) (2026-03-23)


### Features

* **api:** Harden start-run parser edges ([#570](https://github.com/dunay2/dvt/issues/570)) ([7b917fb](https://github.com/dunay2/dvt/commit/7b917fba4141e029fe516c37d810ed35028f7bd8))

## [4.8.1](https://github.com/dunay2/dvt/compare/v4.8.0...v4.8.1) (2026-03-23)


### Bug Fixes

* **adapters:** Make outbox claim timeout configurable ([#568](https://github.com/dunay2/dvt/issues/568)) ([f1b3b31](https://github.com/dunay2/dvt/commit/f1b3b3163401f138a19b81d8a34a3be69822dba3))

## [4.8.0](https://github.com/dunay2/dvt/compare/v4.7.2...v4.8.0) (2026-03-23)


### Features

* **api:** Add reconciler health visibility ([#564](https://github.com/dunay2/dvt/issues/564)) ([4a96f94](https://github.com/dunay2/dvt/commit/4a96f94c8e1b4bc50b180e76ce05586cd81afb56))

## [4.7.2](https://github.com/dunay2/dvt/compare/v4.7.1...v4.7.2) (2026-03-23)


### Bug Fixes

* **api:** Harden RC-D1 health runtime watchdog and QA closure ([#555](https://github.com/dunay2/dvt/issues/555)) ([681c27c](https://github.com/dunay2/dvt/commit/681c27c0131d1ebccedf5ddceb35f9661125490c))
* **engine:** Harden RC-A5 markResolved observability failure handling ([#554](https://github.com/dunay2/dvt/issues/554)) ([5d891c5](https://github.com/dunay2/dvt/commit/5d891c5796abea6eeada942a4c7a1c60477ef895))

## [4.7.1](https://github.com/dunay2/dvt/compare/v4.7.0...v4.7.1) (2026-03-22)


### Bug Fixes

* **engine:** Emit markResolved warning when metric sink fails ([#553](https://github.com/dunay2/dvt/issues/553)) ([e509b46](https://github.com/dunay2/dvt/commit/e509b462be27c2ecfc58ad4eecadadca55db2939))
* **engine:** Harden markResolved observability and close RC-A5 QA findings ([#549](https://github.com/dunay2/dvt/issues/549)) ([28d8922](https://github.com/dunay2/dvt/commit/28d8922efe2edf114ad4f41cf428c4d82fc92309))

## [4.7.0](https://github.com/dunay2/dvt/compare/v4.6.0...v4.7.0) (2026-03-21)


### Features

* **adapters:** S06 + S01 — Migration version table and dead contract cleanup ([#538](https://github.com/dunay2/dvt/issues/538)) ([7c63073](https://github.com/dunay2/dvt/commit/7c63073e64163a9a1962d218c9c034664c5d9831))
* **state-store:** G5-PR3 — Delivery buffer retention and purge ([#540](https://github.com/dunay2/dvt/issues/540)) ([709782b](https://github.com/dunay2/dvt/commit/709782bae3e8a4abba0e9666bad18ed82e6ea4ce))

## [4.6.0](https://github.com/dunay2/dvt/compare/v4.5.0...v4.6.0) (2026-03-21)


### Features

* **state-store:** Archive export, verifier, Postgres adapter, and test coverage ([#535](https://github.com/dunay2/dvt/issues/535)) ([bac3b4c](https://github.com/dunay2/dvt/commit/bac3b4c9bbc79c035284045b75f5ab782c8510cb))
* **state-store:** G5-PR2 — Deferred deletion and restore ([#536](https://github.com/dunay2/dvt/issues/536)) ([91fa3a0](https://github.com/dunay2/dvt/commit/91fa3a0eb21e41fe2f7d5691fde62e2490928f2c))


### Bug Fixes

* **api:** Harden planner-backed startRun validation and evidence ([#541](https://github.com/dunay2/dvt/issues/541)) ([6ffc260](https://github.com/dunay2/dvt/commit/6ffc260e7e60f38ae373117f1efe85cd97f6b635))

## [4.5.0](https://github.com/dunay2/dvt/compare/v4.4.0...v4.5.0) (2026-03-21)


### Features

* **api:** Add planner-backed stored plan start flow ([#533](https://github.com/dunay2/dvt/issues/533)) ([f960284](https://github.com/dunay2/dvt/commit/f9602845365aa0e33012bfecdfcf15b7fb12b825))

## [4.4.0](https://github.com/dunay2/dvt/compare/v4.3.0...v4.4.0) (2026-03-21)


### Features

* **api:** Add backpressure resilience envelope ([#532](https://github.com/dunay2/dvt/issues/532)) ([f0b1577](https://github.com/dunay2/dvt/commit/f0b157705450f9cb7593edc86314da6774ed46be))


### Bug Fixes

* **contracts:** Harden planner boundary validation ([#530](https://github.com/dunay2/dvt/issues/530)) ([a6f8e22](https://github.com/dunay2/dvt/commit/a6f8e2240f6a104e501e8990adddf9f819f0be8c))

## [4.3.0](https://github.com/dunay2/dvt/compare/v4.2.2...v4.3.0) (2026-03-20)


### Features

* **adapters:** Pin archived terminal snapshots ([#525](https://github.com/dunay2/dvt/issues/525)) ([ef9efcf](https://github.com/dunay2/dvt/commit/ef9efcf30dd02bb3022ab9111dc5e174f1aaef6c))
* **api:** Add raw SQL admission snapshot source ([#524](https://github.com/dunay2/dvt/issues/524)) ([6190a41](https://github.com/dunay2/dvt/commit/6190a415dacf462e7742832d8945fdedd7fe6a30))
* **api:** Add runtime query routes and execution guards ([#517](https://github.com/dunay2/dvt/issues/517)) ([699ca7c](https://github.com/dunay2/dvt/commit/699ca7cbdfbb23d89b71373d134a9fa51bcbdb55))
* **api:** Add startRun admission foundation ([#522](https://github.com/dunay2/dvt/issues/522)) ([1c52118](https://github.com/dunay2/dvt/commit/1c52118ae16e42211650023367e6e4c0f00853cd))
* **contracts:** Complete planner Stage 1.1 boundary canonization ([#511](https://github.com/dunay2/dvt/issues/511)) ([e3c8e24](https://github.com/dunay2/dvt/commit/e3c8e243ff9f0c3b1268e7de38c8f41bec89a5aa))
* **contracts:** Govern execution plan versioning ([#518](https://github.com/dunay2/dvt/issues/518)) ([90f445c](https://github.com/dunay2/dvt/commit/90f445c45f52c712e2e9fe8715ff4df4a8424889))
* **state-store:** Add archive artifact helpers ([#523](https://github.com/dunay2/dvt/issues/523)) ([065ac4d](https://github.com/dunay2/dvt/commit/065ac4d090d71ba2e07b652a3a61b1d9b1254fff))


### Bug Fixes

* **state-store:** Harden archive lifecycle helper validation ([#521](https://github.com/dunay2/dvt/issues/521)) ([1d5fa74](https://github.com/dunay2/dvt/commit/1d5fa746bf04f2585e1a6317273661c77e69060e))

## [4.2.2](https://github.com/dunay2/dvt/compare/v4.2.1...v4.2.2) (2026-03-17)


### Bug Fixes

* **deps:** Make tslib explicit runtime helper ([#500](https://github.com/dunay2/dvt/issues/500)) ([a7e202a](https://github.com/dunay2/dvt/commit/a7e202a2ce193d9988876d383e6a43c6a49a3f5e))

## [4.2.1](https://github.com/dunay2/dvt/compare/v4.2.0...v4.2.1) (2026-03-16)


### Bug Fixes

* **ci:** Lock platform baseline ([#499](https://github.com/dunay2/dvt/issues/499)) ([fd8261a](https://github.com/dunay2/dvt/commit/fd8261ab78d84d2b5dda5a3db242dd0e78e1d05b))
* **engine:** Reconcile provider run id after pre-bootstrap start ([#497](https://github.com/dunay2/dvt/issues/497)) ([e356625](https://github.com/dunay2/dvt/commit/e356625c3010d1b1037233d71391204262442c4f))

## [4.2.0](https://github.com/dunay2/dvt/compare/v4.1.2...v4.2.0) (2026-03-16)


### Features

* Add G7 projector worker runtime ([#487](https://github.com/dunay2/dvt/issues/487)) ([8c6f31e](https://github.com/dunay2/dvt/commit/8c6f31e276dc08f242faa3193a158f9cd4863df0))

## [4.1.2](https://github.com/dunay2/dvt/compare/v4.1.1...v4.1.2) (2026-03-16)


### Bug Fixes

* **adapters:** Harden outbox-worker cleanup error serialization ([#483](https://github.com/dunay2/dvt/issues/483)) ([d97f755](https://github.com/dunay2/dvt/commit/d97f755f08568fca0b469f9dcef0202b998d7a2a))
* **ci:** Harden workspace prebuild chains ([#485](https://github.com/dunay2/dvt/issues/485)) ([91fc13a](https://github.com/dunay2/dvt/commit/91fc13ac2793257d33bdca8574e556fdebb1bbc0))

## [4.1.1](https://github.com/dunay2/dvt/compare/v4.1.0...v4.1.1) (2026-03-16)


### Bug Fixes

* **api:** Map missing startRun adapter to 422 ([#480](https://github.com/dunay2/dvt/issues/480)) ([470d994](https://github.com/dunay2/dvt/commit/470d99468d117f7b9de335325cd6eea3f3a09c11))

## [4.1.0](https://github.com/dunay2/dvt/compare/v4.0.1...v4.1.0) (2026-03-15)


### Features

* **adapters:** Add lineage runtime and worker ([#476](https://github.com/dunay2/dvt/issues/476)) ([2c895bd](https://github.com/dunay2/dvt/commit/2c895bd171c6e73465fdc73787441cc6da84161d))

## [4.0.1](https://github.com/dunay2/dvt/compare/v4.0.0...v4.0.1) (2026-03-15)


### Bug Fixes

* **state-store:** Harden intent store conflict semantics ([#475](https://github.com/dunay2/dvt/issues/475)) ([a2f2883](https://github.com/dunay2/dvt/commit/a2f2883b0c7528620b0871262c837b184c1be5b7))

## [4.0.0](https://github.com/dunay2/dvt/compare/v3.5.1...v4.0.0) (2026-03-15)


### ⚠ BREAKING CHANGES

* **engine:** Adapters must be wrapped with ValidatingAdapter for runtime validation boundary enforcement
* **contracts:** EngineRunRef.runId now REQUIRED (was optional)
* **ci:** None (new tooling only, no semantic changes)

### Features

* **adapter-temporal:** Complete T4-3 compiledCodeRef propagation ([#374](https://github.com/dunay2/dvt/issues/374)) ([7f04e42](https://github.com/dunay2/dvt/commit/7f04e427e3aec4c936adfcbea46c36d50ae433c8))
* **adapters:** Add G3/G4 planning docs and initial Postgres intent store ([#356](https://github.com/dunay2/dvt/issues/356)) ([b03ab10](https://github.com/dunay2/dvt/commit/b03ab10b8ee439f97af1e307e4d2e75f41b6d73a))
* **adapters:** Finalize outbox worker extraction and ownership hardening ([#449](https://github.com/dunay2/dvt/issues/449)) ([88c35aa](https://github.com/dunay2/dvt/commit/88c35aa929f5ce99f4ca294349e862696683d530))
* **adapters:** Implement G4 T4-4 traceability compiled-code lineage module ([#371](https://github.com/dunay2/dvt/issues/371)) ([9a55274](https://github.com/dunay2/dvt/commit/9a552745192c74861dbbbf4b15d03116096107a6))
* **adapters:** Implement PostgreSQL persistence and Issue [#6](https://github.com/dunay2/dvt/issues/6) docs ([#248](https://github.com/dunay2/dvt/issues/248)) ([1f0186b](https://github.com/dunay2/dvt/commit/1f0186b41374e67283160c3be6e40b2fd500b021))
* **adapters:** Temporal adapter implementation (core) ([cc5581b](https://github.com/dunay2/dvt/commit/cc5581bf6ad6da094101beb604e7e112a9455f6b))
* **adapters:** ValidatingAdapter MVP + tests (wrap startRun) ([4422014](https://github.com/dunay2/dvt/commit/4422014210f6a43bd5b147e6625d4b472a1496b6))
* add contract testing scripts and infrastructure ([6fe7ff1](https://github.com/dunay2/dvt/commit/6fe7ff1b5a41e47199ae8a74a2b3cbd9f073d097))
* agregar package.json y configurar npm para el proyecto ([c9ac38a](https://github.com/dunay2/dvt/commit/c9ac38a4ed2a9ba7e520bab814063a7b17ded317))
* **ci:** add comprehensive quality tooling and documentation improvements ([044a180](https://github.com/dunay2/dvt/commit/044a180f86068e5010c11bafc74b38c76cd50c92))
* **ci:** Add modular ARC policy traceability (ADR-0000c) ([#368](https://github.com/dunay2/dvt/issues/368)) ([35b3596](https://github.com/dunay2/dvt/commit/35b35967b66a51b9d049585b633b1c8f5344eeb9))
* Close temporal operational observability gaps ([#400](https://github.com/dunay2/dvt/issues/400)) ([d358fd4](https://github.com/dunay2/dvt/commit/d358fd4ccdc39f1417e8e143f33fa8e0e1002742))
* complete Phase 1 implementation roadmap with epics and automation ([e4813e8](https://github.com/dunay2/dvt/commit/e4813e83d11c6e5dcd97127bb29d049c19c33451))
* **contracts:** add CanvasState v1 schema for issue [#220](https://github.com/dunay2/dvt/issues/220) ([#247](https://github.com/dunay2/dvt/issues/247)) ([79ddab1](https://github.com/dunay2/dvt/commit/79ddab1fd40829b54021aa9ef5f2ca4b35fad864))
* **contracts:** Add glossary usage validator (issue [#226](https://github.com/dunay2/dvt/issues/226)) ([#255](https://github.com/dunay2/dvt/issues/255)) ([1133257](https://github.com/dunay2/dvt/commit/1133257b8a3e0f8ee62a719b661a5e9da00c1bb2))
* **contracts:** add ProvenanceEvent v1 schema for issue [#221](https://github.com/dunay2/dvt/issues/221) ([#249](https://github.com/dunay2/dvt/issues/249)) ([6a0a9b1](https://github.com/dunay2/dvt/commit/6a0a9b1797e396d0ee1b4cec0565b1d16e4caec0))
* **contracts:** Add reference validation script (issue [#228](https://github.com/dunay2/dvt/issues/228)) ([#253](https://github.com/dunay2/dvt/issues/253)) ([785a4e4](https://github.com/dunay2/dvt/commit/785a4e433d2415859fd05dfb265183808fedc763))
* **contracts:** Add RFC2119 validator in warning mode (issue [#229](https://github.com/dunay2/dvt/issues/229)) ([#252](https://github.com/dunay2/dvt/issues/252)) ([0691798](https://github.com/dunay2/dvt/commit/069179883f3487a359ffc11e2d0bd13e94d3f17b))
* **contracts:** Add runtime validation at API boundaries using Zod ([#196](https://github.com/dunay2/dvt/issues/196)) ([f08acf6](https://github.com/dunay2/dvt/commit/f08acf639660ecc71c0d8a5075750353e829a97f))
* **contracts:** Artifact store port and typed compiled code refs ([#384](https://github.com/dunay2/dvt/issues/384)) ([2687b47](https://github.com/dunay2/dvt/commit/2687b47cd9a5575edb3d0bb0404b4c07f7f11f3b))
* **contracts:** Complete Issue [#2](https://github.com/dunay2/dvt/issues/2) contract alignment ([#65](https://github.com/dunay2/dvt/issues/65)) ([e6eb2a0](https://github.com/dunay2/dvt/commit/e6eb2a0ea8b528db0d8aa707b2177c537d69a0b6))
* **contracts:** Promote core exports and authorization error ([a756222](https://github.com/dunay2/dvt/commit/a756222ba185b60ef02aa834ca914a032e809b43))
* **contracts:** reapply PR [#234](https://github.com/dunay2/dvt/issues/234) changes on top of main ([#236](https://github.com/dunay2/dvt/issues/236)) ([8486f36](https://github.com/dunay2/dvt/commit/8486f36f9eade484cf38584ebcebf6ed72bd797b))
* **contracts:** Validate executable TypeScript examples ([#251](https://github.com/dunay2/dvt/issues/251)) ([62f1eb1](https://github.com/dunay2/dvt/commit/62f1eb1ecbc77c0fb96c9f795ec99dc93c0dcc23))
* **ddd-cqrs:** DDD/CQRS package skeletons and docs updates ([#284](https://github.com/dunay2/dvt/issues/284)) ([5229c04](https://github.com/dunay2/dvt/commit/5229c043c4689adfd3070ff383d762eb97caf3a3))
* **docs:** Normalize Decision node properties in English ([#215](https://github.com/dunay2/dvt/issues/215)) ([6d65f82](https://github.com/dunay2/dvt/commit/6d65f8239df82050d207f9fafad642210c48774c))
* **engine:** Activate workflows with v2 run events and transactional bootstrap ([#274](https://github.com/dunay2/dvt/issues/274)) ([c914d55](https://github.com/dunay2/dvt/commit/c914d55c0c83518799c5e8a7de0c97e9376aa97a))
* **engine:** Add ADR-0030 reconciliation follow-ups without regressions ([#346](https://github.com/dunay2/dvt/issues/346)) ([6c85a2e](https://github.com/dunay2/dvt/commit/6c85a2e9ac4b370c16afb31f220005f247756d7f))
* **engine:** Add provider selection and authorization error support ([38a2df2](https://github.com/dunay2/dvt/commit/38a2df255bd454ed03fbc354d1a4a99b725a42ee))
* **engine:** Enforce determinism linting for Temporal workflows ([#195](https://github.com/dunay2/dvt/issues/195)) ([f086ab0](https://github.com/dunay2/dvt/commit/f086ab02d771d5c7e58f68cba3a0869c69f79e80)), closes [#4](https://github.com/dunay2/dvt/issues/4)
* **engine:** Formalize snapshot recovery and startup hardening ([#459](https://github.com/dunay2/dvt/issues/459)) ([4a88b41](https://github.com/dunay2/dvt/commit/4a88b4155e0f789e0084c872330cba55f551b381))
* **engine:** Migrate observability and intent lifecycle to current main baseline ([#333](https://github.com/dunay2/dvt/issues/333)) ([875a806](https://github.com/dunay2/dvt/commit/875a806cd003a5fe5f9522cd71c97f341fa184c9))
* **engine:** Migrate observability and intent lifecycle to current main baseline ([#335](https://github.com/dunay2/dvt/issues/335)) ([40f031c](https://github.com/dunay2/dvt/commit/40f031ce4ad0bfbcb01ef81314b7cb14e4b6d312))
* **engine:** Promote dependsOn to shared execution plan contract ([#241](https://github.com/dunay2/dvt/issues/241)) ([7d259ae](https://github.com/dunay2/dvt/commit/7d259ae0494c2d23ac3d0f3d1fa1db1d0fc745f3))
* **engine:** robust runtime validation adapter with strict error mapping ([5b11d30](https://github.com/dunay2/dvt/commit/5b11d3069fafd8c51720d609bf7dfd450185a316))
* **g5:** Harden standalone outbox worker service ([#421](https://github.com/dunay2/dvt/issues/421)) ([edd4c92](https://github.com/dunay2/dvt/commit/edd4c92e03b6087dbea57f8f55b725169338d7c0))
* implement outbox delivery worker for at-least-once event delivery ([5530358](https://github.com/dunay2/dvt/commit/55303586e5b768164456100fe61a1ba115f0127f))
* implement outbox delivery worker with comprehensive tests ([45a7f78](https://github.com/dunay2/dvt/commit/45a7f78b5592c0aae5269648e80aa63c79d21975))
* implement TypeScript types for engine contracts ([aa93cf3](https://github.com/dunay2/dvt/commit/aa93cf333f6cf060ed318a94d009b15ac8700d5b))
* implement TypeScript types for engine contracts ([090be4e](https://github.com/dunay2/dvt/commit/090be4e9cd97f50b76827f09db71ba58c3534ae0))
* Phase 2 - Projector and Engine adapter contracts ([#56](https://github.com/dunay2/dvt/issues/56)) ([81bfec8](https://github.com/dunay2/dvt/commit/81bfec85d59eb1b20be88fecd805dcbb75c44ebd))
* **planner:** Add compiledCodeRef enrichment pipeline (G4 T4.2) ([#362](https://github.com/dunay2/dvt/issues/362)) ([89ab09f](https://github.com/dunay2/dvt/commit/89ab09f6c8dac1a6a8eab7a8a6572dc8da9b65eb))
* Promote AuthorizationError and provider selection core exports ([39585cb](https://github.com/dunay2/dvt/commit/39585cbef4598e17e587a11b65b6adf60e394cc3))
* **security:** add issue template for THREAT_MODEL.md v1.4 update ([471e674](https://github.com/dunay2/dvt/commit/471e674b253cba24934160cc56badd326e441573))
* **state-store:** Implement issue [#6](https://github.com/dunay2/dvt/issues/6) postgres adapter foundation ([#202](https://github.com/dunay2/dvt/issues/202)) ([b112354](https://github.com/dunay2/dvt/commit/b1123545e9ef0e1e669d64519ea6a1c916553a6a))
* **temporal:** deterministic continue-as-new policy for [#15](https://github.com/dunay2/dvt/issues/15) (slice 3) ([#242](https://github.com/dunay2/dvt/issues/242)) ([084fe78](https://github.com/dunay2/dvt/commit/084fe78694ddac73c0e84ffb37993e114c1d22e9))
* **temporal:** deterministic DAG-layer scheduler slice for [#15](https://github.com/dunay2/dvt/issues/15) ([#240](https://github.com/dunay2/dvt/issues/240)) ([941670a](https://github.com/dunay2/dvt/commit/941670a944047ab9a29681b2cef433fa6c93d0d7))
* **traceability:** Govern OpenLineage facet contracts ([#415](https://github.com/dunay2/dvt/issues/415)) ([3e738e0](https://github.com/dunay2/dvt/commit/3e738e0d350b3b0318e299052824e15574930566))
* TypeScript project structure with adapter-agnostic contracts ([566f707](https://github.com/dunay2/dvt/commit/566f70746e52f2f485fa5a82966a007843da2eab)), closes [#2](https://github.com/dunay2/dvt/issues/2)
* TypeScript project structure with adapter-agnostic contracts ([#55](https://github.com/dunay2/dvt/issues/55)) ([566f707](https://github.com/dunay2/dvt/commit/566f70746e52f2f485fa5a82966a007843da2eab))
* U2 temporal lookup run ref ([#352](https://github.com/dunay2/dvt/issues/352)) ([ba0df13](https://github.com/dunay2/dvt/commit/ba0df13b5ae792177ce7417c66773ff998b0df97))


### Bug Fixes

* **adapter-postgres:** quote stale snapshot schema ([#468](https://github.com/dunay2/dvt/issues/468)) ([5d7c1d0](https://github.com/dunay2/dvt/commit/5d7c1d044d5f96c3c503e8414d08e46a1d4c0524))
* **adapters:** Corrige advertencias SonarQube y tipado ([#355](https://github.com/dunay2/dvt/issues/355)) ([d353e5a](https://github.com/dunay2/dvt/commit/d353e5a70242c641122638f1daa1542bc48b63fc))
* **adapters:** Harden outbox worker runtime lifecycle ([d2544c6](https://github.com/dunay2/dvt/commit/d2544c64484cf7c2012d154e5f2e54800cd6bd49))
* add .eslintignore to exclude test files from type-aware linting ([33b3c23](https://github.com/dunay2/dvt/commit/33b3c232a6f9e1564eeccd445a191cfe5782c01c))
* address code review feedback ([9c81f2b](https://github.com/dunay2/dvt/commit/9c81f2b08f27569175c444c059bcf082d34a62fa))
* ADR-0031 tenant isolation for adapter-postgres ([#342](https://github.com/dunay2/dvt/issues/342)) ([45a40c1](https://github.com/dunay2/dvt/commit/45a40c17469a4e9067d0618287dc69519d6a5e7a))
* agregar scripts placeholder para workflow engine y simplificar config markdownlint ([f9fec6b](https://github.com/dunay2/dvt/commit/f9fec6ba888d67ae22377bcd5ab63b4e686f0079))
* align spacing in .golden/README.md with main branch ([0e68a10](https://github.com/dunay2/dvt/commit/0e68a1047f298ad1f0014b17e2370f58c3202f6f))
* **api:** Build observability packages before API tests ([#351](https://github.com/dunay2/dvt/issues/351)) ([70793e1](https://github.com/dunay2/dvt/commit/70793e16f962a69e7a2542167e6fe8b326a1f813))
* aplicar auto-fix de markdownlint para corregir formato ([e01bc8a](https://github.com/dunay2/dvt/commit/e01bc8a7954208d9b1461afa473f59ad787a64b9))
* apply Prettier formatting to all files ([97b0e5d](https://github.com/dunay2/dvt/commit/97b0e5d56d51ed963005981bec51aacfb6cb9821))
* **ci:** Avoid incompatible Vitest ESLint plugin load ([21c5620](https://github.com/dunay2/dvt/commit/21c5620b239d298f4e8f1c21c20ebcbab228c39f))
* **ci:** Ensure contracts package is built before engine tests ([#273](https://github.com/dunay2/dvt/issues/273)) ([4851e1b](https://github.com/dunay2/dvt/commit/4851e1bf05a4e085b52e748f3abbe901ef4d0271))
* **ci:** Ensure contracts package is built before engine tests ([#281](https://github.com/dunay2/dvt/issues/281)) ([9cd8e70](https://github.com/dunay2/dvt/commit/9cd8e70b2a017e1fbc2166ba3e17d428d56c6a9e))
* **ci:** Restore @dvt/crypto resolution and normalize run context ([#337](https://github.com/dunay2/dvt/issues/337)) ([9435259](https://github.com/dunay2/dvt/commit/943525933e2ae28137d1bfc4787041cd0bda66dd))
* **ci:** Stabilize main quality checks after docs merge ([#349](https://github.com/dunay2/dvt/issues/349)) ([cb7a734](https://github.com/dunay2/dvt/commit/cb7a7348605ef53de10e781de374e73823bc86d0))
* **ci:** Use github.rest.pulls.listFiles in PR Quality Gate detect_changes step ([0676d0b](https://github.com/dunay2/dvt/commit/0676d0bc2b10d7a7b0277343480fe126e4823577))
* **contracts:** Add workflows/errors and exports ([90717b0](https://github.com/dunay2/dvt/commit/90717b0c201a8a70e6d506986a000273928b5a22))
* **contracts:** Align golden hash generator with baseline contract ([#350](https://github.com/dunay2/dvt/issues/350)) ([7a2e226](https://github.com/dunay2/dvt/commit/7a2e226104bfda2fd804b7fb893f985eb839106f))
* **contracts:** Default message param in ValidationException.fromZodError ([6891a97](https://github.com/dunay2/dvt/commit/6891a9750a943e65c3289c557c0e30e1482a67c5))
* **contracts:** Wire runtime boundary validation in active engine entry points ([#204](https://github.com/dunay2/dvt/issues/204)) ([e47e4f0](https://github.com/dunay2/dvt/commit/e47e4f00481fef2d4949af7b13db48850f61f007))
* corregir enlaces rotos en adapters y arreglar validación de contratos normativos (grep -F para búsqueda literal) ([6a63ca8](https://github.com/dunay2/dvt/commit/6a63ca8dd6cf0b4b2d27c859b43ab8499354038f))
* corregir enlaces rotos en IWorkflowEngine.v1.md (capabilities/ y extensions/ paths) ([b51b4b0](https://github.com/dunay2/dvt/commit/b51b4b0f29716c207fd6f9868254dca4526a5736))
* corregir enlaces rotos en VERSIONING.md y deshabilitar temporalmente validación TypeScript (demasiado estricta para pseudocódigo) ([0910e02](https://github.com/dunay2/dvt/commit/0910e0284b870440d24f5ca7e00f7fdbd9071216))
* corregir errores markdownlint en MIGRATION_GUIDE y CONTRIBUTING ([f03d1c1](https://github.com/dunay2/dvt/commit/f03d1c1e91abef3300d46f7f450e9d15b88fd349))
* corregir líneas &gt;120 caracteres en archivos críticos (MD013) ([9a1e258](https://github.com/dunay2/dvt/commit/9a1e25847a83ca9bd8f054a106053993c04f72a7))
* corregir MD051 y MD013 en MIGRATION_GUIDE y CONTRIBUTING ([a4e9ad4](https://github.com/dunay2/dvt/commit/a4e9ad442d03b24b4349144898ee6e1aaca7326e))
* deshabilitar reglas adicionales de markdownlint (MD003, MD009, MD012, MD034, MD036, MD051) ([07715fc](https://github.com/dunay2/dvt/commit/07715fc10d43c583057e9e395b386be67a8c7904))
* deshabilitar reglas estrictas de markdownlint (MD022, MD026, MD031, MD032, MD040, MD047, MD060) ([515848b](https://github.com/dunay2/dvt/commit/515848b6d12a6144d726585c19bc95f4d7fde7b9))
* **docs:** avoid broken-link false positive in CONTRACT_TEMPLATE.v1.md (issue [#224](https://github.com/dunay2/dvt/issues/224)) ([#246](https://github.com/dunay2/dvt/issues/246)) ([fb11ffc](https://github.com/dunay2/dvt/commit/fb11ffc4cac9e73d087c07248d6b6d7bbdb6dcdb))
* **docs:** Extract normative security invariants from THREAT_MODEL [#63](https://github.com/dunay2/dvt/issues/63) ([#64](https://github.com/dunay2/dvt/issues/64)) ([dae7055](https://github.com/dunay2/dvt/commit/dae7055b9435225a592e130f10837528d46cbf9a))
* **engine:** Add resilience hardening for WorkflowEngine ([#206](https://github.com/dunay2/dvt/issues/206)) ([ec0261a](https://github.com/dunay2/dvt/commit/ec0261af4b96a283b0bc9c3d396b88862231f73d))
* **engine:** Add timeouts and reduce signal complexity on runtime boundaries ([#205](https://github.com/dunay2/dvt/issues/205)) ([6b3493d](https://github.com/dunay2/dvt/commit/6b3493dd7afab6f951b1c00cbd946ed849b9f740))
* **engine:** Enforce ESLint import order and type grouping in validatingAdapter.test.ts ([c7ce279](https://github.com/dunay2/dvt/commit/c7ce279a7d58633da1a6d2dd929f97cded61ebc0))
* **engine:** Harden bootstrap ordering and projector transitions ([#452](https://github.com/dunay2/dvt/issues/452)) ([4a5d104](https://github.com/dunay2/dvt/commit/4a5d1042c6ba2698f7aced053f5a339ffb514f1e))
* **engine:** Harden G3 reconciler bootstrap and stabilize CI ([#360](https://github.com/dunay2/dvt/issues/360)) ([d7f07a5](https://github.com/dunay2/dvt/commit/d7f07a5d5f470fca437c2f9871e0c22f8922dbf5))
* **engine:** Harden outbox ordering and correctness ([#444](https://github.com/dunay2/dvt/issues/444)) ([8b79a98](https://github.com/dunay2/dvt/commit/8b79a980775329a3f070dda485b30496981fa7f3))
* **engine:** Inline AuthorizationError to avoid contracts entry resolution ([8c00a4d](https://github.com/dunay2/dvt/commit/8c00a4db8eed4f4973821f1f708757fce7ac475d))
* **engine:** Remove process.env defaults from provider selection ([#197](https://github.com/dunay2/dvt/issues/197)) ([c5d521a](https://github.com/dunay2/dvt/commit/c5d521a75a937bccd5eadfaa302107000b8ec8c5))
* **engine:** Robust default provider selection and reduce complexity ([#200](https://github.com/dunay2/dvt/issues/200)) ([4ddf2cc](https://github.com/dunay2/dvt/commit/4ddf2ccb5f1005ffdf8133b19f2ed7a8a0edcf16))
* **outbox:** accurate metrics + ordering ([412dbc3](https://github.com/dunay2/dvt/commit/412dbc39647eb2002438325e67a465f50c450350))
* remover cache npm del workflow y comentar enlace a Conductor EnginePolicies (no existe aún) ([b86e220](https://github.com/dunay2/dvt/commit/b86e220bfafd50c4130d3db53242c6205abaa48d))
* Resolve engine contracts path mapping to dist declarations ([#116](https://github.com/dunay2/dvt/issues/116)) ([ca59788](https://github.com/dunay2/dvt/commit/ca597886f1ed10246c0608075baeb8f1fe36fa2e))
* resolve merge conflict in .golden/README.md ([db41a99](https://github.com/dunay2/dvt/commit/db41a990bc173c8ed57be095300fb81ee1619bc4))
* simplificar reglas de markdownlint para enfoque en errores críticos ([09713be](https://github.com/dunay2/dvt/commit/09713be57a569396b71242eca96603b4e380019b))
* Stabilize auth runtime and planner changes ([#396](https://github.com/dunay2/dvt/issues/396)) ([2a39101](https://github.com/dunay2/dvt/commit/2a39101bc5d1abf9921c3e46f300d39cdbdba039))
* **state-store:** Add migration 002 for claimed_at/index parity (2026-02-19 22:49 UTC) ([#259](https://github.com/dunay2/dvt/issues/259)) ([52f6b3b](https://github.com/dunay2/dvt/commit/52f6b3b814c91e0112261772009cdac1d87c0e8c))
* **temporal:** Align logical and engine attempt semantics ([#238](https://github.com/dunay2/dvt/issues/238)) ([65d5950](https://github.com/dunay2/dvt/commit/65d59508388aed43e8e40eba085fb06acfca6440))
* **temporal:** Require explicit env injection for config loader ([#198](https://github.com/dunay2/dvt/issues/198)) ([567a835](https://github.com/dunay2/dvt/commit/567a835568c3866557f3d765a1f536ed7d5185bc))
* **temporal:** Run existing tests for integration job ([2e16418](https://github.com/dunay2/dvt/commit/2e1641800b0633c689533d20f46df48789db937f))
* update pnpm version to 9 in all workflow files ([04de73b](https://github.com/dunay2/dvt/commit/04de73bf3ac4b4571c14ae9916080b58845709eb))
* use relative paths in JSDoc references ([e5c2996](https://github.com/dunay2/dvt/commit/e5c29960d05716ce5261782122d8e3ecc00d3118))
* **validation:** make formatZodPath robust for PropertyKey[] paths ([54bfeda](https://github.com/dunay2/dvt/commit/54bfeda334cc1f1f2f0250d1acc47ffbc11938d2))

## [3.5.1](https://github.com/dunay2/dvt/compare/v3.5.0...v3.5.1) (2026-03-15)


### Bug Fixes

* **adapter-postgres:** quote stale snapshot schema ([#468](https://github.com/dunay2/dvt/issues/468)) ([5d7c1d0](https://github.com/dunay2/dvt/commit/5d7c1d044d5f96c3c503e8414d08e46a1d4c0524))

## [3.5.0](https://github.com/dunay2/dvt/compare/v3.4.1...v3.5.0) (2026-03-15)


### Features

* **engine:** Formalize snapshot recovery and startup hardening ([#459](https://github.com/dunay2/dvt/issues/459)) ([4a88b41](https://github.com/dunay2/dvt/commit/4a88b4155e0f789e0084c872330cba55f551b381))

## [3.4.1](https://github.com/dunay2/dvt/compare/v3.4.0...v3.4.1) (2026-03-14)


### Bug Fixes

* **engine:** Harden bootstrap ordering and projector transitions ([#452](https://github.com/dunay2/dvt/issues/452)) ([4a5d104](https://github.com/dunay2/dvt/commit/4a5d1042c6ba2698f7aced053f5a339ffb514f1e))

## [3.4.0](https://github.com/dunay2/dvt/compare/v3.3.2...v3.4.0) (2026-03-14)


### Features

* **adapters:** Finalize outbox worker extraction and ownership hardening ([#449](https://github.com/dunay2/dvt/issues/449)) ([88c35aa](https://github.com/dunay2/dvt/commit/88c35aa929f5ce99f4ca294349e862696683d530))

## [3.3.2](https://github.com/dunay2/dvt/compare/v3.3.1...v3.3.2) (2026-03-10)


### Bug Fixes

* **engine:** Harden outbox ordering and correctness ([#444](https://github.com/dunay2/dvt/issues/444)) ([8b79a98](https://github.com/dunay2/dvt/commit/8b79a980775329a3f070dda485b30496981fa7f3))

## [3.3.1](https://github.com/dunay2/dvt/compare/v3.3.0...v3.3.1) (2026-03-10)


### Bug Fixes

* **adapters:** Harden outbox worker runtime lifecycle ([d2544c6](https://github.com/dunay2/dvt/commit/d2544c64484cf7c2012d154e5f2e54800cd6bd49))
* **ci:** Avoid incompatible Vitest ESLint plugin load ([21c5620](https://github.com/dunay2/dvt/commit/21c5620b239d298f4e8f1c21c20ebcbab228c39f))

## [3.3.0](https://github.com/dunay2/dvt/compare/v3.2.0...v3.3.0) (2026-03-09)


### Features

* **g5:** Harden standalone outbox worker service ([#421](https://github.com/dunay2/dvt/issues/421)) ([edd4c92](https://github.com/dunay2/dvt/commit/edd4c92e03b6087dbea57f8f55b725169338d7c0))

## [3.2.0](https://github.com/dunay2/dvt/compare/v3.1.0...v3.2.0) (2026-03-08)


### Features

* **traceability:** Govern OpenLineage facet contracts ([#415](https://github.com/dunay2/dvt/issues/415)) ([3e738e0](https://github.com/dunay2/dvt/commit/3e738e0d350b3b0318e299052824e15574930566))

## [3.1.0](https://github.com/dunay2/dvt/compare/v3.0.1...v3.1.0) (2026-03-08)


### Features

* Close temporal operational observability gaps ([#400](https://github.com/dunay2/dvt/issues/400)) ([d358fd4](https://github.com/dunay2/dvt/commit/d358fd4ccdc39f1417e8e143f33fa8e0e1002742))

## [3.0.1](https://github.com/dunay2/dvt/compare/v3.0.0...v3.0.1) (2026-03-08)


### Bug Fixes

* Stabilize auth runtime and planner changes ([#396](https://github.com/dunay2/dvt/issues/396)) ([2a39101](https://github.com/dunay2/dvt/commit/2a39101bc5d1abf9921c3e46f300d39cdbdba039))

## [3.0.0](https://github.com/dunay2/dvt/compare/v2.4.9...v3.0.0) (2026-03-08)


### ⚠ BREAKING CHANGES

* **engine:** Adapters must be wrapped with ValidatingAdapter for runtime validation boundary enforcement
* **contracts:** EngineRunRef.runId now REQUIRED (was optional)

### Features

* **adapter-temporal:** Complete T4-3 compiledCodeRef propagation ([#374](https://github.com/dunay2/dvt/issues/374)) ([7f04e42](https://github.com/dunay2/dvt/commit/7f04e427e3aec4c936adfcbea46c36d50ae433c8))
* **adapters:** Add G3/G4 planning docs and initial Postgres intent store ([#356](https://github.com/dunay2/dvt/issues/356)) ([b03ab10](https://github.com/dunay2/dvt/commit/b03ab10b8ee439f97af1e307e4d2e75f41b6d73a))
* **adapters:** Implement G4 T4-4 traceability compiled-code lineage module ([#371](https://github.com/dunay2/dvt/issues/371)) ([9a55274](https://github.com/dunay2/dvt/commit/9a552745192c74861dbbbf4b15d03116096107a6))
* **adapters:** Implement PostgreSQL persistence and Issue [#6](https://github.com/dunay2/dvt/issues/6) docs ([#248](https://github.com/dunay2/dvt/issues/248)) ([1f0186b](https://github.com/dunay2/dvt/commit/1f0186b41374e67283160c3be6e40b2fd500b021))
* **adapters:** Temporal adapter implementation (core) ([cc5581b](https://github.com/dunay2/dvt/commit/cc5581bf6ad6da094101beb604e7e112a9455f6b))
* **adapters:** ValidatingAdapter MVP + tests (wrap startRun) ([4422014](https://github.com/dunay2/dvt/commit/4422014210f6a43bd5b147e6625d4b472a1496b6))
* **ci:** Add modular ARC policy traceability (ADR-0000c) ([#368](https://github.com/dunay2/dvt/issues/368)) ([35b3596](https://github.com/dunay2/dvt/commit/35b35967b66a51b9d049585b633b1c8f5344eeb9))
* **contracts:** add CanvasState v1 schema for issue [#220](https://github.com/dunay2/dvt/issues/220) ([#247](https://github.com/dunay2/dvt/issues/247)) ([79ddab1](https://github.com/dunay2/dvt/commit/79ddab1fd40829b54021aa9ef5f2ca4b35fad864))
* **contracts:** Add glossary usage validator (issue [#226](https://github.com/dunay2/dvt/issues/226)) ([#255](https://github.com/dunay2/dvt/issues/255)) ([1133257](https://github.com/dunay2/dvt/commit/1133257b8a3e0f8ee62a719b661a5e9da00c1bb2))
* **contracts:** add ProvenanceEvent v1 schema for issue [#221](https://github.com/dunay2/dvt/issues/221) ([#249](https://github.com/dunay2/dvt/issues/249)) ([6a0a9b1](https://github.com/dunay2/dvt/commit/6a0a9b1797e396d0ee1b4cec0565b1d16e4caec0))
* **contracts:** Add reference validation script (issue [#228](https://github.com/dunay2/dvt/issues/228)) ([#253](https://github.com/dunay2/dvt/issues/253)) ([785a4e4](https://github.com/dunay2/dvt/commit/785a4e433d2415859fd05dfb265183808fedc763))
* **contracts:** Add RFC2119 validator in warning mode (issue [#229](https://github.com/dunay2/dvt/issues/229)) ([#252](https://github.com/dunay2/dvt/issues/252)) ([0691798](https://github.com/dunay2/dvt/commit/069179883f3487a359ffc11e2d0bd13e94d3f17b))
* **contracts:** Add runtime validation at API boundaries using Zod ([#196](https://github.com/dunay2/dvt/issues/196)) ([f08acf6](https://github.com/dunay2/dvt/commit/f08acf639660ecc71c0d8a5075750353e829a97f))
* **contracts:** Artifact store port and typed compiled code refs ([#384](https://github.com/dunay2/dvt/issues/384)) ([2687b47](https://github.com/dunay2/dvt/commit/2687b47cd9a5575edb3d0bb0404b4c07f7f11f3b))
* **contracts:** Complete Issue [#2](https://github.com/dunay2/dvt/issues/2) contract alignment ([#65](https://github.com/dunay2/dvt/issues/65)) ([e6eb2a0](https://github.com/dunay2/dvt/commit/e6eb2a0ea8b528db0d8aa707b2177c537d69a0b6))
* **contracts:** Promote core exports and authorization error ([a756222](https://github.com/dunay2/dvt/commit/a756222ba185b60ef02aa834ca914a032e809b43))
* **contracts:** reapply PR [#234](https://github.com/dunay2/dvt/issues/234) changes on top of main ([#236](https://github.com/dunay2/dvt/issues/236)) ([8486f36](https://github.com/dunay2/dvt/commit/8486f36f9eade484cf38584ebcebf6ed72bd797b))
* **contracts:** Validate executable TypeScript examples ([#251](https://github.com/dunay2/dvt/issues/251)) ([62f1eb1](https://github.com/dunay2/dvt/commit/62f1eb1ecbc77c0fb96c9f795ec99dc93c0dcc23))
* **ddd-cqrs:** DDD/CQRS package skeletons and docs updates ([#284](https://github.com/dunay2/dvt/issues/284)) ([5229c04](https://github.com/dunay2/dvt/commit/5229c043c4689adfd3070ff383d762eb97caf3a3))
* **docs:** Normalize Decision node properties in English ([#215](https://github.com/dunay2/dvt/issues/215)) ([6d65f82](https://github.com/dunay2/dvt/commit/6d65f8239df82050d207f9fafad642210c48774c))
* **engine:** Activate workflows with v2 run events and transactional bootstrap ([#274](https://github.com/dunay2/dvt/issues/274)) ([c914d55](https://github.com/dunay2/dvt/commit/c914d55c0c83518799c5e8a7de0c97e9376aa97a))
* **engine:** Add ADR-0030 reconciliation follow-ups without regressions ([#346](https://github.com/dunay2/dvt/issues/346)) ([6c85a2e](https://github.com/dunay2/dvt/commit/6c85a2e9ac4b370c16afb31f220005f247756d7f))
* **engine:** Add provider selection and authorization error support ([38a2df2](https://github.com/dunay2/dvt/commit/38a2df255bd454ed03fbc354d1a4a99b725a42ee))
* **engine:** Enforce determinism linting for Temporal workflows ([#195](https://github.com/dunay2/dvt/issues/195)) ([f086ab0](https://github.com/dunay2/dvt/commit/f086ab02d771d5c7e58f68cba3a0869c69f79e80)), closes [#4](https://github.com/dunay2/dvt/issues/4)
* **engine:** Migrate observability and intent lifecycle to current main baseline ([#333](https://github.com/dunay2/dvt/issues/333)) ([875a806](https://github.com/dunay2/dvt/commit/875a806cd003a5fe5f9522cd71c97f341fa184c9))
* **engine:** Migrate observability and intent lifecycle to current main baseline ([#335](https://github.com/dunay2/dvt/issues/335)) ([40f031c](https://github.com/dunay2/dvt/commit/40f031ce4ad0bfbcb01ef81314b7cb14e4b6d312))
* **engine:** Promote dependsOn to shared execution plan contract ([#241](https://github.com/dunay2/dvt/issues/241)) ([7d259ae](https://github.com/dunay2/dvt/commit/7d259ae0494c2d23ac3d0f3d1fa1db1d0fc745f3))
* **engine:** robust runtime validation adapter with strict error mapping ([5b11d30](https://github.com/dunay2/dvt/commit/5b11d3069fafd8c51720d609bf7dfd450185a316))
* **planner:** Add compiledCodeRef enrichment pipeline (G4 T4.2) ([#362](https://github.com/dunay2/dvt/issues/362)) ([89ab09f](https://github.com/dunay2/dvt/commit/89ab09f6c8dac1a6a8eab7a8a6572dc8da9b65eb))
* Promote AuthorizationError and provider selection core exports ([39585cb](https://github.com/dunay2/dvt/commit/39585cbef4598e17e587a11b65b6adf60e394cc3))
* **state-store:** Implement issue [#6](https://github.com/dunay2/dvt/issues/6) postgres adapter foundation ([#202](https://github.com/dunay2/dvt/issues/202)) ([b112354](https://github.com/dunay2/dvt/commit/b1123545e9ef0e1e669d64519ea6a1c916553a6a))
* **temporal:** deterministic continue-as-new policy for [#15](https://github.com/dunay2/dvt/issues/15) (slice 3) ([#242](https://github.com/dunay2/dvt/issues/242)) ([084fe78](https://github.com/dunay2/dvt/commit/084fe78694ddac73c0e84ffb37993e114c1d22e9))
* **temporal:** deterministic DAG-layer scheduler slice for [#15](https://github.com/dunay2/dvt/issues/15) ([#240](https://github.com/dunay2/dvt/issues/240)) ([941670a](https://github.com/dunay2/dvt/commit/941670a944047ab9a29681b2cef433fa6c93d0d7))
* U2 temporal lookup run ref ([#352](https://github.com/dunay2/dvt/issues/352)) ([ba0df13](https://github.com/dunay2/dvt/commit/ba0df13b5ae792177ce7417c66773ff998b0df97))


### Bug Fixes

* **adapters:** Corrige advertencias SonarQube y tipado ([#355](https://github.com/dunay2/dvt/issues/355)) ([d353e5a](https://github.com/dunay2/dvt/commit/d353e5a70242c641122638f1daa1542bc48b63fc))
* ADR-0031 tenant isolation for adapter-postgres ([#342](https://github.com/dunay2/dvt/issues/342)) ([45a40c1](https://github.com/dunay2/dvt/commit/45a40c17469a4e9067d0618287dc69519d6a5e7a))
* **api:** Build observability packages before API tests ([#351](https://github.com/dunay2/dvt/issues/351)) ([70793e1](https://github.com/dunay2/dvt/commit/70793e16f962a69e7a2542167e6fe8b326a1f813))
* **ci:** Ensure contracts package is built before engine tests ([#273](https://github.com/dunay2/dvt/issues/273)) ([4851e1b](https://github.com/dunay2/dvt/commit/4851e1bf05a4e085b52e748f3abbe901ef4d0271))
* **ci:** Ensure contracts package is built before engine tests ([#281](https://github.com/dunay2/dvt/issues/281)) ([9cd8e70](https://github.com/dunay2/dvt/commit/9cd8e70b2a017e1fbc2166ba3e17d428d56c6a9e))
* **ci:** Restore @dvt/crypto resolution and normalize run context ([#337](https://github.com/dunay2/dvt/issues/337)) ([9435259](https://github.com/dunay2/dvt/commit/943525933e2ae28137d1bfc4787041cd0bda66dd))
* **ci:** Stabilize main quality checks after docs merge ([#349](https://github.com/dunay2/dvt/issues/349)) ([cb7a734](https://github.com/dunay2/dvt/commit/cb7a7348605ef53de10e781de374e73823bc86d0))
* **ci:** Use github.rest.pulls.listFiles in PR Quality Gate detect_changes step ([0676d0b](https://github.com/dunay2/dvt/commit/0676d0bc2b10d7a7b0277343480fe126e4823577))
* **contracts:** Add workflows/errors and exports ([90717b0](https://github.com/dunay2/dvt/commit/90717b0c201a8a70e6d506986a000273928b5a22))
* **contracts:** Align golden hash generator with baseline contract ([#350](https://github.com/dunay2/dvt/issues/350)) ([7a2e226](https://github.com/dunay2/dvt/commit/7a2e226104bfda2fd804b7fb893f985eb839106f))
* **contracts:** Default message param in ValidationException.fromZodError ([6891a97](https://github.com/dunay2/dvt/commit/6891a9750a943e65c3289c557c0e30e1482a67c5))
* **contracts:** Wire runtime boundary validation in active engine entry points ([#204](https://github.com/dunay2/dvt/issues/204)) ([e47e4f0](https://github.com/dunay2/dvt/commit/e47e4f00481fef2d4949af7b13db48850f61f007))
* **docs:** avoid broken-link false positive in CONTRACT_TEMPLATE.v1.md (issue [#224](https://github.com/dunay2/dvt/issues/224)) ([#246](https://github.com/dunay2/dvt/issues/246)) ([fb11ffc](https://github.com/dunay2/dvt/commit/fb11ffc4cac9e73d087c07248d6b6d7bbdb6dcdb))
* **engine:** Add resilience hardening for WorkflowEngine ([#206](https://github.com/dunay2/dvt/issues/206)) ([ec0261a](https://github.com/dunay2/dvt/commit/ec0261af4b96a283b0bc9c3d396b88862231f73d))
* **engine:** Add timeouts and reduce signal complexity on runtime boundaries ([#205](https://github.com/dunay2/dvt/issues/205)) ([6b3493d](https://github.com/dunay2/dvt/commit/6b3493dd7afab6f951b1c00cbd946ed849b9f740))
* **engine:** Enforce ESLint import order and type grouping in validatingAdapter.test.ts ([c7ce279](https://github.com/dunay2/dvt/commit/c7ce279a7d58633da1a6d2dd929f97cded61ebc0))
* **engine:** Harden G3 reconciler bootstrap and stabilize CI ([#360](https://github.com/dunay2/dvt/issues/360)) ([d7f07a5](https://github.com/dunay2/dvt/commit/d7f07a5d5f470fca437c2f9871e0c22f8922dbf5))
* **engine:** Inline AuthorizationError to avoid contracts entry resolution ([8c00a4d](https://github.com/dunay2/dvt/commit/8c00a4db8eed4f4973821f1f708757fce7ac475d))
* **engine:** Remove process.env defaults from provider selection ([#197](https://github.com/dunay2/dvt/issues/197)) ([c5d521a](https://github.com/dunay2/dvt/commit/c5d521a75a937bccd5eadfaa302107000b8ec8c5))
* **engine:** Robust default provider selection and reduce complexity ([#200](https://github.com/dunay2/dvt/issues/200)) ([4ddf2cc](https://github.com/dunay2/dvt/commit/4ddf2ccb5f1005ffdf8133b19f2ed7a8a0edcf16))
* Resolve engine contracts path mapping to dist declarations ([#116](https://github.com/dunay2/dvt/issues/116)) ([ca59788](https://github.com/dunay2/dvt/commit/ca597886f1ed10246c0608075baeb8f1fe36fa2e))
* **state-store:** Add migration 002 for claimed_at/index parity (2026-02-19 22:49 UTC) ([#259](https://github.com/dunay2/dvt/issues/259)) ([52f6b3b](https://github.com/dunay2/dvt/commit/52f6b3b814c91e0112261772009cdac1d87c0e8c))
* **temporal:** Align logical and engine attempt semantics ([#238](https://github.com/dunay2/dvt/issues/238)) ([65d5950](https://github.com/dunay2/dvt/commit/65d59508388aed43e8e40eba085fb06acfca6440))
* **temporal:** Require explicit env injection for config loader ([#198](https://github.com/dunay2/dvt/issues/198)) ([567a835](https://github.com/dunay2/dvt/commit/567a835568c3866557f3d765a1f536ed7d5185bc))
* **temporal:** Run existing tests for integration job ([2e16418](https://github.com/dunay2/dvt/commit/2e1641800b0633c689533d20f46df48789db937f))
* **validation:** make formatZodPath robust for PropertyKey[] paths ([54bfeda](https://github.com/dunay2/dvt/commit/54bfeda334cc1f1f2f0250d1acc47ffbc11938d2))

## [3.0.0](https://github.com/dunay2/dvt/compare/v2.4.9...v3.0.0) (2026-02-28)


### ⚠ BREAKING CHANGES

* **engine:** Adapters must be wrapped with ValidatingAdapter for runtime validation boundary enforcement
* **contracts:** EngineRunRef.runId now REQUIRED (was optional)

### Features

* **adapters:** Implement PostgreSQL persistence and Issue [#6](https://github.com/dunay2/dvt/issues/6) docs ([#248](https://github.com/dunay2/dvt/issues/248)) ([1f0186b](https://github.com/dunay2/dvt/commit/1f0186b41374e67283160c3be6e40b2fd500b021))
* **adapters:** Temporal adapter implementation (core) ([cc5581b](https://github.com/dunay2/dvt/commit/cc5581bf6ad6da094101beb604e7e112a9455f6b))
* **adapters:** ValidatingAdapter MVP + tests (wrap startRun) ([4422014](https://github.com/dunay2/dvt/commit/4422014210f6a43bd5b147e6625d4b472a1496b6))
* **contracts:** add CanvasState v1 schema for issue [#220](https://github.com/dunay2/dvt/issues/220) ([#247](https://github.com/dunay2/dvt/issues/247)) ([79ddab1](https://github.com/dunay2/dvt/commit/79ddab1fd40829b54021aa9ef5f2ca4b35fad864))
* **contracts:** Add glossary usage validator (issue [#226](https://github.com/dunay2/dvt/issues/226)) ([#255](https://github.com/dunay2/dvt/issues/255)) ([1133257](https://github.com/dunay2/dvt/commit/1133257b8a3e0f8ee62a719b661a5e9da00c1bb2))
* **contracts:** add ProvenanceEvent v1 schema for issue [#221](https://github.com/dunay2/dvt/issues/221) ([#249](https://github.com/dunay2/dvt/issues/249)) ([6a0a9b1](https://github.com/dunay2/dvt/commit/6a0a9b1797e396d0ee1b4cec0565b1d16e4caec0))
* **contracts:** Add reference validation script (issue [#228](https://github.com/dunay2/dvt/issues/228)) ([#253](https://github.com/dunay2/dvt/issues/253)) ([785a4e4](https://github.com/dunay2/dvt/commit/785a4e433d2415859fd05dfb265183808fedc763))
* **contracts:** Add RFC2119 validator in warning mode (issue [#229](https://github.com/dunay2/dvt/issues/229)) ([#252](https://github.com/dunay2/dvt/issues/252)) ([0691798](https://github.com/dunay2/dvt/commit/069179883f3487a359ffc11e2d0bd13e94d3f17b))
* **contracts:** Add runtime validation at API boundaries using Zod ([#196](https://github.com/dunay2/dvt/issues/196)) ([f08acf6](https://github.com/dunay2/dvt/commit/f08acf639660ecc71c0d8a5075750353e829a97f))
* **contracts:** Complete Issue [#2](https://github.com/dunay2/dvt/issues/2) contract alignment ([#65](https://github.com/dunay2/dvt/issues/65)) ([e6eb2a0](https://github.com/dunay2/dvt/commit/e6eb2a0ea8b528db0d8aa707b2177c537d69a0b6))
* **contracts:** Promote core exports and authorization error ([a756222](https://github.com/dunay2/dvt/commit/a756222ba185b60ef02aa834ca914a032e809b43))
* **contracts:** reapply PR [#234](https://github.com/dunay2/dvt/issues/234) changes on top of main ([#236](https://github.com/dunay2/dvt/issues/236)) ([8486f36](https://github.com/dunay2/dvt/commit/8486f36f9eade484cf38584ebcebf6ed72bd797b))
* **contracts:** Validate executable TypeScript examples ([#251](https://github.com/dunay2/dvt/issues/251)) ([62f1eb1](https://github.com/dunay2/dvt/commit/62f1eb1ecbc77c0fb96c9f795ec99dc93c0dcc23))
* **ddd-cqrs:** DDD/CQRS package skeletons and docs updates ([#284](https://github.com/dunay2/dvt/issues/284)) ([5229c04](https://github.com/dunay2/dvt/commit/5229c043c4689adfd3070ff383d762eb97caf3a3))
* **docs:** Normalize Decision node properties in English ([#215](https://github.com/dunay2/dvt/issues/215)) ([6d65f82](https://github.com/dunay2/dvt/commit/6d65f8239df82050d207f9fafad642210c48774c))
* **engine:** Activate workflows with v2 run events and transactional bootstrap ([#274](https://github.com/dunay2/dvt/issues/274)) ([c914d55](https://github.com/dunay2/dvt/commit/c914d55c0c83518799c5e8a7de0c97e9376aa97a))
* **engine:** Add provider selection and authorization error support ([38a2df2](https://github.com/dunay2/dvt/commit/38a2df255bd454ed03fbc354d1a4a99b725a42ee))
* **engine:** Enforce determinism linting for Temporal workflows ([#195](https://github.com/dunay2/dvt/issues/195)) ([f086ab0](https://github.com/dunay2/dvt/commit/f086ab02d771d5c7e58f68cba3a0869c69f79e80)), closes [#4](https://github.com/dunay2/dvt/issues/4)
* **engine:** Promote dependsOn to shared execution plan contract ([#241](https://github.com/dunay2/dvt/issues/241)) ([7d259ae](https://github.com/dunay2/dvt/commit/7d259ae0494c2d23ac3d0f3d1fa1db1d0fc745f3))
* **engine:** robust runtime validation adapter with strict error mapping ([5b11d30](https://github.com/dunay2/dvt/commit/5b11d3069fafd8c51720d609bf7dfd450185a316))
* Promote AuthorizationError and provider selection core exports ([39585cb](https://github.com/dunay2/dvt/commit/39585cbef4598e17e587a11b65b6adf60e394cc3))
* **state-store:** Implement issue [#6](https://github.com/dunay2/dvt/issues/6) postgres adapter foundation ([#202](https://github.com/dunay2/dvt/issues/202)) ([b112354](https://github.com/dunay2/dvt/commit/b1123545e9ef0e1e669d64519ea6a1c916553a6a))
* **temporal:** deterministic continue-as-new policy for [#15](https://github.com/dunay2/dvt/issues/15) (slice 3) ([#242](https://github.com/dunay2/dvt/issues/242)) ([084fe78](https://github.com/dunay2/dvt/commit/084fe78694ddac73c0e84ffb37993e114c1d22e9))
* **temporal:** deterministic DAG-layer scheduler slice for [#15](https://github.com/dunay2/dvt/issues/15) ([#240](https://github.com/dunay2/dvt/issues/240)) ([941670a](https://github.com/dunay2/dvt/commit/941670a944047ab9a29681b2cef433fa6c93d0d7))


### Bug Fixes

* **ci:** Ensure contracts package is built before engine tests ([#273](https://github.com/dunay2/dvt/issues/273)) ([4851e1b](https://github.com/dunay2/dvt/commit/4851e1bf05a4e085b52e748f3abbe901ef4d0271))
* **ci:** Ensure contracts package is built before engine tests ([#281](https://github.com/dunay2/dvt/issues/281)) ([9cd8e70](https://github.com/dunay2/dvt/commit/9cd8e70b2a017e1fbc2166ba3e17d428d56c6a9e))
* **ci:** Use github.rest.pulls.listFiles in PR Quality Gate detect_changes step ([0676d0b](https://github.com/dunay2/dvt/commit/0676d0bc2b10d7a7b0277343480fe126e4823577))
* **contracts:** Add workflows/errors and exports ([90717b0](https://github.com/dunay2/dvt/commit/90717b0c201a8a70e6d506986a000273928b5a22))
* **contracts:** Default message param in ValidationException.fromZodError ([6891a97](https://github.com/dunay2/dvt/commit/6891a9750a943e65c3289c557c0e30e1482a67c5))
* **contracts:** Wire runtime boundary validation in active engine entry points ([#204](https://github.com/dunay2/dvt/issues/204)) ([e47e4f0](https://github.com/dunay2/dvt/commit/e47e4f00481fef2d4949af7b13db48850f61f007))
* **docs:** avoid broken-link false positive in CONTRACT_TEMPLATE.v1.md (issue [#224](https://github.com/dunay2/dvt/issues/224)) ([#246](https://github.com/dunay2/dvt/issues/246)) ([fb11ffc](https://github.com/dunay2/dvt/commit/fb11ffc4cac9e73d087c07248d6b6d7bbdb6dcdb))
* **engine:** Add resilience hardening for WorkflowEngine ([#206](https://github.com/dunay2/dvt/issues/206)) ([ec0261a](https://github.com/dunay2/dvt/commit/ec0261af4b96a283b0bc9c3d396b88862231f73d))
* **engine:** Add timeouts and reduce signal complexity on runtime boundaries ([#205](https://github.com/dunay2/dvt/issues/205)) ([6b3493d](https://github.com/dunay2/dvt/commit/6b3493dd7afab6f951b1c00cbd946ed849b9f740))
* **engine:** Enforce ESLint import order and type grouping in validatingAdapter.test.ts ([c7ce279](https://github.com/dunay2/dvt/commit/c7ce279a7d58633da1a6d2dd929f97cded61ebc0))
* **engine:** Inline AuthorizationError to avoid contracts entry resolution ([8c00a4d](https://github.com/dunay2/dvt/commit/8c00a4db8eed4f4973821f1f708757fce7ac475d))
* **engine:** Remove process.env defaults from provider selection ([#197](https://github.com/dunay2/dvt/issues/197)) ([c5d521a](https://github.com/dunay2/dvt/commit/c5d521a75a937bccd5eadfaa302107000b8ec8c5))
* **engine:** Robust default provider selection and reduce complexity ([#200](https://github.com/dunay2/dvt/issues/200)) ([4ddf2cc](https://github.com/dunay2/dvt/commit/4ddf2ccb5f1005ffdf8133b19f2ed7a8a0edcf16))
* Resolve engine contracts path mapping to dist declarations ([#116](https://github.com/dunay2/dvt/issues/116)) ([ca59788](https://github.com/dunay2/dvt/commit/ca597886f1ed10246c0608075baeb8f1fe36fa2e))
* **state-store:** Add migration 002 for claimed_at/index parity (2026-02-19 22:49 UTC) ([#259](https://github.com/dunay2/dvt/issues/259)) ([52f6b3b](https://github.com/dunay2/dvt/commit/52f6b3b814c91e0112261772009cdac1d87c0e8c))
* **temporal:** Align logical and engine attempt semantics ([#238](https://github.com/dunay2/dvt/issues/238)) ([65d5950](https://github.com/dunay2/dvt/commit/65d59508388aed43e8e40eba085fb06acfca6440))
* **temporal:** Require explicit env injection for config loader ([#198](https://github.com/dunay2/dvt/issues/198)) ([567a835](https://github.com/dunay2/dvt/commit/567a835568c3866557f3d765a1f536ed7d5185bc))
* **temporal:** Run existing tests for integration job ([2e16418](https://github.com/dunay2/dvt/commit/2e1641800b0633c689533d20f46df48789db937f))
* **validation:** make formatZodPath robust for PropertyKey[] paths ([54bfeda](https://github.com/dunay2/dvt/commit/54bfeda334cc1f1f2f0250d1acc47ffbc11938d2))
