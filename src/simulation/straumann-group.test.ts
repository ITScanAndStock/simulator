import { describe, expect, it } from "vitest";
import type { InvoiceLine } from "@/invoice-reading/invoice-line";
import type { PriceLookup } from "@/price-lookup/price-lookup";
import { routedPriceLookup } from "@/price-lookup/routed";
import { straumannGroupPriceLookup } from "@/price-lookup/straumann-group";
import type { GroupAgreement } from "@/straumann-group/agreement";
import type { GroupPrice } from "@/straumann-group/price-list-store";
import type { SupplierCode } from "@/supplier";
import { simulate } from "./simulate";

// Invented figures: the CSP agreement is confidential and never committed.
const agreement: GroupAgreement = {
  discountBasisPoints: {
    straumann: 1200,
    anthogyr: 1750,
    neodent: 2200,
    biomaterials: 900,
    xenograft: 300,
  },
  rebateTiers: [
    { fromImplants: 20, basisPoints: 100 },
    { fromImplants: 61, basisPoints: 250 },
    { fromImplants: 900, basisPoints: 600 },
  ],
};

const priceList: (GroupPrice & { reference: string })[] = [
  {
    reference: "S-1",
    list: "straumann",
    range: "straumann",
    cataloguePriceCents: 10000,
  },
  {
    reference: "A-1",
    list: "anthogyr",
    range: "anthogyr",
    cataloguePriceCents: 10000,
  },
  {
    reference: "N-1",
    list: "neodent",
    range: "neodent",
    cataloguePriceCents: 10000,
  },
  {
    reference: "B-1",
    list: "biomaterials",
    range: "biomaterials",
    cataloguePriceCents: 10000,
  },
  {
    reference: "X-1",
    list: "biomaterials",
    range: "xenograft",
    cataloguePriceCents: 10000,
  },
  {
    reference: "LOC-1",
    list: "straumann",
    range: "straumann",
    cataloguePriceCents: 10000,
  },
  {
    reference: "LOC-1",
    list: "anthogyr",
    range: "anthogyr",
    cataloguePriceCents: 10000,
  },
];

function line(
  reference: string,
  quantity: number,
  unitPriceCents: number,
  designation = `Produit ${reference}`,
): InvoiceLine {
  return {
    reference,
    designation,
    quantity,
    unitPriceCents,
    amountCents: quantity * unitPriceCents,
    vatRate: 20,
  };
}

function invoice(supplier: SupplierCode, ...lines: InvoiceLine[]) {
  return { supplier, lines };
}

const coompyAsked: string[] = [];
const fakeCoompy: PriceLookup = async (supplier, reference) => {
  coompyAsked.push(`${supplier} ${reference}`);
  return {
    outcome: "matched",
    productId: 1,
    referenceUnitPriceCents: 9000,
    issuingPackQty: undefined,
    referencePackQty: undefined,
  };
};

function lookup(implantsPerYear?: number) {
  return routedPriceLookup({
    coompy: fakeCoompy,
    straumannGroup: straumannGroupPriceLookup({
      findPrices: async (reference) =>
        priceList.filter((row) => row.reference === reference),
      agreement,
      implantsPerYear,
    }),
  });
}

async function simulated(
  invoices: ReturnType<typeof invoice>[],
  implantsPerYear?: number,
  suspiciousSavingPercent = 50,
) {
  return simulate(invoices, lookup(implantsPerYear), {
    suspiciousSavingPercent,
  });
}

const states = (simulation: Awaited<ReturnType<typeof simulated>>) =>
  simulation.lines.map((l) => [
    l.reference,
    l.state,
    l.referenceUnitPriceCents,
    l.savingCents,
  ]);

