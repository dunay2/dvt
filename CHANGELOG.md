# Changelog

## [3.0.0](https://github.com/dunay2/dvt/compare/v2.4.9...v3.0.0) (2026-02-21)


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
