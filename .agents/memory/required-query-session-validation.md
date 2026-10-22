---
name: Required query session validation
description: Guard required session identifiers before generated query schemas coerce missing values.
---

When an OpenAPI-required query string is generated as `z.coerce.string()`, parsing an absent value can produce the literal `"undefined"`, which may satisfy a minimum-length check. Validate the raw Express query value is a string before passing it to the generated schema.

**Why:** Session-scoped API reads accepted requests with no browser identifier, weakening the required session boundary even though those requests did not match existing random sessions.

**How to apply:** Before `safeParse(req.query)`, reject missing or non-string `sessionId`; let the generated schema continue enforcing length limits and the rest of the contract.
