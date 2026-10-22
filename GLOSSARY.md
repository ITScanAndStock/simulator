# Simulateur d'économies Club Santé Premium

A dental practice drops its own supplier invoices and sees how much it would have saved at the Club Santé Premium (CSP) negotiated price. This glossary fixes the words used for that journey and for the states a line can end in.

## Language

### Simulation

**Simulation**:
One run of the journey for one practice: its read invoices, the practitioner's corrections, every line with its state, and the resulting saving.
_Avoid_: Quote, estimate, comparison, session

**Read invoice**:
What the simulator understood from one invoice file: the issuing supplier (or that it is not supported yet), its lines with the price paid, its totals and its doubt signals.
_Avoid_: Parsed invoice, extracted invoice, invoice data, upload

**Reading rule**:
The supplier-specific knowledge that turns the text of that supplier's invoices into lines: how to recognise them, cut the lines, find each column, which tax basis the prices use, and which lines are not products.
_Avoid_: Parser, extractor, template, scraper, mapping

**Reference price**:
The unit price, tax-inclusive, that a line's price paid is compared against: the price at the reference supplier, or the CSP price for an invoice of the Straumann group.
_Avoid_: Doctor AI price, target price, best price

**Reference supplier**:
The supplier whose Coompy price is the reference price, set per environment: GACD on the technical deployment, staging and production, Doctor AI only on Robin's computer and in the journey tests, until the GACD prices are available.
_Avoid_: Target supplier, CSP supplier, comparison supplier

### Line states

**Compared**:
A matched line whose reference price was found and whose saving is zero or positive and at or below the threshold; a Straumann group line that gets the year-end rebate is Compared even when the price paid is already at or below the CSP price. It counts in the saving; on screen it is counted under "Comparées".
_Avoid_: Matched, priced, OK

**Already cheaper**:
An ordinary matched line whose reference price is higher than the price paid, or a Straumann group line paid at or below the CSP price that gets no year-end rebate. It does not count in the saving and is shown without emphasis, under "Déjà moins cher".
_Avoid_: Negative saving, no saving, loss

**À vérifier**:
A line whose reading is doubtful: its amounts do not add up, its reference or price was recognised with low confidence, its reference was not found but the issuing supplier has one, then proposed, that differs only by characters recognition confuses (such as 0 and O), or its tax-exclusive price has no readable rate. Once the practitioner corrects or skips it, the line takes its state from the corrected figures, or from the figures as read when skipped; on screen its label is "À vérifier".
_Avoid_: Error, invalid, doubtful line, needs review, "À vérifier par un conseiller"

**À étudier**:
A line that cannot be compared: its reference is not found at the issuing supplier (unless a near-identical one is proposed, which makes it À vérifier), the product is absent at the reference supplier, its Straumann group reference is absent from the group's price lists, or it is a ClearCorrect aligner. It does not count in the saving; on screen its label is "À étudier".
_Avoid_: Not found, unknown, missing, unmatched

**À vérifier par un conseiller**:
A matched line held back because its saving is above the threshold or because the pack sizes of the issuing offer and the reference offer are both known and differ; this state takes precedence over Compared and Already cheaper. It does not count in the saving and is left to a CSP advisor.
_Avoid_: "À vérifier" (that state is for doubtful reading, fixed by the practitioner), suspicious, outlier
