# Changelog

## [5.27.0](https://github.com/dunay2/dvt/compare/v5.26.0...v5.27.0) (2026-05-21)


### Features

* **web:** Add Artifacts Monaco read-only viewer ([#1293](https://github.com/dunay2/dvt/issues/1293)) ([46a90f9](https://github.com/dunay2/dvt/commit/46a90f97a01fbd21085a6982c38afe1cd4051dca))
* **web:** Converge Runs dense table tokens ([d1d7896](https://github.com/dunay2/dvt/commit/d1d7896e17292c3edcbc0a9630981cf23a04e7be))
* **web:** Enable editable Code Monaco buffer ([95fbfb3](https://github.com/dunay2/dvt/commit/95fbfb32bc693b5f775bab39b824026af8220d1c))


### Bug Fixes

* **ci:** Make local prepush mechanical ([#1295](https://github.com/dunay2/dvt/issues/1295)) ([4f8b330](https://github.com/dunay2/dvt/commit/4f8b330e81481a175980467ab37948c970d2ad4e))
* **ci:** Scope planning workflow tests in changed verification ([#1296](https://github.com/dunay2/dvt/issues/1296)) ([abf294e](https://github.com/dunay2/dvt/commit/abf294e95fd17ea79ce96f5fe096b3d3ac8c6b36))
* **docs:** Classify governed doc references in planning DB ([#1299](https://github.com/dunay2/dvt/issues/1299)) ([2b60dd2](https://github.com/dunay2/dvt/commit/2b60dd265afa6a3bab736c70a319aaa00eea62da))
* **web:** Consolidate Canvas workbench screen chrome ([#1285](https://github.com/dunay2/dvt/issues/1285)) ([68e451f](https://github.com/dunay2/dvt/commit/68e451fd46d781894825b7ef3db60ee78e033d99))
* **web:** Enable first Canvas template creation ([#1287](https://github.com/dunay2/dvt/issues/1287)) ([fdb61c5](https://github.com/dunay2/dvt/commit/fdb61c500d9caab08ad3c9e045442d97c2eb4325))
* **web:** Fix Canvas workbench menu and template actions ([#1286](https://github.com/dunay2/dvt/issues/1286)) ([00dfadf](https://github.com/dunay2/dvt/commit/00dfadf750879616e5f9ce8e0d2c2eabfd47a9b2))
* **web:** Hide workbench shell rail ([6b6bc0a](https://github.com/dunay2/dvt/commit/6b6bc0a0c3e5f47d3fb228849a0aaff5cbba2ab5))
* **web:** Separate canvas draft persistence authority ([d9e3304](https://github.com/dunay2/dvt/commit/d9e3304fd0b3343e6a54762be82863ac7787ab6d))


### Performance Improvements

* **ci:** Run exact changed web tests ([#1298](https://github.com/dunay2/dvt/issues/1298)) ([ce12b36](https://github.com/dunay2/dvt/commit/ce12b363a58c841e71dbeb3b1105605f1dc75fbc))

## [5.26.0](https://github.com/dunay2/dvt/compare/v5.25.0...v5.26.0) (2026-05-18)


### Features

* **planner:** Add architecture authority query rails ([#1257](https://github.com/dunay2/dvt/issues/1257)) ([6072b37](https://github.com/dunay2/dvt/commit/6072b37032319e33b47bf00248f7ae7d31d11e3a))
* **planner:** Add architecture component graph command rails ([#1258](https://github.com/dunay2/dvt/issues/1258)) ([705dbd1](https://github.com/dunay2/dvt/commit/705dbd1902196fdec2bc13eb9db5db5a88e02744))
* **planner:** Add architecture design create command ([#1254](https://github.com/dunay2/dvt/issues/1254)) ([485fcce](https://github.com/dunay2/dvt/commit/485fcce60ab1f5df2a1224d28e9df3ee9bd1e762))
* **planner:** Add DB-first architecture authority schema ([5ccfa81](https://github.com/dunay2/dvt/commit/5ccfa81fdea5917f43f2c44afe4e9070ec686dff))
* **web:** Add dense operational run tables ([#1276](https://github.com/dunay2/dvt/issues/1276)) ([dc3b47d](https://github.com/dunay2/dvt/commit/dc3b47df61baf45fe574ea80f49809ce0e416212))
* **web:** Add Runs status refresh policy ([16be8bc](https://github.com/dunay2/dvt/commit/16be8bc4e1c4d1233936abb18807cf39c9bf1cb9))
* **web:** Converge Runs event timeline semantics ([9dfedea](https://github.com/dunay2/dvt/commit/9dfedea3057f6ec21de2a9c58457ee8aca79ac94))
* **web:** Route web Vitest changed suites ([c83b87d](https://github.com/dunay2/dvt/commit/c83b87db4e4851bf84ab57a9ee230da7dfa3a1dd))


### Bug Fixes

* **ci:** Harden AR-C2 evidence scope and fail-closed placeholders ([#1248](https://github.com/dunay2/dvt/issues/1248)) ([d187e31](https://github.com/dunay2/dvt/commit/d187e319cf02576387188e761faa48a29693cc19))
* **planner:** Show active claim recovery in next planning tasks ([#1246](https://github.com/dunay2/dvt/issues/1246)) ([4919acc](https://github.com/dunay2/dvt/commit/4919acc52264d60a3f73f7e4e17a3fc4d5ad258a))
* **web:** Integrate local alpha and canvas view work ([2ad8941](https://github.com/dunay2/dvt/commit/2ad8941739959b7fa7021952fce04e98c6455621))

## [5.25.0](https://github.com/dunay2/dvt/compare/v5.24.0...v5.25.0) (2026-05-15)


### Features

* **api:** Hard-cut AR-C2 Prometheus SLA metrics ([#1214](https://github.com/dunay2/dvt/issues/1214)) ([692dbe9](https://github.com/dunay2/dvt/commit/692dbe9f2d3416cb443a772946cbde11845c35eb))
* **contracts:** Unify plan verifier admission matrix ([fc8f341](https://github.com/dunay2/dvt/commit/fc8f34126974028cd2026b0c0f6e33e756be8942))
* **docs:** Add component engineering schema boundary ([18709a6](https://github.com/dunay2/dvt/commit/18709a6330164f5040b1f2ee8a75a6d49f446660))
* **engine:** Add plan schema-version admission policy ([#1212](https://github.com/dunay2/dvt/issues/1212)) ([d157740](https://github.com/dunay2/dvt/commit/d15774022bd6e6081473d7e0cae57881c034bbd5))
* **planner:** Add governance component command rail ([#1216](https://github.com/dunay2/dvt/issues/1216)) ([e759281](https://github.com/dunay2/dvt/commit/e7592813a36bbe45e8ecc8d2079fd49a2b145b24))


### Bug Fixes

* **api:** Lock state-store role bundle boundary ([#1211](https://github.com/dunay2/dvt/issues/1211)) ([5a332c1](https://github.com/dunay2/dvt/commit/5a332c17c7b2ab13c4eceacfcb8c1b8d7b2894fb))
* **ci:** Align engine coverage scope with engine workspace policy ([#1245](https://github.com/dunay2/dvt/issues/1245)) ([7793e84](https://github.com/dunay2/dvt/commit/7793e84af0f8724a272f695a12f0f15721bcb1a1))
* **contracts:** Close RC-G1 contract ownership drift ([#1225](https://github.com/dunay2/dvt/issues/1225)) ([f96b55f](https://github.com/dunay2/dvt/commit/f96b55fb16cf3806cd689d48361d7ccb97f715f0))
* **docs:** Keep stale claims out of next tasks ([cf9e962](https://github.com/dunay2/dvt/commit/cf9e9624e6c4c406967105653d1403a54eafec65))
* **planner:** Route active planning claims through next tasks ([dbe8fe6](https://github.com/dunay2/dvt/commit/dbe8fe6f962af25074837c4091e9c5e446cb059c))

## [5.24.0](https://github.com/dunay2/dvt/compare/v5.23.0...v5.24.0) (2026-05-13)


### Features

* **adapters:** Add zero-downtime schema rollback compatibility ([4461592](https://github.com/dunay2/dvt/commit/4461592eb90c8440f30e8df10f28f898205789cf))
* **adapters:** Partition run events by run id hash ([74f0003](https://github.com/dunay2/dvt/commit/74f0003841ac48900325fd8c08c5e93cf333f01a))
* **docs:** Add composite component hierarchy queries ([fbb65f3](https://github.com/dunay2/dvt/commit/fbb65f3c3b4af1ea0888fba280129e151a0ef2c1))
* **docs:** Add planning knowledge document rail ([0f9e673](https://github.com/dunay2/dvt/commit/0f9e673d72200504bac46de6ac995e0149cd2c78))
* **temporal:** Route Temporal step activities by capability ([2a9910b](https://github.com/dunay2/dvt/commit/2a9910bb14f47efe7a4724d102940b876ba90d50))


### Bug Fixes

* **adapters:** Require tenant mode in Postgres RLS ([#1173](https://github.com/dunay2/dvt/issues/1173)) ([3a8d470](https://github.com/dunay2/dvt/commit/3a8d4706ecc97d3a499bb7b02984a7b0db5561ba))
* **ci:** Enforce AR-C2 immutable evidence gate ([aaf0e22](https://github.com/dunay2/dvt/commit/aaf0e22e69670c62392b0fedee4332b0d2925b81))
* **ci:** Support DB-backed governance shard gate ([c4a109f](https://github.com/dunay2/dvt/commit/c4a109ff159124d572ffc5547dad16be0b32dc13))
* **docs:** Classify review invariant references ([#1193](https://github.com/dunay2/dvt/issues/1193)) ([b3dc8ef](https://github.com/dunay2/dvt/commit/b3dc8ef047c10f90566fa0253f1268a40d3bdee9))
* **web:** Hardcut local web authority to server projections ([#1162](https://github.com/dunay2/dvt/issues/1162)) ([bb84178](https://github.com/dunay2/dvt/commit/bb841786ab18972f3fc24cbc4b7c2330b2f8787d))

## [5.23.0](https://github.com/dunay2/dvt/compare/v5.22.0...v5.23.0) (2026-05-13)


### Features

* **docs:** Add component engineering record query ([b8aeaa2](https://github.com/dunay2/dvt/commit/b8aeaa28c457b6ce57b1d3aca407d1ccb6c84cc1))
* **docs:** Add governance unit tree query ([56c3827](https://github.com/dunay2/dvt/commit/56c3827a28ae7103deef30fc4c261e4e82a82830))
* **docs:** Add planning work intake focus query ([efa59c0](https://github.com/dunay2/dvt/commit/efa59c04e9532466cf0c5d06803550bcfd83b262))
* **engine:** Add adapter call circuit breaker ([0f301b8](https://github.com/dunay2/dvt/commit/0f301b8f598bb1aa2f50ae8ac464c2fa75b9bc97))
* **planner:** Add docs resolution overlays ([#1160](https://github.com/dunay2/dvt/issues/1160)) ([cf01d8b](https://github.com/dunay2/dvt/commit/cf01d8bce6eef915c463337b7cb17179bd9cd6f3))
* **planner:** Add relational component engineering records ([c8e4af4](https://github.com/dunay2/dvt/commit/c8e4af4842a56fe098e7ed6891261ee07ead38cc))
* **web:** Add Canvas project snapshot round trip ([39719d6](https://github.com/dunay2/dvt/commit/39719d6ebc5d05dab003c4ab03dcf154943148a1))
* **web:** Hardcut mock runtime from product composition ([7bca59b](https://github.com/dunay2/dvt/commit/7bca59baadaf3c03f9c076973a432abcfed62f26))


### Bug Fixes

* **ci:** Consolidate ADR-0000 workflow ownership ([#1175](https://github.com/dunay2/dvt/issues/1175)) ([a44714a](https://github.com/dunay2/dvt/commit/a44714ada60d59af862ffbd163a440770f4b0c57))
* **docs:** Expose governed feature work query ([ee31a18](https://github.com/dunay2/dvt/commit/ee31a180b8a4cf6542cf9f026805c0425516afba))
* **docs:** Filter task gap actions by reference ([6794527](https://github.com/dunay2/dvt/commit/67945279e323a484f10aea98fbfd287e900add2d))
* **docs:** Make planning DB the operational task source ([2cabebf](https://github.com/dunay2/dvt/commit/2cabebfbc9a4e083e135dc2afeaafdeb6690db23))
* **docs:** Normalize planning DB resolution filters ([9c5ab3a](https://github.com/dunay2/dvt/commit/9c5ab3aeb1b4c79587ce96f64e6628bb598c95a8))
* **docs:** Register feature mechanization references in planning DB ([#1187](https://github.com/dunay2/dvt/issues/1187)) ([6d50a32](https://github.com/dunay2/dvt/commit/6d50a32084c0d6ae0cd9a348ec432912e47cff07))
* **docs:** Shard governance fingerprint baseline ([88ca7eb](https://github.com/dunay2/dvt/commit/88ca7ebddc192e75007f22c48eafb80c1d12c2ad))
* **planner:** Filter resolved docs issues from focus queue ([4cff75f](https://github.com/dunay2/dvt/commit/4cff75f453092c430dd89ddf01fe0b6946a19683))

## [5.22.0](https://github.com/dunay2/dvt/compare/v5.21.0...v5.22.0) (2026-05-10)


### Features

* **adapters:** Add tenant-aware outbox shard assignment ([c5e7a76](https://github.com/dunay2/dvt/commit/c5e7a760d4434296b1b1da1b21b119ac9ab54724))
* **ci:** Add governed changed-slice closeout helper ([0b2380d](https://github.com/dunay2/dvt/commit/0b2380d0e7992661dffe5ed58e30349f86896515))
* **docs:** Add DB-backed PR readiness projection ([66c958a](https://github.com/dunay2/dvt/commit/66c958a84bf44bef2364fada36e49daa0bce9f0a))
* **docs:** Add DB-backed repository command catalog ([#1147](https://github.com/dunay2/dvt/issues/1147)) ([fd7d012](https://github.com/dunay2/dvt/commit/fd7d012d483b72cf3e17f69cab30af4ee5bca157))
* **docs:** Add docs disposition query queue ([#1152](https://github.com/dunay2/dvt/issues/1152)) ([755f59f](https://github.com/dunay2/dvt/commit/755f59f9a85603ac16e2d5c475d6ca3e139dc402))
* **docs:** Add planning query store operations ([195906f](https://github.com/dunay2/dvt/commit/195906f0259907f6c8f241d2abae2eabcc1ace8e))
* **docs:** Add task provenance ledger query ([ac3fd82](https://github.com/dunay2/dvt/commit/ac3fd8280179f06a6be04c25e91efcd5cc160bdc))
* **docs:** Make planning DB the canonical source ([919048b](https://github.com/dunay2/dvt/commit/919048b8ce9adc24f344741709be8a326cf524e0))
* **planner:** Add DB-first planning task queries ([e414749](https://github.com/dunay2/dvt/commit/e4147497aabb9a58d1839c702ddaa9f244e172d7))
* **planner:** Add planning governance query store ([c9d47ac](https://github.com/dunay2/dvt/commit/c9d47ac09845b4b7e06130bf21cb5f1385ed3adc))
* **planner:** Move governance import to DB-first snapshots ([3bc4540](https://github.com/dunay2/dvt/commit/3bc45401e6f76326c241d6ffddc1adbd623b5bb2))
* **planner:** Move governance reports to DB views ([cc8058a](https://github.com/dunay2/dvt/commit/cc8058a94ba3e595b59d8ba03487fe3f0213ef44))
* **planner:** Move workboard routing to DB task views ([255a9f6](https://github.com/dunay2/dvt/commit/255a9f640305a8f846519125beb78154df9f5ce7))
* **web:** Add server-owned workspace context rail ([#1146](https://github.com/dunay2/dvt/issues/1146)) ([70786c5](https://github.com/dunay2/dvt/commit/70786c5f93672f7c12b7ddde88bfd0159f0da45a))
* **web:** Render Canvas tabs as text-only labels ([647599f](https://github.com/dunay2/dvt/commit/647599fbf3a022279458dcf4a12de55cd62ef084))
* **web:** Render shell context as read-only badge ([3d11b4e](https://github.com/dunay2/dvt/commit/3d11b4e9b6b6269637cafde5aa5e38b6ce0ebd0f))


### Bug Fixes

* **ci:** Check staged whitespace in closeout helper ([968b68c](https://github.com/dunay2/dvt/commit/968b68c8d3e8d55b8e2744742b76ebd179b4d79e))
* **ci:** Route workflow scopes through semantic emitter ([c1acc3e](https://github.com/dunay2/dvt/commit/c1acc3e5362cc45ba94b2ecc2da80e939df2236f))
* **engine:** Expose outbox sharding facade ([f25d7ca](https://github.com/dunay2/dvt/commit/f25d7ca093e8d71b3d308f373b24d61b307db589))
* **web:** Correct runs domain semantic encapsulation ([eeaa42a](https://github.com/dunay2/dvt/commit/eeaa42ab1bd532d8b491b270a34ccf6f5551d0ac))
* **web:** Harden Canvas autosave and localized chrome ([0e784c4](https://github.com/dunay2/dvt/commit/0e784c472a26c392063f16a4cc36010a6f2dbe6f))
* **web:** Make shell workspace context read-only ([4a7c65c](https://github.com/dunay2/dvt/commit/4a7c65cc17a4d6d81e794d28455b2224dcc42ee4))

## [5.21.0](https://github.com/dunay2/dvt/compare/v5.20.0...v5.21.0) (2026-05-05)


### Features

* **api:** Add code workbench workspace file rails ([#1105](https://github.com/dunay2/dvt/issues/1105)) ([112b3c9](https://github.com/dunay2/dvt/commit/112b3c912ff6bc5144158ebbeebdf8a32ac8f50e))
* **web:** Add Canvas workbench tab placement ([#1101](https://github.com/dunay2/dvt/issues/1101)) ([aa457d7](https://github.com/dunay2/dvt/commit/aa457d74410505c61ad699470e8216cdb166e5f2))
* **web:** Improve Canvas node dragging and grid controls ([#1102](https://github.com/dunay2/dvt/issues/1102)) ([c156e1f](https://github.com/dunay2/dvt/commit/c156e1fffd9dc03a3d46ca79d27e04c143fb3652))


### Bug Fixes

* **api:** Align deploy entrypoints with workspace build ([#1112](https://github.com/dunay2/dvt/issues/1112)) ([582c11c](https://github.com/dunay2/dvt/commit/582c11cb6f6445963f581602af4c10c60086ec8e))
* **ci:** Restore ADR-0000 traceability gate ([d8bac2e](https://github.com/dunay2/dvt/commit/d8bac2ec801de9fbb43a66d72de446c127c9e7fd))
* **web:** Grant workspace files in local dev stack ([#1108](https://github.com/dunay2/dvt/issues/1108)) ([8c5eee9](https://github.com/dunay2/dvt/commit/8c5eee92d5f8f35a13989f67f0984e705ed9555f))
* **web:** Keep Canvas workbench tab labels readable ([8c14e75](https://github.com/dunay2/dvt/commit/8c14e75763c48afc743765d536852dea9fbffe70))
* **web:** Keep Canvas workbench tabs readable live ([#1106](https://github.com/dunay2/dvt/issues/1106)) ([986b192](https://github.com/dunay2/dvt/commit/986b19209f8d40196e57a5c55b6e2cd45754a7a5))
* **web:** Settle public login startup gate ([#1107](https://github.com/dunay2/dvt/issues/1107)) ([27d5749](https://github.com/dunay2/dvt/commit/27d5749d06af0924dbd6ede6d7c582c4663c7b4f))

## [5.20.0](https://github.com/dunay2/dvt/compare/v5.19.0...v5.20.0) (2026-05-04)


### Features

* **web:** Add protected session gate and login route ([#1093](https://github.com/dunay2/dvt/issues/1093)) ([3b445ac](https://github.com/dunay2/dvt/commit/3b445ac79e97397558e6193737f0f6d2fa1305b8))
* **web:** Complete TF-E2-A authoring draft hard cut and debt capture ([#1087](https://github.com/dunay2/dvt/issues/1087)) ([ee4c51a](https://github.com/dunay2/dvt/commit/ee4c51a54b0dad620b124cb1a18900d17cd1af02))

## [5.19.0](https://github.com/dunay2/dvt/compare/v5.18.0...v5.19.0) (2026-05-03)


### Features

* **docs:** Add component file governance map ([#1085](https://github.com/dunay2/dvt/issues/1085)) ([5d5012f](https://github.com/dunay2/dvt/commit/5d5012f6e8fa40a2f225d94c7848363997c36009))
* **docs:** Shard governance file index ([#1084](https://github.com/dunay2/dvt/issues/1084)) ([294150c](https://github.com/dunay2/dvt/commit/294150cc16febcfa7533a08bde204e998b2c6620))
* **temporal:** Add PlanRef continuation safety ([b60fefa](https://github.com/dunay2/dvt/commit/b60fefa3e5ad5415c7396887d0bca68ffcf9d3e2))
* **web:** Add first canvas authoring live proof ([#1067](https://github.com/dunay2/dvt/issues/1067)) ([2bb02b1](https://github.com/dunay2/dvt/commit/2bb02b1b64da502ac87630dff4dc6bb8a998d69f))
* **web:** Add ready canvas node authoring ([1f224e6](https://github.com/dunay2/dvt/commit/1f224e654af0aa1353c6db9dd37fe97df9539180))
* **web:** Harden canvas authoring and command query governance ([#1061](https://github.com/dunay2/dvt/issues/1061)) ([5e2eabf](https://github.com/dunay2/dvt/commit/5e2eabf3b537e832baff9f134b327eb8b014354b))


### Bug Fixes

* **ci:** Accept normalized governance generated artifacts ([f320dcd](https://github.com/dunay2/dvt/commit/f320dcd873bfc748f3023314d0be263bd9c42bf6))
* **temporal:** Remove Temporal scoped plan dispatch legacy ([#1070](https://github.com/dunay2/dvt/issues/1070)) ([10e80b8](https://github.com/dunay2/dvt/commit/10e80b8b3f40f6fa11f415c9916d5ffda9d94daa))
* **web:** Clean Canvas static analysis warnings ([97b6a91](https://github.com/dunay2/dvt/commit/97b6a91493acf09386c89e55c0bb990bd0ccd99d))
* **web:** Close first-authoring live proof persistence ([028c15c](https://github.com/dunay2/dvt/commit/028c15c7961846429f0d4da9939ba48f524995ea))
* **web:** Harden canvas auth and layout operability ([813494f](https://github.com/dunay2/dvt/commit/813494fc5f3828411175a555c2c566d81933dc24))
* **web:** Harden startup route readiness ([6e21eff](https://github.com/dunay2/dvt/commit/6e21eff5222eca5e76cff8c345444fb838a7638e))
* **web:** Preserve frontend operator position ([6c0726a](https://github.com/dunay2/dvt/commit/6c0726a1215b25dea4df9aa7901d1d97eba1a06a))
* **web:** Stabilize native Cypress execution ([#1080](https://github.com/dunay2/dvt/issues/1080)) ([15f65de](https://github.com/dunay2/dvt/commit/15f65deb8c1f203a3f076e3dcebfc5fd6cab57b6))

## [5.18.0](https://github.com/dunay2/dvt/compare/v5.17.0...v5.18.0) (2026-04-29)


### Features

* **web:** Harden Canvas authoring lifecycle ([#1028](https://github.com/dunay2/dvt/issues/1028)) ([1122a86](https://github.com/dunay2/dvt/commit/1122a86446715cb7c0b2ff2351f7c8ed157bc0ed))


### Bug Fixes

* **adapters:** Close API tenant QA hardening gaps ([#1033](https://github.com/dunay2/dvt/issues/1033)) ([c0047ca](https://github.com/dunay2/dvt/commit/c0047ca470696ce8d7f38d809fd7214a4bbb7c80))
* **adapters:** Harden Postgres service access isolation ([#1031](https://github.com/dunay2/dvt/issues/1031)) ([c7a293c](https://github.com/dunay2/dvt/commit/c7a293c41f6cd97e032613ba1889979c1317c11d))
* **api:** Bootstrap local Temporal posture for dev app ([#1023](https://github.com/dunay2/dvt/issues/1023)) ([fe3129f](https://github.com/dunay2/dvt/commit/fe3129f832f720fd061525a036f194a2fefe230a))
* **contracts:** Hard-cut provider startRun to PlanRef ([#1025](https://github.com/dunay2/dvt/issues/1025)) ([b55e7a7](https://github.com/dunay2/dvt/commit/b55e7a7e40e9e778263ba24b5a12cab674fb3fb2))
* **contracts:** Hard-cut runtime provider vocabulary to Temporal ([#1026](https://github.com/dunay2/dvt/issues/1026)) ([49d5a98](https://github.com/dunay2/dvt/commit/49d5a98b8ca388453b9e116a893398ce384a4e17))
* **temporal:** Harden PlanRef config and startup readiness ([#1041](https://github.com/dunay2/dvt/issues/1041)) ([3eaef36](https://github.com/dunay2/dvt/commit/3eaef3638acded2e0f5d1d76f8ea6c5aa9604f3a))
* **web:** Allow shell startup through backend degradation ([#1042](https://github.com/dunay2/dvt/issues/1042)) ([f92341c](https://github.com/dunay2/dvt/commit/f92341c364b84b7737e06a50d8264345d84b8bdf))
* **web:** Close live selected-closure browser proof lane ([#1027](https://github.com/dunay2/dvt/issues/1027)) ([8eebdb0](https://github.com/dunay2/dvt/commit/8eebdb0858cdcb14399342db3b591d9b3f272782))
* **web:** Complete Canvas Fowler runtime policy hardening ([#1032](https://github.com/dunay2/dvt/issues/1032)) ([f7755b8](https://github.com/dunay2/dvt/commit/f7755b8472604b870f52e908d4317d3feae1e006))
* **web:** Preserve draft snapshot metadata ([e1c6ba2](https://github.com/dunay2/dvt/commit/e1c6ba2ef26760538680c8799323526ccb738c9b))
* **web:** Remove Canvas authoring topology drift ([#1030](https://github.com/dunay2/dvt/issues/1030)) ([98e9e62](https://github.com/dunay2/dvt/commit/98e9e62a379f860f8159ac2e652e7aaf7fb959ae))
* **web:** Resolve Canvas graph strategy drift ([#1029](https://github.com/dunay2/dvt/issues/1029)) ([e4c6702](https://github.com/dunay2/dvt/commit/e4c6702e03719142689b041c1b1f2bceaa1bfb6a))

## [5.17.0](https://github.com/dunay2/dvt/compare/v5.16.0...v5.17.0) (2026-04-24)


### Features

* **api:** Add start-run boundary and runtime composition seams ([#1006](https://github.com/dunay2/dvt/issues/1006)) ([7ebbfad](https://github.com/dunay2/dvt/commit/7ebbfadea4792058f9b5b3225c59cec24019c4ed))
* **api:** Adopt selected-closure execution planning ([#1016](https://github.com/dunay2/dvt/issues/1016)) ([210f91c](https://github.com/dunay2/dvt/commit/210f91cb5986b5dd46e9479d5cab43a10bf1030b))
* **contracts:** Add execution selection contract pack ([#1014](https://github.com/dunay2/dvt/issues/1014)) ([4c033b3](https://github.com/dunay2/dvt/commit/4c033b3437b43cfb0a55fa4be690b2ba107a3359))
* **contracts:** Add workspace authoring draft aggregate ([#1011](https://github.com/dunay2/dvt/issues/1011)) ([becc1d3](https://github.com/dunay2/dvt/commit/becc1d36566c444ada70834630bb8a2ba4d90220))


### Bug Fixes

* **api:** Componentize plan-route response translation and restore API build ([#1002](https://github.com/dunay2/dvt/issues/1002)) ([3c645d1](https://github.com/dunay2/dvt/commit/3c645d13de9158e032a7723ba33af09b571e00d8))
* **api:** Harden runtime authorization and engine seams ([#1015](https://github.com/dunay2/dvt/issues/1015)) ([d1d0193](https://github.com/dunay2/dvt/commit/d1d01932dc900615b4e965a53535f41bc2b3570c))
* **api:** Prevent client-authored start-run identity ([#1012](https://github.com/dunay2/dvt/issues/1012)) ([627f915](https://github.com/dunay2/dvt/commit/627f9155cd2611ab2d05bca5ffdad9532c962c79))
* **ci:** Restore ADR traceability gate ([#1009](https://github.com/dunay2/dvt/issues/1009)) ([fed85e9](https://github.com/dunay2/dvt/commit/fed85e9c702cf5e3a3fb57105e1f7a9913b08e08))
* **temporal:** Harden activity dependency wiring ([8e81514](https://github.com/dunay2/dvt/commit/8e8151406d5a363f01d94fbbc0b8ccbbb48971d2))
* **web:** Extend local dev auth token TTL ([#1007](https://github.com/dunay2/dvt/issues/1007)) ([7058596](https://github.com/dunay2/dvt/commit/7058596520e0f724e3291756f3c229411e6818ca))
* **web:** Resolve Sonar findings and track UX proof gaps ([#1018](https://github.com/dunay2/dvt/issues/1018)) ([6e7b983](https://github.com/dunay2/dvt/commit/6e7b983a30e7a960eb955b30825a17f4c2aa3ca7))

## [5.16.0](https://github.com/dunay2/dvt/compare/v5.15.0...v5.16.0) (2026-04-18)


### Features

* **adapters:** Add artifacts-owned S08 plan-store read-write ports ([#745](https://github.com/dunay2/dvt/issues/745)) ([6ae354a](https://github.com/dunay2/dvt/commit/6ae354ad5a91c7e1c2129564bec05c08d4b6c877))
* **adapters:** Add lineage DLQ alerting and automatic replay controls ([#672](https://github.com/dunay2/dvt/issues/672)) ([451a60f](https://github.com/dunay2/dvt/commit/451a60f6692c07095798b45ceab6af1556644bac))
* **adapters:** Add lineage runtime and worker ([#476](https://github.com/dunay2/dvt/issues/476)) ([2c895bd](https://github.com/dunay2/dvt/commit/2c895bd171c6e73465fdc73787441cc6da84161d))
* **adapters:** Alinea guards de transición y shape-checking en run-domain y adapter-postgres ([#779](https://github.com/dunay2/dvt/issues/779)) ([7c7986e](https://github.com/dunay2/dvt/commit/7c7986ee6e1537f3a0fcf5561e5db0729b163c35))
* **adapters:** Evolve Postgres plan store to three-part compatibility model ([#747](https://github.com/dunay2/dvt/issues/747)) ([efebb75](https://github.com/dunay2/dvt/commit/efebb75406b9efe6cc2baa324f3be1cd51f94f41))
* **adapters:** Pin archived terminal snapshots ([#525](https://github.com/dunay2/dvt/issues/525)) ([ef9efcf](https://github.com/dunay2/dvt/commit/ef9efcf30dd02bb3022ab9111dc5e174f1aaef6c))
* **adapters:** remove simulateError and harden intent identity ([#592](https://github.com/dunay2/dvt/issues/592)) ([ea6973d](https://github.com/dunay2/dvt/commit/ea6973d0a82c87a6e8318d1f8d18fccb604469b4))
* **adapters:** S06 + S01 — Migration version table and dead contract cleanup ([#538](https://github.com/dunay2/dvt/issues/538)) ([7c63073](https://github.com/dunay2/dvt/commit/7c63073e64163a9a1962d218c9c034664c5d9831))
* Add G7 projector worker runtime ([#487](https://github.com/dunay2/dvt/issues/487)) ([8c6f31e](https://github.com/dunay2/dvt/commit/8c6f31e276dc08f242faa3193a158f9cd4863df0))
* **api:** Add backpressure resilience envelope ([#532](https://github.com/dunay2/dvt/issues/532)) ([f0b1577](https://github.com/dunay2/dvt/commit/f0b157705450f9cb7593edc86314da6774ed46be))
* **api:** Add explicit cancel route and shared command execution ([#640](https://github.com/dunay2/dvt/issues/640)) ([f782bd4](https://github.com/dunay2/dvt/commit/f782bd4af27591fe35aa3d222c87223f31d7c731))
* **api:** Add external compile route boundary and SRP split ([#973](https://github.com/dunay2/dvt/issues/973)) ([2e79a31](https://github.com/dunay2/dvt/commit/2e79a3160a63527802284484ed042a7b8cde7db6))
* **api:** Add planner-backed stored plan start flow ([#533](https://github.com/dunay2/dvt/issues/533)) ([f960284](https://github.com/dunay2/dvt/commit/f9602845365aa0e33012bfecdfcf15b7fb12b825))
* **api:** Add protected workspace graph-draft boundary ([#969](https://github.com/dunay2/dvt/issues/969)) ([f082d77](https://github.com/dunay2/dvt/commit/f082d77b6d2680b0399a782c9600e008873e7772))
* **api:** Add raw SQL admission snapshot source ([#524](https://github.com/dunay2/dvt/issues/524)) ([6190a41](https://github.com/dunay2/dvt/commit/6190a415dacf462e7742832d8945fdedd7fe6a30))
* **api:** Add reconciler health visibility ([#564](https://github.com/dunay2/dvt/issues/564)) ([4a96f94](https://github.com/dunay2/dvt/commit/4a96f94c8e1b4bc50b180e76ce05586cd81afb56))
* **api:** Add runtime query routes and execution guards ([#517](https://github.com/dunay2/dvt/issues/517)) ([699ca7c](https://github.com/dunay2/dvt/commit/699ca7cbdfbb23d89b71373d134a9fa51bcbdb55))
* **api:** Add startRun admission foundation ([#522](https://github.com/dunay2/dvt/issues/522)) ([1c52118](https://github.com/dunay2/dvt/commit/1c52118ae16e42211650023367e6e4c0f00853cd))
* **api:** Add startRun target-adapter registry wiring ([#727](https://github.com/dunay2/dvt/issues/727)) ([c39574b](https://github.com/dunay2/dvt/commit/c39574b7df1ed9b46c0eff9cf92feb0e32da6a0b))
* **api:** Admission control operability — decision telemetry and capacity gauges ([#628](https://github.com/dunay2/dvt/issues/628)) ([af10c43](https://github.com/dunay2/dvt/commit/af10c43f50b818cd4913cf2f9397167d69128a86))
* **api:** Align preview profile contract and graph validation ([#863](https://github.com/dunay2/dvt/issues/863)) ([abd1411](https://github.com/dunay2/dvt/commit/abd1411613be6cc963c3ff148597dd9d10c6b114))
* **api:** Emit lane C SLA telemetry and align canonical manuals ([#772](https://github.com/dunay2/dvt/issues/772)) ([d952763](https://github.com/dunay2/dvt/commit/d9527637cc4a872bd31a214278395a7e3337c4c3))
* **api:** Expose run provenance linkage on status reads ([#918](https://github.com/dunay2/dvt/issues/918)) ([990d954](https://github.com/dunay2/dvt/commit/990d954b7aa968d2ac4a59f33076760107c6fab7))
* **api:** Expose run read evidence with attempt-safe diagnostics ([#883](https://github.com/dunay2/dvt/issues/883)) ([1ecdba4](https://github.com/dunay2/dvt/commit/1ecdba4603a120175157926662a3316ddf7e3aa5))
* **api:** Expose snapshot staleness in run status route ([#671](https://github.com/dunay2/dvt/issues/671)) ([8b16ee4](https://github.com/dunay2/dvt/commit/8b16ee481771ca8b5726c21bb4e18acacf4932cc))
* **api:** Harden start-run parser edges ([#570](https://github.com/dunay2/dvt/issues/570)) ([7b917fb](https://github.com/dunay2/dvt/commit/7b917fba4141e029fe516c37d810ed35028f7bd8))
* **ci:** Add AR-C2 evidence collector MVP command ([#789](https://github.com/dunay2/dvt/issues/789)) ([f6ae619](https://github.com/dunay2/dvt/commit/f6ae619f90afc7bc91564609ce4c86d6630cb47c))
* **ci:** Add shared preflight and PR log triage ([#729](https://github.com/dunay2/dvt/issues/729)) ([bdc4cd4](https://github.com/dunay2/dvt/commit/bdc4cd4a49d9e0452179e2e613ff2d348f3d7069))
* **contracts:** Adopt structured contract errors and SRP plan ([#749](https://github.com/dunay2/dvt/issues/749)) ([51b0918](https://github.com/dunay2/dvt/commit/51b091896cbb0b4f1e95b729b37fe0d7e32d4fab))
* **contracts:** Complete planner Stage 1.1 boundary canonization ([#511](https://github.com/dunay2/dvt/issues/511)) ([e3c8e24](https://github.com/dunay2/dvt/commit/e3c8e243ff9f0c3b1268e7de38c8f41bec89a5aa))
* **contracts:** Formalize shared start-run boundary ([#916](https://github.com/dunay2/dvt/issues/916)) ([83070c1](https://github.com/dunay2/dvt/commit/83070c16f61d5ccdd00a79360ae7f904987c14c0))
* **contracts:** Freeze SQL-first preview boundary ([#934](https://github.com/dunay2/dvt/issues/934)) ([1508fe8](https://github.com/dunay2/dvt/commit/1508fe868e38c5b7156a46f49961e8aaacf0983c))
* **contracts:** Freeze workspace graph-draft persistence boundary ([#968](https://github.com/dunay2/dvt/issues/968)) ([9eaad20](https://github.com/dunay2/dvt/commit/9eaad2067d645e239175c4651ac9333be796dc50))
* **contracts:** Govern execution plan versioning ([#518](https://github.com/dunay2/dvt/issues/518)) ([90f445c](https://github.com/dunay2/dvt/commit/90f445c45f52c712e2e9fe8715ff4df4a8424889))
* **contracts:** Govern step retry policy in execution plans ([#917](https://github.com/dunay2/dvt/issues/917)) ([db5e213](https://github.com/dunay2/dvt/commit/db5e213af05dacafb3dad73fa514ec5390b5e3a3))
* **docs,adapters:** Consolidate remaining value slices ([#590](https://github.com/dunay2/dvt/issues/590)) ([ea7bbc0](https://github.com/dunay2/dvt/commit/ea7bbc0bf5b9a614c63f85b1ecc26ae7687f1263))
* **engine:** Add dedicated recover-run command boundary ([#841](https://github.com/dunay2/dvt/issues/841)) ([6ca5def](https://github.com/dunay2/dvt/commit/6ca5def47c602bb2f1dcafddbf5b96927bfec48a))
* **engine:** Centralize plan integrity verification at engine entry ([#819](https://github.com/dunay2/dvt/issues/819)) ([1aab09d](https://github.com/dunay2/dvt/commit/1aab09d6ecaf50cc1a48d60a78192bdee36f995e))
* **engine:** Formalize snapshot recovery and startup hardening ([#459](https://github.com/dunay2/dvt/issues/459)) ([4a88b41](https://github.com/dunay2/dvt/commit/4a88b4155e0f789e0084c872330cba55f551b381))
* **engine:** Gobernanza y boundary público para runExecutionContextRef y StepKind ([#781](https://github.com/dunay2/dvt/issues/781)) ([2ecd044](https://github.com/dunay2/dvt/commit/2ecd044b369aa1357f58a48413022254fb5d614d))
* **engine:** Harden run execution context boundary and publish engine derivation docs ([#763](https://github.com/dunay2/dvt/issues/763)) ([f36f134](https://github.com/dunay2/dvt/commit/f36f13480d077f67a83bd2b83a758c9155dbfe74))
* **engine:** Separate retry-run recovery from step-level signals ([#840](https://github.com/dunay2/dvt/issues/840)) ([87bc79a](https://github.com/dunay2/dvt/commit/87bc79af83f339314b2aea82947e1a2eb72c8333))
* **planner:** Add manifestRef cache in PlannerFacade ([#681](https://github.com/dunay2/dvt/issues/681)) ([8c32c89](https://github.com/dunay2/dvt/commit/8c32c89d661dab1b929900367466f34e8136e414))
* **planner:** Add stepTypeConfig validation for plan verifier ([#795](https://github.com/dunay2/dvt/issues/795)) ([3d0cd66](https://github.com/dunay2/dvt/commit/3d0cd66f62c455607476bd4d710692336c3d722b))
* **planner:** Complete MW-A2 policy-first QA closure ([#800](https://github.com/dunay2/dvt/issues/800)) ([c081750](https://github.com/dunay2/dvt/commit/c0817503a1e41ab90945c3aa5c1562f3a6cba06e))
* **planner:** Generalize runtime boundaries and planner hardening ([#813](https://github.com/dunay2/dvt/issues/813)) ([a9b5043](https://github.com/dunay2/dvt/commit/a9b50435fc6271405a17ecec352fcb0fa0e33a87))
* **planner:** Generalize runtime boundaries and planner hardening ([#814](https://github.com/dunay2/dvt/issues/814)) ([f555d2a](https://github.com/dunay2/dvt/commit/f555d2ae4591cbf1cceb6bfcc4c0776571b436fc))
* **state-store:** Add archive artifact helpers ([#523](https://github.com/dunay2/dvt/issues/523)) ([065ac4d](https://github.com/dunay2/dvt/commit/065ac4d090d71ba2e07b652a3a61b1d9b1254fff))
* **state-store:** Archive export, verifier, Postgres adapter, and test coverage ([#535](https://github.com/dunay2/dvt/issues/535)) ([bac3b4c](https://github.com/dunay2/dvt/commit/bac3b4c9bbc79c035284045b75f5ab782c8510cb))
* **state-store:** G5-PR2 — Deferred deletion and restore ([#536](https://github.com/dunay2/dvt/issues/536)) ([91fa3a0](https://github.com/dunay2/dvt/commit/91fa3a0eb21e41fe2f7d5691fde62e2490928f2c))
* **state-store:** G5-PR3 — Delivery buffer retention and purge ([#540](https://github.com/dunay2/dvt/issues/540)) ([709782b](https://github.com/dunay2/dvt/commit/709782bae3e8a4abba0e9666bad18ed82e6ea4ce))
* **state-store:** S12 — Remove deprecated write paths ([#597](https://github.com/dunay2/dvt/issues/597)) ([19181b6](https://github.com/dunay2/dvt/commit/19181b60027e51e9374a9e4f60461954592735a5))
* **temporal:** Add production DBT worker host and binding hardening ([#951](https://github.com/dunay2/dvt/issues/951)) ([34669c6](https://github.com/dunay2/dvt/commit/34669c62270c7c520453543e1df9548c02f4bf71))
* **temporal:** Preserve completed step results across continue-as-new ([#596](https://github.com/dunay2/dvt/issues/596)) ([dcd9a70](https://github.com/dunay2/dvt/commit/dcd9a70fe205c2b99996f2a95923d1c89b77b041))
* **web:** Add backend health banner and retry flow ([#739](https://github.com/dunay2/dvt/issues/739)) ([e3488c8](https://github.com/dunay2/dvt/commit/e3488c834ba8d14c9b698328ccd84718a7180501))
* **web:** Add canvas palette control and restore grid visibility ([#950](https://github.com/dunay2/dvt/issues/950)) ([c36d61d](https://github.com/dunay2/dvt/commit/c36d61d98f735b137cd01ecebb1ca9eddf90cacc))
* **web:** Add explicit transformation canvas strategy mode ([#862](https://github.com/dunay2/dvt/issues/862)) ([3d91f28](https://github.com/dunay2/dvt/commit/3d91f28fedbe6f972d0ba2c646ae46b055f04876))
* **web:** Add live run console terminal ([#811](https://github.com/dunay2/dvt/issues/811)) ([c51dbe2](https://github.com/dunay2/dvt/commit/c51dbe2fc5bc78790710dbac36462ee2597fbbb5))
* **web:** Add shell health banner with retry countdown ([#740](https://github.com/dunay2/dvt/issues/740)) ([63688dd](https://github.com/dunay2/dvt/commit/63688ddde28823bd1f66ff68ca428dac8f802ebb))
* **web:** Add workspace code explorer view ([#812](https://github.com/dunay2/dvt/issues/812)) ([37ddc68](https://github.com/dunay2/dvt/commit/37ddc68a953f4414079a913576c9dfba30982852))
* **web:** Advance TF-E1 end-to-end run flow ([#845](https://github.com/dunay2/dvt/issues/845)) ([bb71527](https://github.com/dunay2/dvt/commit/bb715276f345c5975c837b04a1a8bf8eb72f7ea6))
* **web:** Close selection-scoped transformation authoring ([#958](https://github.com/dunay2/dvt/issues/958)) ([7e33d0c](https://github.com/dunay2/dvt/commit/7e33d0ce132b5dcd203cca58e1e61af8a28fbf9a))
* **web:** Compact shell chrome and canvas status ([#942](https://github.com/dunay2/dvt/issues/942)) ([717ce1e](https://github.com/dunay2/dvt/commit/717ce1e2f82661d6e12e326983e3cc8d666df965))
* **web:** Embed Monaco review surfaces and align runtime capabilities ([#809](https://github.com/dunay2/dvt/issues/809)) ([d976226](https://github.com/dunay2/dvt/commit/d9762261cd7e8e98a51747c19933a5ea1804a4b1))
* **web:** Enforce TF-E1-A node composition constraints ([#848](https://github.com/dunay2/dvt/issues/848)) ([d41badd](https://github.com/dunay2/dvt/commit/d41badd604ed1e7d3efa742514bbbb42f8a61a7d))
* **web:** Expose run execution provenance in run workspace ([#859](https://github.com/dunay2/dvt/issues/859)) ([2ac521e](https://github.com/dunay2/dvt/commit/2ac521ef5d9ef0653c62ee59deaf0548848f8c19))
* **web:** Expose transformation authoring mode in canvas toolbar ([#866](https://github.com/dunay2/dvt/issues/866)) ([6055190](https://github.com/dunay2/dvt/commit/60551903ee32f05b3fdb6e47dea5ba54470e1ef5))
* **web:** Finalize TF-E1-C result UX ([#928](https://github.com/dunay2/dvt/issues/928)) ([d2b5551](https://github.com/dunay2/dvt/commit/d2b5551c2c119ef32c930e0c97b0f98d836fa540))
* **web:** Harden canvas authoring shell flows ([#954](https://github.com/dunay2/dvt/issues/954)) ([50a8505](https://github.com/dunay2/dvt/commit/50a85054a5890125e7824509cdf8ebb19f36fb6d))
* **web:** Harden F-04 data-source service boundary and track residual risks ([#768](https://github.com/dunay2/dvt/issues/768)) ([bc7ff66](https://github.com/dunay2/dvt/commit/bc7ff665826607d228d73cb44e5d52d5cf456a4b))
* **web:** Harden transformation flow and align F-23 docs ([#817](https://github.com/dunay2/dvt/issues/817)) ([dcd46af](https://github.com/dunay2/dvt/commit/dcd46af99d7983d15f3e0a9f77bc729b4ad55638))
* **web:** Harden transformation flow and align F-23 docs ([#839](https://github.com/dunay2/dvt/issues/839)) ([72a2035](https://github.com/dunay2/dvt/commit/72a203594b5a3bee943fe544c0449d11aca6aa05))
* **web:** Normalize query key ownership for shell health and runs ([#853](https://github.com/dunay2/dvt/issues/853)) ([7d88c7c](https://github.com/dunay2/dvt/commit/7d88c7c4d1701765a35bce97c3cac9700e9ecf91))
* **web:** Persist transformation preview provenance before start-run ([#920](https://github.com/dunay2/dvt/issues/920)) ([f01f22e](https://github.com/dunay2/dvt/commit/f01f22ea96c2acd96fed01fc16983b2d22a20fff))
* **web:** Refactor canvas controller: modularización, hardening y pruebas negativas ([#780](https://github.com/dunay2/dvt/issues/780)) ([58acb0d](https://github.com/dunay2/dvt/commit/58acb0d20b04b0920f40cd36535a01e20c0e8c9c))
* **web:** Set raven loading screen and favicon ([#657](https://github.com/dunay2/dvt/issues/657)) ([81bf074](https://github.com/dunay2/dvt/commit/81bf074d47392bd9db15d17169f67de7202fb332))
* **web:** Standardize query boundaries for operator views ([#869](https://github.com/dunay2/dvt/issues/869)) ([6cbfed1](https://github.com/dunay2/dvt/commit/6cbfed1f09ca765ac38c97a5303dc1d92434c7f5))
* **web:** Surface snapshot hash in run workspace ([#844](https://github.com/dunay2/dvt/issues/844)) ([71d79ea](https://github.com/dunay2/dvt/commit/71d79ea9a88d8af04c9231bdfa9e3a10c9a867a5))


### Bug Fixes

* **adapter-postgres:** quote stale snapshot schema ([#468](https://github.com/dunay2/dvt/issues/468)) ([5d7c1d0](https://github.com/dunay2/dvt/commit/5d7c1d044d5f96c3c503e8414d08e46a1d4c0524))
* **adapters:** Align pending cancel flow and plan-store canonical persistence ([#802](https://github.com/dunay2/dvt/issues/802)) ([9cea707](https://github.com/dunay2/dvt/commit/9cea707841372fd989987e8f8b937cdb98f3cf81))
* **adapters:** Close S19-F1-C snapshot queue closure evidence ([#790](https://github.com/dunay2/dvt/issues/790)) ([358c2c6](https://github.com/dunay2/dvt/commit/358c2c65502c219e9f24f36aadd1d3fa5fcc958f))
* **adapters:** Close Sonar blockers and align adapter docs ([#645](https://github.com/dunay2/dvt/issues/645)) ([466771e](https://github.com/dunay2/dvt/commit/466771e5fed8de1186e5bc4bd2661ef5fe075010))
* **adapters:** Handle snapshot claim ownership races across queue and worker ([#698](https://github.com/dunay2/dvt/issues/698)) ([bd804e8](https://github.com/dunay2/dvt/commit/bd804e82380d881d45878377176c593ad87d90bd))
* **adapters:** Harden archive SQL and validation ([#587](https://github.com/dunay2/dvt/issues/587)) ([b59c29c](https://github.com/dunay2/dvt/commit/b59c29cca737088977fa2b02f790988b31b67ffe))
* **adapters:** Harden lineage stale-claim recovery and redaction coverage ([#647](https://github.com/dunay2/dvt/issues/647)) ([0323b54](https://github.com/dunay2/dvt/commit/0323b54af9ddc97900c236b71dffb3db486095a6))
* **adapters:** Harden outbox worker startup abort handling and add manuals ([#794](https://github.com/dunay2/dvt/issues/794)) ([e4d1848](https://github.com/dunay2/dvt/commit/e4d184888cd6d9d72d6ba72375781acd00f792ce))
* **adapters:** Harden outbox-worker cleanup error serialization ([#483](https://github.com/dunay2/dvt/issues/483)) ([d97f755](https://github.com/dunay2/dvt/commit/d97f755f08568fca0b469f9dcef0202b998d7a2a))
* **adapters:** Harden retention archive destination and object-store checks ([#666](https://github.com/dunay2/dvt/issues/666)) ([a331c7d](https://github.com/dunay2/dvt/commit/a331c7d7ff308765065abc56f8b3b1a7ff44056e))
* **adapters:** Harden snapshot retry errors and fallback polling cadence ([#736](https://github.com/dunay2/dvt/issues/736)) ([cd84eef](https://github.com/dunay2/dvt/commit/cd84eefcddf4215ab452f6d7916fc92b4a4ec39c))
* **adapters:** Make outbox claim timeout configurable ([#568](https://github.com/dunay2/dvt/issues/568)) ([f1b3b31](https://github.com/dunay2/dvt/commit/f1b3b3163401f138a19b81d8a34a3be69822dba3))
* **adapters:** Normalize Temporal not-found detection robustness ([#572](https://github.com/dunay2/dvt/issues/572)) ([f848b4a](https://github.com/dunay2/dvt/commit/f848b4a0fa6c7f1c95f8b6897f77e2c17edc9a8a))
* **adapters:** Remove stringly run metadata errors ([#712](https://github.com/dunay2/dvt/issues/712)) ([91341f1](https://github.com/dunay2/dvt/commit/91341f130d01238a48769cd052ed9608b4a2098b))
* **adapters:** Replace stale snapshot lateral scan with run event heads ([#656](https://github.com/dunay2/dvt/issues/656)) ([5942f32](https://github.com/dunay2/dvt/commit/5942f3260e7e5413a0146f2354e69f5613b6cd61))
* **adapters:** Require explicit prod opt-in for filesystem retention ([#692](https://github.com/dunay2/dvt/issues/692)) ([f42b25d](https://github.com/dunay2/dvt/commit/f42b25df633e1e3b466c82a5b726f9daceb385ff))
* **adapters:** Resolve merge conflicts for snapshot staleness ([#682](https://github.com/dunay2/dvt/issues/682)) ([8c96fbf](https://github.com/dunay2/dvt/commit/8c96fbf8d112dfce870e96894a2d88500a28bfb5))
* **adapters:** Snapshot step-activity registry for deterministic dispatch ([#846](https://github.com/dunay2/dvt/issues/846)) ([6922b49](https://github.com/dunay2/dvt/commit/6922b49fb36a1d171744a27748263eb9c33e5b0e))
* **adapters:** Tighten claim timeout and docs guards ([#576](https://github.com/dunay2/dvt/issues/576)) ([30d3907](https://github.com/dunay2/dvt/commit/30d39078030718b7bab7c8cfd61fb2e52af1c558))
* **api:** Add local dev stack startup helper and fix lineage worker build ([#939](https://github.com/dunay2/dvt/issues/939)) ([5d5ddc5](https://github.com/dunay2/dvt/commit/5d5ddc5df0b7eb23d840a277f0a1068daf8d37b1))
* **api:** Align staleness telemetry wiring and null handling ([#690](https://github.com/dunay2/dvt/issues/690)) ([17f765c](https://github.com/dunay2/dvt/commit/17f765c490befbc00585d56ad5517aba42489bab))
* **api:** Align startRun facade result contract and HTTP mapping ([#650](https://github.com/dunay2/dvt/issues/650)) ([5ce6f28](https://github.com/dunay2/dvt/commit/5ce6f2814d3e9ccfc0a71535879008daa0027567))
* **api:** Build workspace dependencies before dev startup ([#854](https://github.com/dunay2/dvt/issues/854)) ([fc4a62c](https://github.com/dunay2/dvt/commit/fc4a62c6c6ba3273ebee9684b591a5f0a188f71b))
* **api:** Decouple run-command parser error plumbing and add negative tests ([#699](https://github.com/dunay2/dvt/issues/699)) ([132202c](https://github.com/dunay2/dvt/commit/132202cf49b8766a555b96206d2dc3efd1033063))
* **api:** Delay staleness telemetry until status lookup succeeds ([#702](https://github.com/dunay2/dvt/issues/702)) ([9ade772](https://github.com/dunay2/dvt/commit/9ade77247ce0ad17ab6260cd4108c3928ab46568))
* **api:** Enforce admin RBAC on rebuild snapshot route ([#762](https://github.com/dunay2/dvt/issues/762)) ([bf7bc08](https://github.com/dunay2/dvt/commit/bf7bc08de1c89a037af387484731d97665986c53))
* **api:** Enforce explicit admin RBAC for maintenance routes ([#792](https://github.com/dunay2/dvt/issues/792)) ([92ce493](https://github.com/dunay2/dvt/commit/92ce49389bb0f35c38dad1620b96f16d17f5d12a))
* **api:** Expose snapshot staleness safely and harden boolean env parsing ([#680](https://github.com/dunay2/dvt/issues/680)) ([436eae0](https://github.com/dunay2/dvt/commit/436eae0ad3ccb63b264f562f4d2a21a683e20eff))
* **api:** Generalize run-command parser errors and reinforce Lane C operations ([#694](https://github.com/dunay2/dvt/issues/694)) ([c44c43f](https://github.com/dunay2/dvt/commit/c44c43fabab2af0d7d6f31e48a09809e6264e3ac))
* **api:** Guarantee canonical planRef payload for plan preview and import ([#801](https://github.com/dunay2/dvt/issues/801)) ([b32e25e](https://github.com/dunay2/dvt/commit/b32e25e098e3236baf9eef0ff4b291ea6e7c1751))
* **api:** Harden admin route contract coverage and task decomposition ([#764](https://github.com/dunay2/dvt/issues/764)) ([5250fcb](https://github.com/dunay2/dvt/commit/5250fcb660cc364942aff1a1570fc3e3834b1fcb))
* **api:** Harden admin route test typing and schema contract coverage ([#759](https://github.com/dunay2/dvt/issues/759)) ([1659f12](https://github.com/dunay2/dvt/commit/1659f12348ef1ac686694f8d1461e7773a0f5a28))
* **api:** Harden plan preview manifest errors and integration QA evidence ([#822](https://github.com/dunay2/dvt/issues/822)) ([1ba10f4](https://github.com/dunay2/dvt/commit/1ba10f4591f48cbc6fa54947813836a55b8b03a4))
* **api:** Harden planner-backed startRun validation and evidence ([#541](https://github.com/dunay2/dvt/issues/541)) ([6ffc260](https://github.com/dunay2/dvt/commit/6ffc260e7e60f38ae373117f1efe85cd97f6b635))
* **api:** Harden RC-D1 health runtime watchdog and QA closure ([#555](https://github.com/dunay2/dvt/issues/555)) ([681c27c](https://github.com/dunay2/dvt/commit/681c27c0131d1ebccedf5ddceb35f9661125490c))
* **api:** Harden snapshot staleness and retention integration ([#688](https://github.com/dunay2/dvt/issues/688)) ([1fb5923](https://github.com/dunay2/dvt/commit/1fb5923a66cb00574c22590504bdb8e5a1287adc))
* **api:** Make fallback writes atomic ([#583](https://github.com/dunay2/dvt/issues/583)) ([5760fcf](https://github.com/dunay2/dvt/commit/5760fcf20fdfb0b352c40ebc32fdf97b7f721a64))
* **api:** Map missing startRun adapter to 422 ([#480](https://github.com/dunay2/dvt/issues/480)) ([470d994](https://github.com/dunay2/dvt/commit/470d99468d117f7b9de335325cd6eea3f3a09c11))
* **api:** Remove legacy StepCompleted materialization payload support ([#960](https://github.com/dunay2/dvt/issues/960)) ([42a3c87](https://github.com/dunay2/dvt/commit/42a3c87daeeb5d6ef00eed60b7ef558758959bf7))
* **api:** Restore manifestRef as production planner path ([#719](https://github.com/dunay2/dvt/issues/719)) ([044a80c](https://github.com/dunay2/dvt/commit/044a80c94649c8d6b5c3538bbffe0fa80d3de34e))
* **api:** split startRun route parser ([#580](https://github.com/dunay2/dvt/issues/580)) ([8abd9d6](https://github.com/dunay2/dvt/commit/8abd9d638896d5793ceaaf57d14bdb383a04794d))
* **ci:** Harden workspace prebuild chains ([#485](https://github.com/dunay2/dvt/issues/485)) ([91fc13a](https://github.com/dunay2/dvt/commit/91fc13ac2793257d33bdca8574e556fdebb1bbc0))
* **ci:** Lock platform baseline ([#499](https://github.com/dunay2/dvt/issues/499)) ([fd8261a](https://github.com/dunay2/dvt/commit/fd8261ab78d84d2b5dda5a3db242dd0e78e1d05b))
* **ci:** Restore mainline CI traceability and test gates ([#978](https://github.com/dunay2/dvt/issues/978)) ([6c7a3a1](https://github.com/dunay2/dvt/commit/6c7a3a155f4100ab947021301fb38d44b7e2bd24))
* **ci:** Workflow correctness and efficiency improvements ([#612](https://github.com/dunay2/dvt/issues/612)) ([e2f3b7b](https://github.com/dunay2/dvt/commit/e2f3b7b607249abbc124c1be0d3094fe672e5a66))
* **contracts:** Close boundary hardening and canonicalize risk records ([#892](https://github.com/dunay2/dvt/issues/892)) ([94ca7ff](https://github.com/dunay2/dvt/commit/94ca7ff835ea62bf416ecc0d1161b5e907b94272))
* **contracts:** Harden execution plan and signal contract boundaries ([#826](https://github.com/dunay2/dvt/issues/826)) ([a7a116e](https://github.com/dunay2/dvt/commit/a7a116eb31b70e0cc795e76958fe220a8b33da21))
* **contracts:** Harden planner boundary validation ([#530](https://github.com/dunay2/dvt/issues/530)) ([a6f8e22](https://github.com/dunay2/dvt/commit/a6f8e2240f6a104e501e8990adddf9f819f0be8c))
* **contracts:** Harden S08 plan-store contract boundaries ([#741](https://github.com/dunay2/dvt/issues/741)) ([582312d](https://github.com/dunay2/dvt/commit/582312d23c373096870be944a191fb1561e17687))
* **contracts:** Version WorkflowSnapshot and rebuild stale snapshots ([#798](https://github.com/dunay2/dvt/issues/798)) ([2c41871](https://github.com/dunay2/dvt/commit/2c41871a86e490f8eecb1dbd4fff651f738b50ce))
* **deps:** Align adapter dependency graphs ([#503](https://github.com/dunay2/dvt/issues/503)) ([1775dfb](https://github.com/dunay2/dvt/commit/1775dfbb02762e08a51ab880d2d12f0930c9952f))
* **deps:** Make tslib explicit runtime helper ([#500](https://github.com/dunay2/dvt/issues/500)) ([a7e202a](https://github.com/dunay2/dvt/commit/a7e202a2ce193d9988876d383e6a43c6a49a3f5e))
* **deps:** Remove deprecated baseUrl from tsconfig chain ([#760](https://github.com/dunay2/dvt/issues/760)) ([98b7a25](https://github.com/dunay2/dvt/commit/98b7a25457f44bd7f3edf02b5d506392cb6ee5db))
* **deps:** Synchronize fix 807 on main ([#850](https://github.com/dunay2/dvt/issues/850)) ([f804109](https://github.com/dunay2/dvt/commit/f80410908defc77b59f8823c786f8c6e04b54eaa))
* **docs:** Fix docs sync drift at source ([#733](https://github.com/dunay2/dvt/issues/733)) ([4734154](https://github.com/dunay2/dvt/commit/47341545560a41f5af1478ac799e90e81617e8ac))
* **docs:** Restore RC-F1 note and PR [#605](https://github.com/dunay2/dvt/issues/605) link lost in cherry-pick ([#608](https://github.com/dunay2/dvt/issues/608)) ([0585bb6](https://github.com/dunay2/dvt/commit/0585bb6979eec822fee00d4ef398d284a0e31b4e))
* **engine:** Align trace context and provider ref semantics ([#881](https://github.com/dunay2/dvt/issues/881)) ([bda7938](https://github.com/dunay2/dvt/commit/bda7938cc72dd77cb15500c5466324c8bdcda74b))
* **engine:** Downgrade ESLint to v9 ([#720](https://github.com/dunay2/dvt/issues/720)) ([2cd2ddd](https://github.com/dunay2/dvt/commit/2cd2ddd3536a1df0f149637809ea493de0c79ad9))
* **engine:** Emit markResolved warning when metric sink fails ([#553](https://github.com/dunay2/dvt/issues/553)) ([e509b46](https://github.com/dunay2/dvt/commit/e509b462be27c2ecfc58ad4eecadadca55db2939))
* **engine:** Enforce success-only materialization reads ([#914](https://github.com/dunay2/dvt/issues/914)) ([98418ea](https://github.com/dunay2/dvt/commit/98418ea8e633b4c99ae09833f16bdcc4cdebefe3))
* **engine:** Harden markResolved observability and close RC-A5 QA findings ([#549](https://github.com/dunay2/dvt/issues/549)) ([28d8922](https://github.com/dunay2/dvt/commit/28d8922efe2edf114ad4f41cf428c4d82fc92309))
* **engine:** Harden RC-A5 markResolved observability failure handling ([#554](https://github.com/dunay2/dvt/issues/554)) ([5d891c5](https://github.com/dunay2/dvt/commit/5d891c5796abea6eeada942a4c7a1c60477ef895))
* **engine:** Harden run-event envelope payloadVersion gating ([#734](https://github.com/dunay2/dvt/issues/734)) ([3e660d5](https://github.com/dunay2/dvt/commit/3e660d52186660a531dd316f4042aeffa807f3e3))
* **engine:** Harden signal guard against stale snapshots ([#864](https://github.com/dunay2/dvt/issues/864)) ([00299a2](https://github.com/dunay2/dvt/commit/00299a2af2c802dd09ead42e391c0c1d5fe5b321))
* **engine:** Preserve step-kind registry and plan fingerprint wiring ([#815](https://github.com/dunay2/dvt/issues/815)) ([a054d3a](https://github.com/dunay2/dvt/commit/a054d3a5a4a35c93e69220d2c49c978864b23ff3))
* **engine:** Reconcile provider run id after pre-bootstrap start ([#497](https://github.com/dunay2/dvt/issues/497)) ([e356625](https://github.com/dunay2/dvt/commit/e356625c3010d1b1037233d71391204262442c4f))
* **engine:** Reinstate plan hash validation and guard Temporal start payloads ([#820](https://github.com/dunay2/dvt/issues/820)) ([6015290](https://github.com/dunay2/dvt/commit/60152907d3d44169fc0f25eb49e8fcbf7c963355))
* **engine:** Restore resolved intent observability ([#860](https://github.com/dunay2/dvt/issues/860)) ([166131e](https://github.com/dunay2/dvt/commit/166131ed7d810fb42d6540ace6464c107ecbb106))
* **engine:** Split resolved and cancelled intent reconciliation outcomes ([#858](https://github.com/dunay2/dvt/issues/858)) ([6a6b6af](https://github.com/dunay2/dvt/commit/6a6b6af8417225acfbde9be022e6fabe9c2943b3))
* **engine:** Use staleness query to avoid signal guard event scans ([#867](https://github.com/dunay2/dvt/issues/867)) ([304222e](https://github.com/dunay2/dvt/commit/304222ea15649c5e4e7009adbd014177e2364143))
* **planner:** Sort manifest node keys for deterministic graph derivation ([#843](https://github.com/dunay2/dvt/issues/843)) ([02f6ce3](https://github.com/dunay2/dvt/commit/02f6ce3933b667d1cf0113f04feb8de77082cb42))
* **planner:** Update determinism vector hash after plan version canonicalization ([#697](https://github.com/dunay2/dvt/issues/697)) ([016c95c](https://github.com/dunay2/dvt/commit/016c95c89c35a037327e467a1dbe9eaa3ce7e279))
* **planner:** Use binary manifest node ordering ([#849](https://github.com/dunay2/dvt/issues/849)) ([216534e](https://github.com/dunay2/dvt/commit/216534e4992e3d741be72f09e31fb7786f6e2a1b))
* **state-store:** Build dependency graph before tests ([#618](https://github.com/dunay2/dvt/issues/618)) ([04e3796](https://github.com/dunay2/dvt/commit/04e3796bcf39607289dc15d8249dbc8e5d88045d))
* **state-store:** Harden archive lifecycle helper validation ([#521](https://github.com/dunay2/dvt/issues/521)) ([1d5fa74](https://github.com/dunay2/dvt/commit/1d5fa746bf04f2585e1a6317273661c77e69060e))
* **state-store:** Harden archive object store adapters and lane planning updates ([#667](https://github.com/dunay2/dvt/issues/667)) ([c4222cc](https://github.com/dunay2/dvt/commit/c4222cc723631a8a0b60d46667b98d26d060b97b))
* **state-store:** Harden intent store conflict semantics ([#475](https://github.com/dunay2/dvt/issues/475)) ([a2f2883](https://github.com/dunay2/dvt/commit/a2f2883b0c7528620b0871262c837b184c1be5b7))
* **state-store:** Harden retention export idempotency and runtime abort checks ([#659](https://github.com/dunay2/dvt/issues/659)) ([651292e](https://github.com/dunay2/dvt/commit/651292e9edf35887d99fc16666a4d42e65ea2f20))
* **state-store:** Preserve migration timeout semantics ([#473](https://github.com/dunay2/dvt/issues/473)) ([88d0190](https://github.com/dunay2/dvt/commit/88d01901b2a8363c3813e43cc6e457e690bc4b7f))
* **state-store:** Protect rollback disposal and retry timestamp idempotency ([#662](https://github.com/dunay2/dvt/issues/662)) ([ad9a030](https://github.com/dunay2/dvt/commit/ad9a03051f2ab668d5dd2374454105178452f28f))
* **temporal:** Accept first PostgreSQL runtime vertical ([#935](https://github.com/dunay2/dvt/issues/935)) ([8b8d76d](https://github.com/dunay2/dvt/commit/8b8d76d216422d434ab4c336a6071ee3c336bec0))
* **temporal:** Converge native cancel provider status ([#932](https://github.com/dunay2/dvt/issues/932)) ([ddde66e](https://github.com/dunay2/dvt/commit/ddde66ec6802f01289acdedfd423801b53748963))
* **temporal:** Harden PostgreSQL proof environment lifecycle ([#936](https://github.com/dunay2/dvt/issues/936)) ([8e01c6c](https://github.com/dunay2/dvt/commit/8e01c6c2bcbb6d1ea2be1843bd2f63aedc331e2e))
* **temporal:** Harden runtime safeguards and integration reliability ([#952](https://github.com/dunay2/dvt/issues/952)) ([74d4b44](https://github.com/dunay2/dvt/commit/74d4b44d23f6e268683319920c2378a512ad9a59))
* **temporal:** Remove projection dependencies from TemporalAdapter getRunStatus ([#718](https://github.com/dunay2/dvt/issues/718)) ([e479f2a](https://github.com/dunay2/dvt/commit/e479f2a186c2ad934d9ce3f4c88b1e6ca009ad84))
* **web:** Align diff review context with severity filter ([#908](https://github.com/dunay2/dvt/issues/908)) ([99e1ca2](https://github.com/dunay2/dvt/commit/99e1ca23e3940b98967f5d2070cfe6dd9379df70))
* **web:** Align empty canvas guidance with read-only state ([#957](https://github.com/dunay2/dvt/issues/957)) ([d5c5078](https://github.com/dunay2/dvt/commit/d5c5078cc5b4636a7407762dc43125fcb282c6f9))
* **web:** Bind persisted preview hash to planRef and add Cypress coverage ([#852](https://github.com/dunay2/dvt/issues/852)) ([a7a7510](https://github.com/dunay2/dvt/commit/a7a7510d3d2ca843f148ddc195f4b21df4d0ccad))
* **web:** Close F-04 QA findings and publish manuals ([#785](https://github.com/dunay2/dvt/issues/785)) ([c94a437](https://github.com/dunay2/dvt/commit/c94a437a7dc8fff354da9f12d112513b65e061af))
* **web:** Consume run result evidence only from snapshots ([#868](https://github.com/dunay2/dvt/issues/868)) ([087c12a](https://github.com/dunay2/dvt/commit/087c12a58c430ff0616610651ade08a7312f82a5))
* **web:** Cover calendar chevron through Calendar seam ([#877](https://github.com/dunay2/dvt/issues/877)) ([db69fbd](https://github.com/dunay2/dvt/commit/db69fbd1692eaddf8196fbb3411e739ca005341d))
* **web:** Ensure app services provider wraps router globally ([#797](https://github.com/dunay2/dvt/issues/797)) ([0589750](https://github.com/dunay2/dvt/commit/0589750e03ae94e9047a435856f56e11218c86dd))
* **web:** Expose snapshot hash in run workspace view ([#851](https://github.com/dunay2/dvt/issues/851)) ([40835a1](https://github.com/dunay2/dvt/commit/40835a13487fe9afde57850619c6149227c2878f))
* **web:** Handle all react-day-picker v9 chevron orientations ([#875](https://github.com/dunay2/dvt/issues/875)) ([fd7154a](https://github.com/dunay2/dvt/commit/fd7154a2d558d02c385f91f45d5b87ab4fb74d47))
* **web:** Harden canvas read-only state handling ([#913](https://github.com/dunay2/dvt/issues/913)) ([6c5c7e2](https://github.com/dunay2/dvt/commit/6c5c7e285c0860539f68ccb1bdb456c0c6b930c1))
* **web:** Harden frontend runtime seam boundaries ([#831](https://github.com/dunay2/dvt/issues/831)) ([fcec05c](https://github.com/dunay2/dvt/commit/fcec05ce5442416d28c3149eb031a23871179e7c))
* **web:** Harden Root provider ownership guard ([#836](https://github.com/dunay2/dvt/issues/836)) ([0df3dda](https://github.com/dunay2/dvt/commit/0df3dda3a01961bf0bba2497aa707905bfe3d029))
* **web:** Harden shell startup and route readiness ([#945](https://github.com/dunay2/dvt/issues/945)) ([5c68214](https://github.com/dunay2/dvt/commit/5c682140ff02113d710e2dae7f1134c64442d60a))
* **web:** Keep shell copy English and show active surface ([#948](https://github.com/dunay2/dvt/issues/948)) ([14d581c](https://github.com/dunay2/dvt/commit/14d581ca1349019afe925860ebb2153c94c59047))
* **web:** Move app service providers to app root ([#941](https://github.com/dunay2/dvt/issues/941)) ([0c3c9b9](https://github.com/dunay2/dvt/commit/0c3c9b9330e6c1553f97c21082c2b4f2f233efc9))
* **web:** Move DVT connection rules to owning plugin ([#955](https://github.com/dunay2/dvt/issues/955)) ([f6fe6f7](https://github.com/dunay2/dvt/commit/f6fe6f7bc6d84a212335e2e65adb4ee1aa4ccecd))
* **web:** Persist shell session context safely ([#956](https://github.com/dunay2/dvt/issues/956)) ([92163d2](https://github.com/dunay2/dvt/commit/92163d29e1678ef1d1cff3feefd132c3b4af5840))
* **web:** Preserve persisted preview run-start flow ([#865](https://github.com/dunay2/dvt/issues/865)) ([c674b08](https://github.com/dunay2/dvt/commit/c674b089776cc46d06fd2a10a5202f5440ac63c0))
* **web:** Refine shell bootstrap and workspace evidence model ([#947](https://github.com/dunay2/dvt/issues/947)) ([c13a410](https://github.com/dunay2/dvt/commit/c13a410485e7878d0638112cd358726aba57bc08))
* **web:** Remove duplicate mock workspace paths ([#833](https://github.com/dunay2/dvt/issues/833)) ([a458af7](https://github.com/dunay2/dvt/commit/a458af759925c76d1dab9a25fc7399b2d80f6bb3))
* **web:** Replace deprecated PlansService usage with IPlansPort ([#961](https://github.com/dunay2/dvt/issues/961)) ([06f22f7](https://github.com/dunay2/dvt/commit/06f22f7349c9fc137a933797373e7aa9fee20fcd))
* **web:** Scope DBT run queries and mark snapshot-only focused run ([#774](https://github.com/dunay2/dvt/issues/774)) ([c3659a7](https://github.com/dunay2/dvt/commit/c3659a74d16b5f7ad9f025d729280b05d730f4eb))
* **web:** Stabilize Cypress runtime contract tests in Docker ([#825](https://github.com/dunay2/dvt/issues/825)) ([31acb84](https://github.com/dunay2/dvt/commit/31acb845b9955d81883ac114cae9f46601ac4e7a))
* **web:** Stabilize local dev stack and app services context ([#943](https://github.com/dunay2/dvt/issues/943)) ([93c17ee](https://github.com/dunay2/dvt/commit/93c17ee44b537cab0392bf1752698c76549cf76c))
* **web:** Stabilize web tests and fix kafka proposal references ([#816](https://github.com/dunay2/dvt/issues/816)) ([9f5778b](https://github.com/dunay2/dvt/commit/9f5778bf3f6030a5f0ebfef495f610b4f5dbe66b))
* **web:** Unify Raven startup bootstrap and health gating ([#946](https://github.com/dunay2/dvt/issues/946)) ([ad3afc3](https://github.com/dunay2/dvt/commit/ad3afc399a67b9e5ed2afde04f007bf4cc40f19d))
* **web:** Use provider overrides in canvas controller tests ([#838](https://github.com/dunay2/dvt/issues/838)) ([91ef77a](https://github.com/dunay2/dvt/commit/91ef77a000e3d919fb592dde3cabd0bd7c1904b9))
* Wire reconciler watchdog health degradation ([#611](https://github.com/dunay2/dvt/issues/611)) ([3d11bf0](https://github.com/dunay2/dvt/commit/3d11bf0893c289668636c2fa70a065866c7cd802))


### Performance Improvements

* **state-store:** Use incremental replay for snapshot rebuilds ([#970](https://github.com/dunay2/dvt/issues/970)) ([49c73dd](https://github.com/dunay2/dvt/commit/49c73dda4b6ccdcbfac09c0ae329d126065cf158))

## [5.15.0](https://github.com/dunay2/dvt/compare/v5.14.0...v5.15.0) (2026-04-16)


### Features

* **api:** Add protected workspace graph-draft boundary ([#969](https://github.com/dunay2/dvt/issues/969)) ([f082d77](https://github.com/dunay2/dvt/commit/f082d77b6d2680b0399a782c9600e008873e7772))
* **api:** Expose run provenance linkage on status reads ([#918](https://github.com/dunay2/dvt/issues/918)) ([990d954](https://github.com/dunay2/dvt/commit/990d954b7aa968d2ac4a59f33076760107c6fab7))
* **contracts:** Formalize shared start-run boundary ([#916](https://github.com/dunay2/dvt/issues/916)) ([83070c1](https://github.com/dunay2/dvt/commit/83070c16f61d5ccdd00a79360ae7f904987c14c0))
* **contracts:** Freeze SQL-first preview boundary ([#934](https://github.com/dunay2/dvt/issues/934)) ([1508fe8](https://github.com/dunay2/dvt/commit/1508fe868e38c5b7156a46f49961e8aaacf0983c))
* **contracts:** Freeze workspace graph-draft persistence boundary ([#968](https://github.com/dunay2/dvt/issues/968)) ([9eaad20](https://github.com/dunay2/dvt/commit/9eaad2067d645e239175c4651ac9333be796dc50))
* **contracts:** Govern step retry policy in execution plans ([#917](https://github.com/dunay2/dvt/issues/917)) ([db5e213](https://github.com/dunay2/dvt/commit/db5e213af05dacafb3dad73fa514ec5390b5e3a3))
* **temporal:** Add production DBT worker host and binding hardening ([#951](https://github.com/dunay2/dvt/issues/951)) ([34669c6](https://github.com/dunay2/dvt/commit/34669c62270c7c520453543e1df9548c02f4bf71))
* **web:** Add canvas palette control and restore grid visibility ([#950](https://github.com/dunay2/dvt/issues/950)) ([c36d61d](https://github.com/dunay2/dvt/commit/c36d61d98f735b137cd01ecebb1ca9eddf90cacc))
* **web:** Close selection-scoped transformation authoring ([#958](https://github.com/dunay2/dvt/issues/958)) ([7e33d0c](https://github.com/dunay2/dvt/commit/7e33d0ce132b5dcd203cca58e1e61af8a28fbf9a))
* **web:** Compact shell chrome and canvas status ([#942](https://github.com/dunay2/dvt/issues/942)) ([717ce1e](https://github.com/dunay2/dvt/commit/717ce1e2f82661d6e12e326983e3cc8d666df965))
* **web:** Finalize TF-E1-C result UX ([#928](https://github.com/dunay2/dvt/issues/928)) ([d2b5551](https://github.com/dunay2/dvt/commit/d2b5551c2c119ef32c930e0c97b0f98d836fa540))
* **web:** Harden canvas authoring shell flows ([#954](https://github.com/dunay2/dvt/issues/954)) ([50a8505](https://github.com/dunay2/dvt/commit/50a85054a5890125e7824509cdf8ebb19f36fb6d))
* **web:** Persist transformation preview provenance before start-run ([#920](https://github.com/dunay2/dvt/issues/920)) ([f01f22e](https://github.com/dunay2/dvt/commit/f01f22ea96c2acd96fed01fc16983b2d22a20fff))


### Bug Fixes

* **api:** Add local dev stack startup helper and fix lineage worker build ([#939](https://github.com/dunay2/dvt/issues/939)) ([5d5ddc5](https://github.com/dunay2/dvt/commit/5d5ddc5df0b7eb23d840a277f0a1068daf8d37b1))
* **api:** Remove legacy StepCompleted materialization payload support ([#960](https://github.com/dunay2/dvt/issues/960)) ([42a3c87](https://github.com/dunay2/dvt/commit/42a3c87daeeb5d6ef00eed60b7ef558758959bf7))
* **contracts:** Close boundary hardening and canonicalize risk records ([#892](https://github.com/dunay2/dvt/issues/892)) ([94ca7ff](https://github.com/dunay2/dvt/commit/94ca7ff835ea62bf416ecc0d1161b5e907b94272))
* **engine:** Enforce success-only materialization reads ([#914](https://github.com/dunay2/dvt/issues/914)) ([98418ea](https://github.com/dunay2/dvt/commit/98418ea8e633b4c99ae09833f16bdcc4cdebefe3))
* **temporal:** Accept first PostgreSQL runtime vertical ([#935](https://github.com/dunay2/dvt/issues/935)) ([8b8d76d](https://github.com/dunay2/dvt/commit/8b8d76d216422d434ab4c336a6071ee3c336bec0))
* **temporal:** Converge native cancel provider status ([#932](https://github.com/dunay2/dvt/issues/932)) ([ddde66e](https://github.com/dunay2/dvt/commit/ddde66ec6802f01289acdedfd423801b53748963))
* **temporal:** Harden PostgreSQL proof environment lifecycle ([#936](https://github.com/dunay2/dvt/issues/936)) ([8e01c6c](https://github.com/dunay2/dvt/commit/8e01c6c2bcbb6d1ea2be1843bd2f63aedc331e2e))
* **temporal:** Harden runtime safeguards and integration reliability ([#952](https://github.com/dunay2/dvt/issues/952)) ([74d4b44](https://github.com/dunay2/dvt/commit/74d4b44d23f6e268683319920c2378a512ad9a59))
* **web:** Align diff review context with severity filter ([#908](https://github.com/dunay2/dvt/issues/908)) ([99e1ca2](https://github.com/dunay2/dvt/commit/99e1ca23e3940b98967f5d2070cfe6dd9379df70))
* **web:** Align empty canvas guidance with read-only state ([#957](https://github.com/dunay2/dvt/issues/957)) ([d5c5078](https://github.com/dunay2/dvt/commit/d5c5078cc5b4636a7407762dc43125fcb282c6f9))
* **web:** Harden canvas read-only state handling ([#913](https://github.com/dunay2/dvt/issues/913)) ([6c5c7e2](https://github.com/dunay2/dvt/commit/6c5c7e285c0860539f68ccb1bdb456c0c6b930c1))
* **web:** Harden shell startup and route readiness ([#945](https://github.com/dunay2/dvt/issues/945)) ([5c68214](https://github.com/dunay2/dvt/commit/5c682140ff02113d710e2dae7f1134c64442d60a))
* **web:** Keep shell copy English and show active surface ([#948](https://github.com/dunay2/dvt/issues/948)) ([14d581c](https://github.com/dunay2/dvt/commit/14d581ca1349019afe925860ebb2153c94c59047))
* **web:** Move app service providers to app root ([#941](https://github.com/dunay2/dvt/issues/941)) ([0c3c9b9](https://github.com/dunay2/dvt/commit/0c3c9b9330e6c1553f97c21082c2b4f2f233efc9))
* **web:** Move DVT connection rules to owning plugin ([#955](https://github.com/dunay2/dvt/issues/955)) ([f6fe6f7](https://github.com/dunay2/dvt/commit/f6fe6f7bc6d84a212335e2e65adb4ee1aa4ccecd))
* **web:** Persist shell session context safely ([#956](https://github.com/dunay2/dvt/issues/956)) ([92163d2](https://github.com/dunay2/dvt/commit/92163d29e1678ef1d1cff3feefd132c3b4af5840))
* **web:** Refine shell bootstrap and workspace evidence model ([#947](https://github.com/dunay2/dvt/issues/947)) ([c13a410](https://github.com/dunay2/dvt/commit/c13a410485e7878d0638112cd358726aba57bc08))
* **web:** Replace deprecated PlansService usage with IPlansPort ([#961](https://github.com/dunay2/dvt/issues/961)) ([06f22f7](https://github.com/dunay2/dvt/commit/06f22f7349c9fc137a933797373e7aa9fee20fcd))
* **web:** Stabilize local dev stack and app services context ([#943](https://github.com/dunay2/dvt/issues/943)) ([93c17ee](https://github.com/dunay2/dvt/commit/93c17ee44b537cab0392bf1752698c76549cf76c))
* **web:** Unify Raven startup bootstrap and health gating ([#946](https://github.com/dunay2/dvt/issues/946)) ([ad3afc3](https://github.com/dunay2/dvt/commit/ad3afc399a67b9e5ed2afde04f007bf4cc40f19d))

## [5.15.0](https://github.com/dunay2/dvt/compare/v5.14.0...v5.15.0) (2026-04-13)

### Features

* **api:** Expose run provenance linkage on status reads ([#918](https://github.com/dunay2/dvt/issues/918)) ([990d954](https://github.com/dunay2/dvt/commit/990d954b7aa968d2ac4a59f33076760107c6fab7))
* **contracts:** Formalize shared start-run boundary ([#916](https://github.com/dunay2/dvt/issues/916)) ([83070c1](https://github.com/dunay2/dvt/commit/83070c16f61d5ccdd00a79360ae7f904987c14c0))
* **contracts:** Govern step retry policy in execution plans ([#917](https://github.com/dunay2/dvt/issues/917)) ([db5e213](https://github.com/dunay2/dvt/commit/db5e213af05dacafb3dad73fa514ec5390b5e3a3))
* **web:** Finalize TF-E1-C result UX ([#928](https://github.com/dunay2/dvt/issues/928)) ([d2b5551](https://github.com/dunay2/dvt/commit/d2b5551c2c119ef32c930e0c97b0f98d836fa540))
* **web:** Persist transformation preview provenance before start-run ([#920](https://github.com/dunay2/dvt/issues/920)) ([f01f22e](https://github.com/dunay2/dvt/commit/f01f22ea96c2acd96fed01fc16983b2d22a20fff))

### Bug Fixes

* **contracts:** Close boundary hardening and canonicalize risk records ([#892](https://github.com/dunay2/dvt/issues/892)) ([94ca7ff](https://github.com/dunay2/dvt/commit/94ca7ff835ea62bf416ecc0d1161b5e907b94272))
* **engine:** Enforce success-only materialization reads ([#914](https://github.com/dunay2/dvt/issues/914)) ([98418ea](https://github.com/dunay2/dvt/commit/98418ea8e633b4c99ae09833f16bdcc4cdebefe3))
* **web:** Align diff review context with severity filter ([#908](https://github.com/dunay2/dvt/issues/908)) ([99e1ca2](https://github.com/dunay2/dvt/commit/99e1ca23e3940b98967f5d2070cfe6dd9379df70))
* **web:** Harden canvas read-only state handling ([#913](https://github.com/dunay2/dvt/issues/913)) ([6c5c7e2](https://github.com/dunay2/dvt/commit/6c5c7e285c0860539f68ccb1bdb456c0c6b930c1))

## [5.14.0](https://github.com/dunay2/dvt/compare/v5.13.0...v5.14.0) (2026-04-09)

### Features

* **api:** Align preview profile contract and graph validation ([#863](https://github.com/dunay2/dvt/issues/863)) ([abd1411](https://github.com/dunay2/dvt/commit/abd1411613be6cc963c3ff148597dd9d10c6b114))
* **api:** Expose run read evidence with attempt-safe diagnostics ([#883](https://github.com/dunay2/dvt/issues/883)) ([1ecdba4](https://github.com/dunay2/dvt/commit/1ecdba4603a120175157926662a3316ddf7e3aa5))
* **web:** Add explicit transformation canvas strategy mode ([#862](https://github.com/dunay2/dvt/issues/862)) ([3d91f28](https://github.com/dunay2/dvt/commit/3d91f28fedbe6f972d0ba2c646ae46b055f04876))
* **web:** Expose run execution provenance in run workspace ([#859](https://github.com/dunay2/dvt/issues/859)) ([2ac521e](https://github.com/dunay2/dvt/commit/2ac521ef5d9ef0653c62ee59deaf0548848f8c19))
* **web:** Expose transformation authoring mode in canvas toolbar ([#866](https://github.com/dunay2/dvt/issues/866)) ([6055190](https://github.com/dunay2/dvt/commit/60551903ee32f05b3fdb6e47dea5ba54470e1ef5))
* **web:** Normalize query key ownership for shell health and runs ([#853](https://github.com/dunay2/dvt/issues/853)) ([7d88c7c](https://github.com/dunay2/dvt/commit/7d88c7c4d1701765a35bce97c3cac9700e9ecf91))
* **web:** Standardize query boundaries for operator views ([#869](https://github.com/dunay2/dvt/issues/869)) ([6cbfed1](https://github.com/dunay2/dvt/commit/6cbfed1f09ca765ac38c97a5303dc1d92434c7f5))

### Bug Fixes

* **api:** Build workspace dependencies before dev startup ([#854](https://github.com/dunay2/dvt/issues/854)) ([fc4a62c](https://github.com/dunay2/dvt/commit/fc4a62c6c6ba3273ebee9684b591a5f0a188f71b))
* **engine:** Align trace context and provider ref semantics ([#881](https://github.com/dunay2/dvt/issues/881)) ([bda7938](https://github.com/dunay2/dvt/commit/bda7938cc72dd77cb15500c5466324c8bdcda74b))
* **engine:** Harden signal guard against stale snapshots ([#864](https://github.com/dunay2/dvt/issues/864)) ([00299a2](https://github.com/dunay2/dvt/commit/00299a2af2c802dd09ead42e391c0c1d5fe5b321))
* **engine:** Restore resolved intent observability ([#860](https://github.com/dunay2/dvt/issues/860)) ([166131e](https://github.com/dunay2/dvt/commit/166131ed7d810fb42d6540ace6464c107ecbb106))
* **engine:** Split resolved and cancelled intent reconciliation outcomes ([#858](https://github.com/dunay2/dvt/issues/858)) ([6a6b6af](https://github.com/dunay2/dvt/commit/6a6b6af8417225acfbde9be022e6fabe9c2943b3))
* **engine:** Use staleness query to avoid signal guard event scans ([#867](https://github.com/dunay2/dvt/issues/867)) ([304222e](https://github.com/dunay2/dvt/commit/304222ea15649c5e4e7009adbd014177e2364143))
* **web:** Consume run result evidence only from snapshots ([#868](https://github.com/dunay2/dvt/issues/868)) ([087c12a](https://github.com/dunay2/dvt/commit/087c12a58c430ff0616610651ade08a7312f82a5))
* **web:** Cover calendar chevron through Calendar seam ([#877](https://github.com/dunay2/dvt/issues/877)) ([db69fbd](https://github.com/dunay2/dvt/commit/db69fbd1692eaddf8196fbb3411e739ca005341d))
* **web:** Handle all react-day-picker v9 chevron orientations ([#875](https://github.com/dunay2/dvt/issues/875)) ([fd7154a](https://github.com/dunay2/dvt/commit/fd7154a2d558d02c385f91f45d5b87ab4fb74d47))
* **web:** Preserve persisted preview run-start flow ([#865](https://github.com/dunay2/dvt/issues/865)) ([c674b08](https://github.com/dunay2/dvt/commit/c674b089776cc46d06fd2a10a5202f5440ac63c0))

## [5.13.0](https://github.com/dunay2/dvt/compare/v5.12.0...v5.13.0) (2026-04-08)

### Features

* **engine:** Add dedicated recover-run command boundary ([#841](https://github.com/dunay2/dvt/issues/841)) ([6ca5def](https://github.com/dunay2/dvt/commit/6ca5def47c602bb2f1dcafddbf5b96927bfec48a))
* **web:** Enforce TF-E1-A node composition constraints ([#848](https://github.com/dunay2/dvt/issues/848)) ([d41badd](https://github.com/dunay2/dvt/commit/d41badd604ed1e7d3efa742514bbbb42f8a61a7d))

### Bug Fixes

* **adapters:** Snapshot step-activity registry for deterministic dispatch ([#846](https://github.com/dunay2/dvt/issues/846)) ([6922b49](https://github.com/dunay2/dvt/commit/6922b49fb36a1d171744a27748263eb9c33e5b0e))
* **planner:** Use binary manifest node ordering ([#849](https://github.com/dunay2/dvt/issues/849)) ([216534e](https://github.com/dunay2/dvt/commit/216534e4992e3d741be72f09e31fb7786f6e2a1b))
* **web:** Bind persisted preview hash to planRef and add Cypress coverage ([#852](https://github.com/dunay2/dvt/issues/852)) ([a7a7510](https://github.com/dunay2/dvt/commit/a7a7510d3d2ca843f148ddc195f4b21df4d0ccad))
* **web:** Expose snapshot hash in run workspace view ([#851](https://github.com/dunay2/dvt/issues/851)) ([40835a1](https://github.com/dunay2/dvt/commit/40835a13487fe9afde57850619c6149227c2878f))

## [5.12.0](https://github.com/dunay2/dvt/compare/v5.11.0...v5.12.0) (2026-04-08)

### Features

* **engine:** Separate retry-run recovery from step-level signals ([#840](https://github.com/dunay2/dvt/issues/840)) ([87bc79a](https://github.com/dunay2/dvt/commit/87bc79af83f339314b2aea82947e1a2eb72c8333))
* **web:** Advance TF-E1 end-to-end run flow ([#845](https://github.com/dunay2/dvt/issues/845)) ([bb71527](https://github.com/dunay2/dvt/commit/bb715276f345c5975c837b04a1a8bf8eb72f7ea6))
* **web:** Harden transformation flow and align F-23 docs ([#839](https://github.com/dunay2/dvt/issues/839)) ([72a2035](https://github.com/dunay2/dvt/commit/72a203594b5a3bee943fe544c0449d11aca6aa05))
* **web:** Surface snapshot hash in run workspace ([#844](https://github.com/dunay2/dvt/issues/844)) ([71d79ea](https://github.com/dunay2/dvt/commit/71d79ea9a88d8af04c9231bdfa9e3a10c9a867a5))

### Bug Fixes

* **contracts:** Harden execution plan and signal contract boundaries ([#826](https://github.com/dunay2/dvt/issues/826)) ([a7a116e](https://github.com/dunay2/dvt/commit/a7a116eb31b70e0cc795e76958fe220a8b33da21))
* **planner:** Sort manifest node keys for deterministic graph derivation ([#843](https://github.com/dunay2/dvt/issues/843)) ([02f6ce3](https://github.com/dunay2/dvt/commit/02f6ce3933b667d1cf0113f04feb8de77082cb42))
* **web:** Harden frontend runtime seam boundaries ([#831](https://github.com/dunay2/dvt/issues/831)) ([fcec05c](https://github.com/dunay2/dvt/commit/fcec05ce5442416d28c3149eb031a23871179e7c))
* **web:** Harden Root provider ownership guard ([#836](https://github.com/dunay2/dvt/issues/836)) ([0df3dda](https://github.com/dunay2/dvt/commit/0df3dda3a01961bf0bba2497aa707905bfe3d029))
* **web:** Remove duplicate mock workspace paths ([#833](https://github.com/dunay2/dvt/issues/833)) ([a458af7](https://github.com/dunay2/dvt/commit/a458af759925c76d1dab9a25fc7399b2d80f6bb3))
* **web:** Use provider overrides in canvas controller tests ([#838](https://github.com/dunay2/dvt/issues/838)) ([91ef77a](https://github.com/dunay2/dvt/commit/91ef77a000e3d919fb592dde3cabd0bd7c1904b9))

## [5.11.0](https://github.com/dunay2/dvt/compare/v5.10.0...v5.11.0) (2026-04-07)

### Features

* **engine:** Centralize plan integrity verification at engine entry ([#819](https://github.com/dunay2/dvt/issues/819)) ([1aab09d](https://github.com/dunay2/dvt/commit/1aab09d6ecaf50cc1a48d60a78192bdee36f995e))
* **planner:** Generalize runtime boundaries and planner hardening ([#813](https://github.com/dunay2/dvt/issues/813)) ([a9b5043](https://github.com/dunay2/dvt/commit/a9b50435fc6271405a17ecec352fcb0fa0e33a87))
* **planner:** Generalize runtime boundaries and planner hardening ([#814](https://github.com/dunay2/dvt/issues/814)) ([f555d2a](https://github.com/dunay2/dvt/commit/f555d2ae4591cbf1cceb6bfcc4c0776571b436fc))
* **web:** Add live run console terminal ([#811](https://github.com/dunay2/dvt/issues/811)) ([c51dbe2](https://github.com/dunay2/dvt/commit/c51dbe2fc5bc78790710dbac36462ee2597fbbb5))
* **web:** Add workspace code explorer view ([#812](https://github.com/dunay2/dvt/issues/812)) ([37ddc68](https://github.com/dunay2/dvt/commit/37ddc68a953f4414079a913576c9dfba30982852))
* **web:** Embed Monaco review surfaces and align runtime capabilities ([#809](https://github.com/dunay2/dvt/issues/809)) ([d976226](https://github.com/dunay2/dvt/commit/d9762261cd7e8e98a51747c19933a5ea1804a4b1))
* **web:** Harden transformation flow and align F-23 docs ([#817](https://github.com/dunay2/dvt/issues/817)) ([dcd46af](https://github.com/dunay2/dvt/commit/dcd46af99d7983d15f3e0a9f77bc729b4ad55638))

### Bug Fixes

* **api:** Harden plan preview manifest errors and integration QA evidence ([#822](https://github.com/dunay2/dvt/issues/822)) ([1ba10f4](https://github.com/dunay2/dvt/commit/1ba10f4591f48cbc6fa54947813836a55b8b03a4))
* **engine:** Preserve step-kind registry and plan fingerprint wiring ([#815](https://github.com/dunay2/dvt/issues/815)) ([a054d3a](https://github.com/dunay2/dvt/commit/a054d3a5a4a35c93e69220d2c49c978864b23ff3))
* **engine:** Reinstate plan hash validation and guard Temporal start payloads ([#820](https://github.com/dunay2/dvt/issues/820)) ([6015290](https://github.com/dunay2/dvt/commit/60152907d3d44169fc0f25eb49e8fcbf7c963355))
* **web:** Stabilize Cypress runtime contract tests in Docker ([#825](https://github.com/dunay2/dvt/issues/825)) ([31acb84](https://github.com/dunay2/dvt/commit/31acb845b9955d81883ac114cae9f46601ac4e7a))
* **web:** Stabilize web tests and fix kafka proposal references ([#816](https://github.com/dunay2/dvt/issues/816)) ([9f5778b](https://github.com/dunay2/dvt/commit/9f5778bf3f6030a5f0ebfef495f610b4f5dbe66b))

## [5.10.0](https://github.com/dunay2/dvt/compare/v5.9.0...v5.10.0) (2026-04-05)

### Features

* **ci:** Add AR-C2 evidence collector MVP command ([#789](https://github.com/dunay2/dvt/issues/789)) ([f6ae619](https://github.com/dunay2/dvt/commit/f6ae619f90afc7bc91564609ce4c86d6630cb47c))
* **planner:** Add stepTypeConfig validation for plan verifier ([#795](https://github.com/dunay2/dvt/issues/795)) ([3d0cd66](https://github.com/dunay2/dvt/commit/3d0cd66f62c455607476bd4d710692336c3d722b))
* **planner:** Complete MW-A2 policy-first QA closure ([#800](https://github.com/dunay2/dvt/issues/800)) ([c081750](https://github.com/dunay2/dvt/commit/c0817503a1e41ab90945c3aa5c1562f3a6cba06e))

### Bug Fixes

* **adapters:** Align pending cancel flow and plan-store canonical persistence ([#802](https://github.com/dunay2/dvt/issues/802)) ([9cea707](https://github.com/dunay2/dvt/commit/9cea707841372fd989987e8f8b937cdb98f3cf81))
* **adapters:** Close S19-F1-C snapshot queue closure evidence ([#790](https://github.com/dunay2/dvt/issues/790)) ([358c2c6](https://github.com/dunay2/dvt/commit/358c2c65502c219e9f24f36aadd1d3fa5fcc958f))
* **adapters:** Harden outbox worker startup abort handling and add manuals ([#794](https://github.com/dunay2/dvt/issues/794)) ([e4d1848](https://github.com/dunay2/dvt/commit/e4d184888cd6d9d72d6ba72375781acd00f792ce))
* **api:** Enforce explicit admin RBAC for maintenance routes ([#792](https://github.com/dunay2/dvt/issues/792)) ([92ce493](https://github.com/dunay2/dvt/commit/92ce49389bb0f35c38dad1620b96f16d17f5d12a))
* **api:** Guarantee canonical planRef payload for plan preview and import ([#801](https://github.com/dunay2/dvt/issues/801)) ([b32e25e](https://github.com/dunay2/dvt/commit/b32e25e098e3236baf9eef0ff4b291ea6e7c1751))
* **contracts:** Version WorkflowSnapshot and rebuild stale snapshots ([#798](https://github.com/dunay2/dvt/issues/798)) ([2c41871](https://github.com/dunay2/dvt/commit/2c41871a86e490f8eecb1dbd4fff651f738b50ce))
* **web:** Ensure app services provider wraps router globally ([#797](https://github.com/dunay2/dvt/issues/797)) ([0589750](https://github.com/dunay2/dvt/commit/0589750e03ae94e9047a435856f56e11218c86dd))

## [5.9.0](https://github.com/dunay2/dvt/compare/v5.8.0...v5.9.0) (2026-04-04)

### Features

* **adapters:** Alinea guards de transiciÃ³n y shape-checking en run-domain y adapter-postgres ([#779](https://github.com/dunay2/dvt/issues/779)) ([7c7986e](https://github.com/dunay2/dvt/commit/7c7986ee6e1537f3a0fcf5561e5db0729b163c35))
* **api:** Emit lane C SLA telemetry and align canonical manuals ([#772](https://github.com/dunay2/dvt/issues/772)) ([d952763](https://github.com/dunay2/dvt/commit/d9527637cc4a872bd31a214278395a7e3337c4c3))
* **engine:** Gobernanza y boundary pÃºblico para runExecutionContextRef y StepKind ([#781](https://github.com/dunay2/dvt/issues/781)) ([2ecd044](https://github.com/dunay2/dvt/commit/2ecd044b369aa1357f58a48413022254fb5d614d))
* **web:** Refactor canvas controller: modularizaciÃ³n, hardening y pruebas negativas ([#780](https://github.com/dunay2/dvt/issues/780)) ([58acb0d](https://github.com/dunay2/dvt/commit/58acb0d20b04b0920f40cd36535a01e20c0e8c9c))

### Bug Fixes

* **web:** Close F-04 QA findings and publish manuals ([#785](https://github.com/dunay2/dvt/issues/785)) ([c94a437](https://github.com/dunay2/dvt/commit/c94a437a7dc8fff354da9f12d112513b65e061af))
* **web:** Scope DBT run queries and mark snapshot-only focused run ([#774](https://github.com/dunay2/dvt/issues/774)) ([c3659a7](https://github.com/dunay2/dvt/commit/c3659a74d16b5f7ad9f025d729280b05d730f4eb))

## [5.8.0](https://github.com/dunay2/dvt/compare/v5.7.0...v5.8.0) (2026-04-04)

### Features

* **adapters:** Evolve Postgres plan store to three-part compatibility model ([#747](https://github.com/dunay2/dvt/issues/747)) ([efebb75](https://github.com/dunay2/dvt/commit/efebb75406b9efe6cc2baa324f3be1cd51f94f41))
* **contracts:** Adopt structured contract errors and SRP plan ([#749](https://github.com/dunay2/dvt/issues/749)) ([51b0918](https://github.com/dunay2/dvt/commit/51b091896cbb0b4f1e95b729b37fe0d7e32d4fab))
* **engine:** Harden run execution context boundary and publish engine derivation docs ([#763](https://github.com/dunay2/dvt/issues/763)) ([f36f134](https://github.com/dunay2/dvt/commit/f36f13480d077f67a83bd2b83a758c9155dbfe74))
* **web:** Harden F-04 data-source service boundary and track residual risks ([#768](https://github.com/dunay2/dvt/issues/768)) ([bc7ff66](https://github.com/dunay2/dvt/commit/bc7ff665826607d228d73cb44e5d52d5cf456a4b))

### Bug Fixes

* **api:** Enforce admin RBAC on rebuild snapshot route ([#762](https://github.com/dunay2/dvt/issues/762)) ([bf7bc08](https://github.com/dunay2/dvt/commit/bf7bc08de1c89a037af387484731d97665986c53))
* **api:** Harden admin route contract coverage and task decomposition ([#764](https://github.com/dunay2/dvt/issues/764)) ([5250fcb](https://github.com/dunay2/dvt/commit/5250fcb660cc364942aff1a1570fc3e3834b1fcb))
* **api:** Harden admin route test typing and schema contract coverage ([#759](https://github.com/dunay2/dvt/issues/759)) ([1659f12](https://github.com/dunay2/dvt/commit/1659f12348ef1ac686694f8d1461e7773a0f5a28))
* **deps:** Remove deprecated baseUrl from tsconfig chain ([#760](https://github.com/dunay2/dvt/issues/760)) ([98b7a25](https://github.com/dunay2/dvt/commit/98b7a25457f44bd7f3edf02b5d506392cb6ee5db))

## [5.7.0](https://github.com/dunay2/dvt/compare/v5.6.0...v5.7.0) (2026-04-03)

### Features

* **adapters:** Add artifacts-owned S08 plan-store read-write ports ([#745](https://github.com/dunay2/dvt/issues/745)) ([6ae354a](https://github.com/dunay2/dvt/commit/6ae354ad5a91c7e1c2129564bec05c08d4b6c877))

## [5.6.0](https://github.com/dunay2/dvt/compare/v5.5.0...v5.6.0) (2026-04-02)

### Features

* **ci:** Add shared preflight and PR log triage ([#729](https://github.com/dunay2/dvt/issues/729)) ([bdc4cd4](https://github.com/dunay2/dvt/commit/bdc4cd4a49d9e0452179e2e613ff2d348f3d7069))
* **web:** Add backend health banner and retry flow ([#739](https://github.com/dunay2/dvt/issues/739)) ([e3488c8](https://github.com/dunay2/dvt/commit/e3488c834ba8d14c9b698328ccd84718a7180501))
* **web:** Add shell health banner with retry countdown ([#740](https://github.com/dunay2/dvt/issues/740)) ([63688dd](https://github.com/dunay2/dvt/commit/63688ddde28823bd1f66ff68ca428dac8f802ebb))

### Bug Fixes

* **adapters:** Harden snapshot retry errors and fallback polling cadence ([#736](https://github.com/dunay2/dvt/issues/736)) ([cd84eef](https://github.com/dunay2/dvt/commit/cd84eefcddf4215ab452f6d7916fc92b4a4ec39c))
* **contracts:** Harden S08 plan-store contract boundaries ([#741](https://github.com/dunay2/dvt/issues/741)) ([582312d](https://github.com/dunay2/dvt/commit/582312d23c373096870be944a191fb1561e17687))
* **docs:** Fix docs sync drift at source ([#733](https://github.com/dunay2/dvt/issues/733)) ([4734154](https://github.com/dunay2/dvt/commit/47341545560a41f5af1478ac799e90e81617e8ac))
* **engine:** Harden run-event envelope payloadVersion gating ([#734](https://github.com/dunay2/dvt/issues/734)) ([3e660d5](https://github.com/dunay2/dvt/commit/3e660d52186660a531dd316f4042aeffa807f3e3))

## [5.5.0](https://github.com/dunay2/dvt/compare/v5.4.6...v5.5.0) (2026-04-01)

### Features

* **api:** Add startRun target-adapter registry wiring ([#727](https://github.com/dunay2/dvt/issues/727)) ([c39574b](https://github.com/dunay2/dvt/commit/c39574b7df1ed9b46c0eff9cf92feb0e32da6a0b))

## [5.4.6](https://github.com/dunay2/dvt/compare/v5.4.5...v5.4.6) (2026-04-01)

### Bug Fixes

* **api:** Restore manifestRef as production planner path ([#719](https://github.com/dunay2/dvt/issues/719)) ([044a80c](https://github.com/dunay2/dvt/commit/044a80c94649c8d6b5c3538bbffe0fa80d3de34e))
* **engine:** Downgrade ESLint to v9 ([#720](https://github.com/dunay2/dvt/issues/720)) ([2cd2ddd](https://github.com/dunay2/dvt/commit/2cd2ddd3536a1df0f149637809ea493de0c79ad9))

## [5.4.5](https://github.com/dunay2/dvt/compare/v5.4.4...v5.4.5) (2026-04-01)

### Bug Fixes

* **adapters:** Remove stringly run metadata errors ([#712](https://github.com/dunay2/dvt/issues/712)) ([91341f1](https://github.com/dunay2/dvt/commit/91341f130d01238a48769cd052ed9608b4a2098b))
* **temporal:** Remove projection dependencies from TemporalAdapter getRunStatus ([#718](https://github.com/dunay2/dvt/issues/718)) ([e479f2a](https://github.com/dunay2/dvt/commit/e479f2a186c2ad934d9ce3f4c88b1e6ca009ad84))

## [5.4.4](https://github.com/dunay2/dvt/compare/v5.4.3...v5.4.4) (2026-03-31)

### Bug Fixes

* **api:** Decouple run-command parser error plumbing and add negative tests ([#699](https://github.com/dunay2/dvt/issues/699)) ([132202c](https://github.com/dunay2/dvt/commit/132202cf49b8766a555b96206d2dc3efd1033063))

## [5.4.3](https://github.com/dunay2/dvt/compare/v5.4.2...v5.4.3) (2026-03-31)

### Bug Fixes

* **api:** Delay staleness telemetry until status lookup succeeds ([#702](https://github.com/dunay2/dvt/issues/702)) ([9ade772](https://github.com/dunay2/dvt/commit/9ade77247ce0ad17ab6260cd4108c3928ab46568))

## [5.4.2](https://github.com/dunay2/dvt/compare/v5.4.1...v5.4.2) (2026-03-31)

### Bug Fixes

* **adapters:** Handle snapshot claim ownership races across queue and worker ([#698](https://github.com/dunay2/dvt/issues/698)) ([bd804e8](https://github.com/dunay2/dvt/commit/bd804e82380d881d45878377176c593ad87d90bd))
* **api:** Generalize run-command parser errors and reinforce Lane C operations ([#694](https://github.com/dunay2/dvt/issues/694)) ([c44c43f](https://github.com/dunay2/dvt/commit/c44c43fabab2af0d7d6f31e48a09809e6264e3ac))

## [5.4.1](https://github.com/dunay2/dvt/compare/v5.4.0...v5.4.1) (2026-03-30)

### Bug Fixes

* **adapters:** Require explicit prod opt-in for filesystem retention ([#692](https://github.com/dunay2/dvt/issues/692)) ([f42b25d](https://github.com/dunay2/dvt/commit/f42b25df633e1e3b466c82a5b726f9daceb385ff))
* **api:** Align staleness telemetry wiring and null handling ([#690](https://github.com/dunay2/dvt/issues/690)) ([17f765c](https://github.com/dunay2/dvt/commit/17f765c490befbc00585d56ad5517aba42489bab))
* **api:** Harden snapshot staleness and retention integration ([#688](https://github.com/dunay2/dvt/issues/688)) ([1fb5923](https://github.com/dunay2/dvt/commit/1fb5923a66cb00574c22590504bdb8e5a1287adc))

## [5.4.0](https://github.com/dunay2/dvt/compare/v5.3.0...v5.4.0) (2026-03-30)

### Features

* **api:** Expose snapshot staleness in run status route ([#671](https://github.com/dunay2/dvt/issues/671)) ([8b16ee4](https://github.com/dunay2/dvt/commit/8b16ee481771ca8b5726c21bb4e18acacf4932cc))

## [5.3.0](https://github.com/dunay2/dvt/compare/v5.2.0...v5.3.0) (2026-03-30)

### Features

* **planner:** Add manifestRef cache in PlannerFacade ([#681](https://github.com/dunay2/dvt/issues/681)) ([8c32c89](https://github.com/dunay2/dvt/commit/8c32c89d661dab1b929900367466f34e8136e414))

### Bug Fixes

* **adapters:** Resolve merge conflicts for snapshot staleness ([#682](https://github.com/dunay2/dvt/issues/682)) ([8c96fbf](https://github.com/dunay2/dvt/commit/8c96fbf8d112dfce870e96894a2d88500a28bfb5))
* **api:** Expose snapshot staleness safely and harden boolean env parsing ([#680](https://github.com/dunay2/dvt/issues/680)) ([436eae0](https://github.com/dunay2/dvt/commit/436eae0ad3ccb63b264f562f4d2a21a683e20eff))

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

### âš  BREAKING CHANGES

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
* **adapters:** S06 + S01 â€” Migration version table and dead contract cleanup ([#538](https://github.com/dunay2/dvt/issues/538)) ([7c63073](https://github.com/dunay2/dvt/commit/7c63073e64163a9a1962d218c9c034664c5d9831))
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
* **api:** Admission control operability â€” decision telemetry and capacity gauges ([#628](https://github.com/dunay2/dvt/issues/628)) ([af10c43](https://github.com/dunay2/dvt/commit/af10c43f50b818cd4913cf2f9397167d69128a86))
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
* **state-store:** G5-PR2 â€” Deferred deletion and restore ([#536](https://github.com/dunay2/dvt/issues/536)) ([91fa3a0](https://github.com/dunay2/dvt/commit/91fa3a0eb21e41fe2f7d5691fde62e2490928f2c))
* **state-store:** G5-PR3 â€” Delivery buffer retention and purge ([#540](https://github.com/dunay2/dvt/issues/540)) ([709782b](https://github.com/dunay2/dvt/commit/709782bae3e8a4abba0e9666bad18ed82e6ea4ce))
* **state-store:** Implement issue [#6](https://github.com/dunay2/dvt/issues/6) postgres adapter foundation ([#202](https://github.com/dunay2/dvt/issues/202)) ([b112354](https://github.com/dunay2/dvt/commit/b1123545e9ef0e1e669d64519ea6a1c916553a6a))
* **state-store:** S12 â€” Remove deprecated write paths ([#597](https://github.com/dunay2/dvt/issues/597)) ([19181b6](https://github.com/dunay2/dvt/commit/19181b60027e51e9374a9e4f60461954592735a5))
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

* **api:** Admission control operability â€” decision telemetry and capacity gauges ([#628](https://github.com/dunay2/dvt/issues/628)) ([af10c43](https://github.com/dunay2/dvt/commit/af10c43f50b818cd4913cf2f9397167d69128a86))

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

* **state-store:** S12 â€” Remove deprecated write paths ([#597](https://github.com/dunay2/dvt/issues/597)) ([19181b6](https://github.com/dunay2/dvt/commit/19181b60027e51e9374a9e4f60461954592735a5))

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

* **adapters:** S06 + S01 â€” Migration version table and dead contract cleanup ([#538](https://github.com/dunay2/dvt/issues/538)) ([7c63073](https://github.com/dunay2/dvt/commit/7c63073e64163a9a1962d218c9c034664c5d9831))
* **state-store:** G5-PR3 â€” Delivery buffer retention and purge ([#540](https://github.com/dunay2/dvt/issues/540)) ([709782b](https://github.com/dunay2/dvt/commit/709782bae3e8a4abba0e9666bad18ed82e6ea4ce))

## [4.6.0](https://github.com/dunay2/dvt/compare/v4.5.0...v4.6.0) (2026-03-21)

### Features

* **state-store:** Archive export, verifier, Postgres adapter, and test coverage ([#535](https://github.com/dunay2/dvt/issues/535)) ([bac3b4c](https://github.com/dunay2/dvt/commit/bac3b4c9bbc79c035284045b75f5ab782c8510cb))
* **state-store:** G5-PR2 â€” Deferred deletion and restore ([#536](https://github.com/dunay2/dvt/issues/536)) ([91fa3a0](https://github.com/dunay2/dvt/commit/91fa3a0eb21e41fe2f7d5691fde62e2490928f2c))

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

### âš  BREAKING CHANGES

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
* corregir enlaces rotos en adapters y arreglar validaciÃ³n de contratos normativos (grep -F para bÃºsqueda literal) ([6a63ca8](https://github.com/dunay2/dvt/commit/6a63ca8dd6cf0b4b2d27c859b43ab8499354038f))
* corregir enlaces rotos en IWorkflowEngine.v1.md (capabilities/ y extensions/ paths) ([b51b4b0](https://github.com/dunay2/dvt/commit/b51b4b0f29716c207fd6f9868254dca4526a5736))
* corregir enlaces rotos en VERSIONING.md y deshabilitar temporalmente validaciÃ³n TypeScript (demasiado estricta para pseudocÃ³digo) ([0910e02](https://github.com/dunay2/dvt/commit/0910e0284b870440d24f5ca7e00f7fdbd9071216))
* corregir errores markdownlint en MIGRATION_GUIDE y CONTRIBUTING ([f03d1c1](https://github.com/dunay2/dvt/commit/f03d1c1e91abef3300d46f7f450e9d15b88fd349))
* corregir lÃ­neas &gt;120 caracteres en archivos crÃ­ticos (MD013) ([9a1e258](https://github.com/dunay2/dvt/commit/9a1e25847a83ca9bd8f054a106053993c04f72a7))
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
* remover cache npm del workflow y comentar enlace a Conductor EnginePolicies (no existe aÃºn) ([b86e220](https://github.com/dunay2/dvt/commit/b86e220bfafd50c4130d3db53242c6205abaa48d))
* Resolve engine contracts path mapping to dist declarations ([#116](https://github.com/dunay2/dvt/issues/116)) ([ca59788](https://github.com/dunay2/dvt/commit/ca597886f1ed10246c0608075baeb8f1fe36fa2e))
* resolve merge conflict in .golden/README.md ([db41a99](https://github.com/dunay2/dvt/commit/db41a990bc173c8ed57be095300fb81ee1619bc4))
* simplificar reglas de markdownlint para enfoque en errores crÃ­ticos ([09713be](https://github.com/dunay2/dvt/commit/09713be57a569396b71242eca96603b4e380019b))
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

### âš  BREAKING CHANGES

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

### âš  BREAKING CHANGES

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
