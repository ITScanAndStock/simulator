# Next.js, local PostgreSQL, then Vercel and Supabase on CSP accounts

The simulator is one Next.js application, front and server side, in this repository, although the house stack of the existing Scan&Stock projects is Angular and Spring Boot. Production will later run on Vercel, with a Supabase database in an EU region, on CSP accounts. Chosen in the framing decisions of 2026-09-30 (Q16-17 of the Notion page "Décisions de cadrage": new projects follow CSP's logic, existing Scan&Stock projects stay on Angular and Spring Boot), then reconsidered and kept in the grilling session of 2026-10-14 (Q14, recorded in the version 1 spec).

We chose this because the simulator has no reviewer besides its maintainer, unlike `coompy-api`, whose pull requests Ali reviews, so the house stack brings no review benefit, and because production must run on CSP's own accounts, managed internally without the Scan&Stock provider, where Vercel and Supabase are what CSP's new projects use (Q16-17, Q30).

## Consequences

- Version 1 runs on Robin's computer only, with a local PostgreSQL 18 database, `simulator-local`. The code treats it as plain PostgreSQL and uses no Supabase-specific feature, so that moving to Supabase should only change the connection settings.
- Before going online, Vercel's function duration and size limits must be checked against character recognition, and the connection to Supabase (pooler mode, SSL) against the code.