describe("simulate, Straumann group", () => {
  // Catches: a range priced with another range's discount, or the saving counted on one unit.
  it("prices each range at the catalogue price less its structural discount", async () => {
    const simulation = await simulated([
      invoice(
        "Straumann",
        line("S-1", 2, 10000),
        line("B-1", 2, 10000),
        line("X-1", 2, 10000),
      ),
      invoice("Anthogyr", line("A-1", 2, 10000)),
      invoice("Neodent", line("N-1", 2, 10000)),
    ]);

    expect(states(simulation)).toEqual([
      ["S-1", "compared", 8800, 2400],
      ["B-1", "compared", 9100, 1800],
      ["X-1", "compared", 9700, 600],
      ["A-1", "compared", 8250, 3500],
      ["N-1", "compared", 7800, 4400],
    ]);
    expect(simulation.totals).toMatchObject({
      paidCents: 100000,
      savingCents: 12700,
      withCspCents: 87300,
      comparedLines: 5,
    });
  });

  // Catches: a negative difference subtracted from the rebate, or the price paid replaced by the CSP price.
  it("keeps a price already below the CSP price and counts only the rebate", async () => {
    const simulation = await simulated(
      [invoice("Straumann", line("S-1", 3, 8000))],
      61,
    );

    expect(states(simulation)).toEqual([["S-1", "compared", 8800, 750]]);
  });

  // Catches: "at or below" read as "below", or a line without saving counted as compared.
  it.each([8800, 8000])(
    "leaves a line paid %i cents, at or below the CSP price and without rebate, already cheaper",
    async (paidCents) => {
      const simulation = await simulated([
        invoice("Straumann", line("S-1", 1, paidCents)),
      ]);

      expect(states(simulation)).toEqual([
        ["S-1", "alreadyCheaper", 8800, undefined],
      ]);
      expect(simulation.totals.savingCents).toBe(0);
    },
  );

  // Catches: a tier boundary taken as exclusive, or the volume read as the tier below or above.
  it.each([
    [undefined, "alreadyCheaper", undefined],
    [19, "alreadyCheaper", undefined],
    [20, "compared", 100],
    [60, "compared", 100],
    [61, "compared", 250],
    [899, "compared", 250],
    [900, "compared", 600],
  ] as const)(
    "gives %s implants a year the rebate of their tier",
    async (implantsPerYear, state, savingCents) => {
      const simulation = await simulated(
        [invoice("Straumann", line("S-1", 1, 8800))],
        implantsPerYear,
      );

      expect(states(simulation)).toEqual([["S-1", state, 8800, savingCents]]);
    },
  );

  // Catches: the implant rebate given on biomaterials, XenoGraft included.
  it("gives no rebate on biomaterials", async () => {
    const simulation = await simulated(
      [invoice("Straumann", line("B-1", 1, 10000), line("X-1", 1, 9700))],
      900,
    );

    expect(states(simulation)).toEqual([
      ["B-1", "compared", 9100, 900],
      ["X-1", "alreadyCheaper", 9700, undefined],
    ]);
  });

  // Catches: a reference listed by Straumann and Anthogyr priced with the other brand's discount.
  it.each([
    ["Straumann", 8800],
    ["Anthogyr", 8250],
    ["Neodent", 8800],
  ] as const)(
    "prices a reference of two price lists on a %s invoice from the issuer's list, else at the smaller discount",
    async (supplier, cspPriceCents) => {
      const simulation = await simulated([
        invoice(supplier, line("LOC-1", 1, 10000)),
      ]);

      expect(states(simulation)).toEqual([
        ["LOC-1", "compared", cspPriceCents, 10000 - cspPriceCents],
      ]);
    },
  );

  // Catches: a group reference sent to Coompy, or an absent one guessed from a near reference.
  it("leaves a reference absent from the price lists to study", async () => {
    const simulation = await simulated([
      invoice("Straumann", line("S-2", 1, 10000), line("s-1", 1, 10000)),
    ]);

    expect(states(simulation)).toEqual([
      ["S-2", "toStudy", undefined, undefined],
      ["s-1", "toStudy", undefined, undefined],
    ]);
  });

  // Catches: an aligner priced at the implant discount if a price list one day carries it.
  it("leaves a ClearCorrect line to study", async () => {
    const simulation = await simulated(
      [invoice("Straumann", line("S-1", 1, 10000, "ClearCorrect Phase 1"))],
      900,
    );

    expect(states(simulation)).toEqual([
      ["S-1", "toStudy", undefined, undefined],
    ]);
  });

  // Catches: the threshold skipped for group lines, which a high discount plus the top rebate can exceed.
  it("holds back a group saving above the threshold for an advisor", async () => {
    const simulation = await simulated(
      [invoice("Neodent", line("N-1", 1, 10000))],
      900,
      25,
    );

    expect(states(simulation)).toEqual([
      ["N-1", "advisorCheck", 7800, undefined],
    ]);
  });

  // Catches: a distributor's line priced from the group lists, or a group line sent to Coompy.
  it("routes only the lines of a group invoice to the price lists", async () => {
    coompyAsked.length = 0;
    const simulation = await simulated([
      invoice("Dentaltix", line("S-1", 1, 10000)),
      invoice("Straumann", line("S-1", 1, 10000)),
    ]);

    expect(states(simulation)).toEqual([
      ["S-1", "compared", 9000, 1000],
      ["S-1", "compared", 8800, 1200],
    ]);
    expect(coompyAsked).toEqual(["Dentaltix S-1"]);
  });
});
