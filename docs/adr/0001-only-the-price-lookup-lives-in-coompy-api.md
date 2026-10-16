# Only the price lookup lives in coompy-api

Invoice reading, verification, the simulation and storage run on the simulator's own server side, in this repository. `coompy-api`, the existing Spring Boot price comparator, only answers the price lookup: for a supplier code and a reference, the matched product, its reference price and the pack quantities of both offers, or why there is none. The simulator reaches it through one price lookup interface, so the future endpoint replaces the current route without touching the rest. Decided in the framing decisions of 2026-09-30 (Q7-8 of the Notion page "Décisions de cadrage"), which also ruled out direct access to the Coompy database.

We chose this because `coompy-api` is reviewed by Ali and follows the house stack, so every addition there costs a review, and because the simulator reads the invoices and stores the prospects' personal data, which have no place in the price comparator.

## Consequences

- Version 1 uses the existing product search route and sends one request per line. A line is matched only when exactly one product carries exactly that reference at the issuing supplier.
- A batch endpoint will be built in `coompy-api` before going online, with its own spec, tickets and a pull request reviewed by Ali. It matches references exactly, records no demand and visits no supplier.
- The Straumann group is not added to Coompy, since no Coompy offer carries a Straumann-brand product. Only lines of an invoice issued by Straumann, Anthogyr or Neodent get their reference price from price lists imported into the simulator; a distributor's line stays on Coompy.
