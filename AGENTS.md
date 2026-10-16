# Agents

## Agent skills

### Issue tracker

Local markdown under `.scratch/` (source of truth), mirrored to a Notion "Issues" database. See `docs/agents/issue-tracker.md`.

### Triage labels

The five default labels (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`), plus the work states (`in-progress`, `in-review`, `done`), each with its Notion Statut. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `GLOSSARY.md` plus `docs/adr/` at the repo root. See `docs/agents/domain.md`.

## Delivery

One ticket = one feature = one branch = one pull request. Pull requests are squash-merged, so `main` holds one commit per feature. On the branch, one commit per step, each approved by Robin.

CI (typecheck, lint, format, tests, build) passes before merging. The current GitHub plan has no branch protection, so this holds by convention.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
