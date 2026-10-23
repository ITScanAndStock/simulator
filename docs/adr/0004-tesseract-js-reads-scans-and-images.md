# tesseract.js reads scanned invoices and images

A PDF without a text layer, a JPG or a PNG is read with `tesseract.js`, the WebAssembly build of Tesseract, with its French LSTM model shipped in `@tesseract.js-data/fra`. A scanned PDF is first rendered at 300 dpi with `unpdf` and `@napi-rs/canvas`. Chosen on 2026-10-23 in ticket 08, after trying two libraries on the only real scan we have, the four-page American Orthodontics invoice of 2026-10-14, and on a Doctor AI fake rendered as a scan.

| Library                | Installed size                 | Page 1 of the real scan (12 lines)                                    | Time for page 1         |
| ---------------------- | ------------------------------ | --------------------------------------------------------------------- | ----------------------- |
| `tesseract.js` 7.0.0   | 45 MB, plus 0.7 MB of language | 12/12 references, 12/12 net prices, 12/12 amounts; confidence 0 to 96 | 1.7 s                   |
| `scribe.js-ocr` 0.16.1 | 45 MB                          | the same 36 values                                                    | 3.2 s, loading included |

We chose `tesseract.js` because it gives a confidence per word on a fine scale, which the "À vérifier" rule needs, where `scribe.js-ocr` only gave 80 or 100. Both run in Node without any external service, as the spec requires.

## Consequences

- The page is read in "sparse text" mode. Tesseract's default page layout analysis dropped the whole first row of the real invoice's table, with no error; the sparse mode read all 12 rows, and the reading rule groups the words into rows by their position.
- A reference or a unit price read with a confidence under 80 makes its line "À vérifier". On the real scan, every reference was read right with a confidence of 88 to 96, every figure of the tables of pages 1 to 3 with 94 or more; on the Doctor AI fake, the two smudged words come out at 20 and 62.
- A scanned PDF of more than 10 pages is not read: each page takes about two seconds.
- An image, or a scanned page at 300 dpi, of more than 40 million pixels is not read, and one reading waits for the other: reading a 1.4 MB PNG of 16000 × 16000 pixels failed after the process had reached 3.2 GB of memory, drawing of the image included. An A4 page at 300 dpi has 8.7 million pixels.
- A near-identical reference is only proposed for an invoice read through recognition, since only recognition confuses characters, and one invoice asks Coompy about a hundred questions at most for it.
- Next.js must leave `@napi-rs/canvas`, `tesseract.js` and `@tesseract.js-data/fra` out of its server bundle: the first is a native module, the other two load a worker and the language model from their own folder at run time.
- The confidence of a word is not stable from one image to the next: on the Doctor AI fake, an en dash in a reference read right came out at 13 in a PDF and 86 in a PNG of the same page. The fakes of the repository print plain hyphens in their scanned references, so that their tests do not depend on it.
- This replaces the last consequence of ADR 0003: `@napi-rs/canvas` is now installed, to render scanned pages.
