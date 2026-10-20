# unpdf reads the text layer of PDF invoices

The text of a PDF invoice is extracted with `unpdf`, a server build of Mozilla's pdf.js, and each supplier's reading rule works on the words with their position on the page, grouped into rows. Chosen on 2026-10-20 in ticket 04, after trying three libraries on the real invoices of 2026-10-14 (Doctor AI, Henry Schein Belgium, a Scan&Stock stock export, and the scanned American Orthodontics invoice).

| Library              | Installed size                                            | On the real Doctor AI invoice                     |
| -------------------- | --------------------------------------------------------- | ------------------------------------------------- |
| `unpdf` 1.9.0        | 2.5 MB, no dependency                                     | the 7 lines in order, each word with its position |
| `pdfjs-dist` 6.4.299 | 35 MB, plus the optional native `@napi-rs/canvas` (27 MB) | the same words and positions                      |
| `pdf2json` 4.1.0     | 11 MB                                                     | lines out of order (`778–9273` before `638–9217`) |

We chose `unpdf` because it gives the same words and positions as `pdfjs-dist` without its size or a native module, and keeps the reading in plain JavaScript in Node, as the spec requires (no AI, no external service). `pdf2json` was set aside for the order of its lines.

## Consequences

- Positions are what a rule relies on: a Doctor AI line is a row of the table that ends with seven figures. Text joined into plain lines would lose the columns.
- A scanned PDF has no text layer: `unpdf` returns no words, and character recognition (ticket 08) takes over.
- The `@napi-rs/canvas` peer of `unpdf` stays uninstalled: it is only needed to render pages as images.
