---
name: add-or-update-api-endpoint
description: Workflow command scaffold for add-or-update-api-endpoint in Devonz.
allowed_tools: ["Bash", "Read", "Write", "Grep", "Glob"]
---

# /add-or-update-api-endpoint

Use this workflow when working on **add-or-update-api-endpoint** in `Devonz`.

## Goal

Adds a new API endpoint or updates an existing one, including route file, types, and tests.

## Common Files

- `app/routes/api.*.ts`
- `.react-router/types/app/routes/+types/api.*.ts`
- `app/test/routes/api.*.test.ts`
- `app/lib/api/schemas.ts`

## Suggested Sequence

1. Understand the current state and failure mode before editing.
2. Make the smallest coherent change that satisfies the workflow goal.
3. Run the most relevant verification for touched files.
4. Summarize what changed and what still needs review.

## Typical Commit Signals

- Create or update app/routes/api.[endpoint].ts
- Update or create corresponding type definitions in .react-router/types/app/routes/+types/api.[endpoint].ts
- Add or update tests in app/test/routes/api.[endpoint].test.ts (if applicable)
- Update shared API utilities or schemas if needed

## Notes

- Treat this as a scaffold, not a hard-coded script.
- Update the command if the workflow evolves materially.