# ADR-0006: Prefer Debian Node images

- **Status**: Accepted
- **Date**: 2026-02-23

## Context

Native deps and glibc compatibility reduce friction compared to Alpine/musl for many stacks.

## Decision

Recommend Debian-based Node images for runtime containers; Alpine only if verified.

## Consequences

Lower risk; slightly larger images.

## References

- https://hub.docker.com/_/node
