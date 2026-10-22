---
name: Post-delegation verification
description: Reconcile backend behavior after delegated UI work in a shared project.
---

After a design subagent integrates frontend work, verify that pre-existing backend edits still exist before relying on earlier checks. A design task can leave an unrelated route change missing from the current workspace.

**Why:** A decision idempotency route change was absent after a frontend-only delegation, and the first API retry test exposed it.

**How to apply:** Re-read the key model and route files changed before delegation, then run representative API tests after integration.
