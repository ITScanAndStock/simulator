# Issue tracker: Local Markdown, mirrored to Notion

Issues and specs for this repo live as markdown files in `.scratch/`. These files are the source of truth. Each issue is mirrored as a row in a Notion database for tracking and sharing.

## Conventions

- One feature per directory: `.scratch/<feature-slug>/`
- The spec is `.scratch/<feature-slug>/spec.md`
- Implementation issues are one file per ticket at `.scratch/<feature-slug>/issues/<NN>-<slug>.md`, numbered from `01`, never a single combined tickets file
- Triage state is recorded as a `Status:` line near the top of each issue file (see `triage-labels.md` for the status strings and their Notion Statut)
- Comments and conversation history append to the bottom of the file under a `## Comments` heading

## Notion mirror

- Database: "Issues" (https://app.notion.com/p/9f66d0b77614411588615494e21c23b9, data source `collection://f5a61994-45da-4b22-a7a1-72f90bbbebde`), under the Notion page "Simulateur de remise CSP" (https://app.notion.com/p/3f20e2d2c3c2812f9003f36e6f8e3ba7).
- One row per issue file. The page body copies the file: What to build, Blocked by, Proof of done, and the acceptance criteria as to-dos.
- Statut follows the file's `Status:` line, as mapped in `triage-labels.md`.
- Updating the row of the ticket being worked on is done without asking: Statut, Branche, PR, Terminé le, Réalisé (j), and ticking its to-dos. Every other Notion write (a new row, another ticket's row, any other page) is approved by the user first.
- On any conflict, the markdown file wins.

### Columns

| Column                                                       | Type                                                                                                                           | Filled from                                                                                                                                                                                                                            |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Ticket                                                       | title                                                                                                                          | `NN · <title>`, from the file's `# NN: <title>` heading                                                                                                                                                                                |
| Statut                                                       | select (values in `triage-labels.md`)                                                                                          | `**Status:**`, mapped in `triage-labels.md`                                                                                                                                                                                            |
| Phase                                                        | select: Structure, Parcours, Lecture des factures, Simulation et résultat, Vérification, États et erreurs, Fournisseurs, Essai | `**Phase:**`                                                                                                                                                                                                                           |
| Dépend de                                                    | relation to Issues                                                                                                             | the ticket numbers listed in `**Blocked by:**`; the full line, conditions and non-ticket blockers included, stays in the page body (`05; also 08 if its invoices are scans` gives 05, and 08 only once the condition is known to hold) |
| Bloque                                                       | relation to Issues                                                                                                             | maintained by Notion as the other side of Dépend de; never written                                                                                                                                                                     |
| Optimiste (j), Probable (j)                                  | number                                                                                                                         | `**Estimate:**` gives both, "X d optimistic, Y d probable", written into Notion as numbers of days with a decimal point (0,5 → 0.5)                                                                                                    |
| Réalisé (j)                                                  | number                                                                                                                         | days actually spent, at close                                                                                                                                                                                                          |
| Début optimiste, Fin optimiste, Début probable, Fin probable | date                                                                                                                           | `**Planned:**` "A → B optimistic, C → D probable" gives Début optimiste = A, Fin optimiste = B, Début probable = C, Fin probable = D                                                                                                   |
| Terminé le                                                   | date                                                                                                                           | close date                                                                                                                                                                                                                             |
| Situation                                                    | formula                                                                                                                        | computed by Notion; never written                                                                                                                                                                                                      |
| Preuve de fin                                                | text                                                                                                                           | `**Proof of done:**`                                                                                                                                                                                                                   |
| Branche, PR                                                  | text, url                                                                                                                      | the ticket's branch and pull request                                                                                                                                                                                                   |
| Chemin                                                       | text                                                                                                                           | repo-relative path of the issue file, written as inline code so Notion does not turn `.md` into a link                                                                                                                                 |

### Views

- **Default view**: table, all columns.
- **Par statut**: board grouped by Statut.
- **Par phase**: table grouped by Phase.
- **Planning**: timeline from Début probable to Fin probable.
- **Bloqués**: table filtered on Statut = Bloqué.

## When a skill says "publish to the issue tracker"

Create a new file under `.scratch/<feature-slug>/` (creating the directory if needed), then mirror it to Notion.

## When a skill says "fetch the relevant ticket"

Read the file at the referenced path. The user will normally pass the path or the issue number directly.

## Wayfinding operations

Used by `/wayfinder`. The **map** is a file with one **child** file per ticket.

- **Map**: `.scratch/<effort>/map.md` (the Notes / Decisions-so-far / Fog body).
- **Child ticket**: `.scratch/<effort>/issues/NN-<slug>.md`, numbered from `01`, with the question in the body. A `Type:` line records the ticket type (`research`/`prototype`/`grilling`/`task`); a `Status:` line records `claimed`/`resolved`.
- **Blocking**: a `Blocked by: NN, NN` line near the top. A ticket is unblocked when every file it lists is `resolved`.
- **Frontier**: scan `.scratch/<effort>/issues/` for files that are open, unblocked, and unclaimed; first by number wins.
- **Claim**: set `Status: claimed` and save before any work.
- **Resolve**: append the answer under an `## Answer` heading, set `Status: resolved`, then append a context pointer (gist + link) to the map's Decisions-so-far in `map.md`.
