import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { priceListFiles, readPriceList } from "./read-price-list";

async function read(folder: string, list: keyof typeof priceListFiles) {
  const bytes = await readFile(path.join(folder, priceListFiles[list]));
  return readPriceList(new Uint8Array(bytes), list);
}

describe("readPriceList on the fake price lists", () => {
  // Catches: the tax-exclusive price kept, the page number read as a reference, a designation printed
  // on two lines lost, or a reference listed twice imported twice.
  it("reads the Straumann layout", async () => {
    expect(await read("test-price-lists", "straumann")).toEqual({
      list: "straumann",
      year: 2031,
      rows: [
        {
          reference: "091.0008S",
          designation: "Implant essai, Ø3.1mm NT, 8mm",
          range: "straumann",
          cataloguePriceCents: 48000,
          vatRate: 20,
        },
        {
          reference: "091.0010S",
          designation: "Implant essai, Ø3.1mm NT, 10mm",
          range: "straumann",
          cataloguePriceCents: 49200,
          vatRate: 20,
        },
        {
          reference: "091.0200",
          designation: "Boîtier de contrôle",
          range: "straumann",
          cataloguePriceCents: 505200,
          vatRate: 20,
        },
        {
          reference: "091.0300",
          designation: "NT Pilier essai, avec vis, Ø 4.4mm, H 6mm, TIT",
          range: "straumann",
          cataloguePriceCents: 13440,
          vatRate: 20,
        },
        {
          reference: "091.0400",
          designation: "NC Aide de finition",
          range: "straumann",
          cataloguePriceCents: 8280,
          vatRate: 20,
        },
        {
          reference: "I-KX-Z",
          designation: "Instrument, adaptateur pour pièce à main",
          range: "straumann",
          cataloguePriceCents: 8880,
          vatRate: 20,
        },
      ],
    });
  });

  // Catches: the two columns of a page read as one row, a reference without digits or with an
  // underscore skipped, or a price without thousands separator refused.
  it("reads the two-column Anthogyr layout", async () => {
    expect(await read("test-price-lists", "anthogyr")).toEqual({
      list: "anthogyr",
      year: 2031,
      rows: [
        {
          reference: "TXA40100N1",
          designation: "IMPLANT ESSAI TL N - Ø4.1 X 10",
          range: "anthogyr",
          cataloguePriceCents: 26340,
        },
        {
          reference: "MUKAP",
          designation: "COIFFE DE GARDE MULTI-UNIT R",
          range: "anthogyr",
          cataloguePriceCents: 5340,
        },
        {
          reference: "INMODOPS9",
          designation: "TROUSSE DE CHIRURGIE ESSAI®",
          range: "anthogyr",
          cataloguePriceCents: 447120,
        },
        {
          reference: "TPA34080R1",
          designation: "IMPLANT ESSAI PX R - Ø3.6 X 8",
          range: "anthogyr",
          cataloguePriceCents: 24360,
        },
        {
          reference: "EXA_KIT",
          designation: "KIT 4 LEVIERS + 1 BOÎTE",
          range: "anthogyr",
          cataloguePriceCents: 79140,
        },
      ],
    });
  });

  // Catches: prices printed without the euro sign skipped, or a dot as thousands separator misread.
  it("reads the Neodent layout", async () => {
    expect(await read("test-price-lists", "neodent")).toEqual({
      list: "neodent",
      year: 2031,
      rows: [
        {
          reference: "190.943",
          designation: "IMPLANT ESSAI GM, TI, 3.6X8",
          range: "neodent",
          cataloguePriceCents: 16680,
        },
        {
          reference: "190.1009",
          designation: "IMPLANT ESSAI GM, TI, 6.1X8MM",
          range: "neodent",
          cataloguePriceCents: 17640,
        },
        {
          reference: "190.305",
          designation: "KIT ESSAI PROTHÉTIQUE COMPLET GM",
          range: "neodent",
          cataloguePriceCents: 101280,
        },
      ],
    });
  });

  // Catches: XenoFlex taken for XenoGraft, a section label read as a reference, or the bone
  // substitutes' 5,5 % rate read as 20 %.
  it("reads the two-column biomaterials layout", async () => {
    expect(await read("test-price-lists", "biomaterials")).toEqual({
      list: "biomaterials",
      year: 2031,
      rows: [
        {
          reference: "095.127W",
          designation: "Gel essai 0.2 ml - 1 seringue",
          range: "biomaterials",
          cataloguePriceCents: 11640,
          vatRate: 20,
        },
        {
          reference: "S1-9210-025",
          designation: "XenoGraft 300-900micron, 0.3g",
          range: "xenograft",
          cataloguePriceCents: 8440,
          vatRate: 5.5,
        },
        {
          reference: "NI-9110-005",
          designation: "Straumann® XenoFlex 5x5x3mm, 40mg",
          range: "biomaterials",
          cataloguePriceCents: 7385,
          vatRate: 5.5,
        },
        {
          reference: "BO-90120",
          designation: "Granules essai 0.7-1.4mm(L), 2.5cc",
          range: "biomaterials",
          cataloguePriceCents: 15825,
          vatRate: 5.5,
        },
      ],
    });
  });

  // Catches: a file that is no price list imported as an empty one, emptying the group's prices.
  it("refuses a file in which it finds no price", async () => {
    const bytes = await readFile("test-invoices/stock-export-fake.pdf");
    await expect(
      readPriceList(new Uint8Array(bytes), "neodent"),
    ).rejects.toThrow(/no price/);
  });
});

const folder = process.env.STRAUMANN_PRICE_LISTS_DIR;

describe.skipIf(!folder)("readPriceList on the real price lists", () => {
  // Catches: a layout of a real price list that the fake extracts do not reproduce.
  it.each([
    ["straumann", 2198],
    ["anthogyr", 1587],
    ["neodent", 1121],
    ["biomaterials", 80],
  ] as const)("reads every reference of %s", async (list, count) => {
    const { year, rows } = await read(folder!, list);

    expect(year).toBe(2026);
    expect(rows).toHaveLength(count);
  });

  // Catches: XenoGraft priced at the biomaterial discount, or XenoFlex without it.
  it("puts the 8 XenoGraft references, and only them, in their own range", async () => {
    const { rows } = await read(folder!, "biomaterials");
    const xenograft = rows.filter((row) => row.range === "xenograft");

    expect(xenograft.map((row) => row.reference)).toHaveLength(8);
    expect(xenograft.every((row) => row.reference.startsWith("S1-"))).toBe(
      true,
    );
    expect(
      rows.filter((row) => row.designation.includes("XenoFlex")),
    ).not.toHaveLength(0);
    expect(
      rows
        .filter((row) => row.designation.includes("XenoFlex"))
        .every((row) => row.range === "biomaterials" && row.vatRate === 5.5),
    ).toBe(true);
  });

  // Catches: the last row of a page read with the page number as its reference.
  it("reads the reference of a row printed next to the page number", async () => {
    const { rows } = await read(folder!, "straumann");

    expect(rows.map((row) => row.reference)).toEqual(
      expect.arrayContaining(["023.0027", "025.2920"]),
    );
    expect(rows.map((row) => row.reference)).not.toContain("38");
  });
});
