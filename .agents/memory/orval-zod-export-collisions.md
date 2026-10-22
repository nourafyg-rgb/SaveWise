---
name: Orval Zod export collisions
description: Prevent duplicate export errors in the generated Zod package when API operations use path parameters.
---

After OpenAPI codegen, keep `lib/api-zod/src/index.ts` selective instead of wildcard-exporting both generated API schemas and all generated TypeScript types. Orval can emit the same operation path-parameter name in both modules, which fails the library typecheck.

**Why:** A completion endpoint with an `{id}` path parameter produced duplicate `ResolveWaitingDecisionParams` exports. Regenerating the API adds the wildcard type export again.

**How to apply:** After every API codegen run, preserve the generated runtime schema barrel export and explicitly re-export only needed response/input types; run `pnpm run typecheck:libs`.
