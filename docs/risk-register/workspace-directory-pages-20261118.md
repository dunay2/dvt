---
id: R-20261118-WORKSPACE-DIRECTORY-PAGES
title: Scoped file discovery during concurrent project edits
status: Mitigating
date: 2026-11-18
owners:
  - API
  - Web
severity: Medium
probability: Low
---

# Scoped directory discovery

Every page checks the current Files read permission and binds the continuation
to the tenant, project, environment and requested directory. The repository
rejects traversal, excluded segments and linked directories. Listings include
only direct regular files with supported extensions. The page size and memory
limit apply independently of the number of names on disk.

The listing reflects the directory at each request. A file inserted before the
last returned name becomes visible on refresh. A file inserted after that name
can appear on a later page. A failed request retains previously loaded rows and
lets the user retry the same continuation. Reading and updating a selected
variant still use its path and content revision through the existing Files ports.

The [evidence](../evidence/ED-20261118-workspace-directory-pages.md) records the
storage, authorization and route proofs.
