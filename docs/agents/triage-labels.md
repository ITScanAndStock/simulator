# Triage Labels

The skills speak in terms of five canonical triage roles. This file maps those roles to the actual label strings used in this repo's issue tracker.

| Label in mattpocock/skills | Label in our tracker | Notion Statut | Meaning                                  |
| -------------------------- | -------------------- | ------------- | ---------------------------------------- |
| `needs-triage`             | `needs-triage`       | À trier       | Maintainer needs to evaluate this issue  |
| `needs-info`               | `needs-info`         | Bloqué        | Waiting on reporter for more information |
| `ready-for-agent`          | `ready-for-agent`    | Prêt          | Fully specified, ready for an AFK agent  |
| `ready-for-human`          | `ready-for-human`    | Prêt          | Requires human implementation            |
| `wontfix`                  | `wontfix`            | Abandonné     | Will not be actioned                     |

When a skill mentions a role (e.g. "apply the AFK-ready triage label"), use the corresponding label string from this table.

## Work states

These statuses are not triage roles, but ticket files carry them once work starts.

| Label in our tracker | Notion Statut | Meaning                                                                                 |
| -------------------- | ------------- | --------------------------------------------------------------------------------------- |
| `in-progress`        | En cours      | A branch is open for it                                                                 |
| `in-review`          | En revue      | Every step is committed and the branch reviewed; the pull request comes next or is open |
| `done`               | Terminé       | Squash-merged on main                                                                   |
