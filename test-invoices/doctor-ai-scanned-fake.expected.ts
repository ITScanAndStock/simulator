import type { ReadInvoice } from "@/invoice-reading/read-invoice";

// Recognition reads the smudged 412-0815 as M£-0815 and 12.50 as 12.60, and the em dash
// for the en dash of the designations.
export const doctorAiScannedFakeExpected: ReadInvoice = {
  status: "read",
  supplier: "DoctorAI",
  recognised: true,
  taxBasis: "inclusive",
  lines: [
    {
      reference: "M£-0815",
      designation: "# DESINFECTANT SURFACES SANS ALCOOL 1L",
      quantity: 1,
      unitPriceCents: 2400,
      amountCents: 2400,
      vatRate: 20,
      unsure: ["reference"],
    },
    {
      reference: "S12-3344",
      designation: "GANTS NITRILE NON POUDRES T.M (100) ACME",
      quantity: 3,
      unitPriceCents: 891,
      amountCents: 2673,
      vatRate: 20,
      unsure: [],
    },
    {
      reference: "233-1001",
      designation: "#LQ*ALCOOL MODIFIE 70% 5L PHARMA",
      quantity: 2,
      unitPriceCents: 1260,
      amountCents: 2500,
      vatRate: 20,
      unsure: ["unitPrice"],
    },
    {
      reference: "233-1002",
      designation: "COMPRESSES STERILES — 7,5X7,5CM (50)",
      quantity: 1,
      unitPriceCents: 450,
      amountCents: 450,
      vatRate: 20,
      unsure: [],
    },
  ],
  otherChargesCents: 0,
  totalCents: 8023,
};

// The same page photographed, with nothing smudged.
export const doctorAiPhotoFakeExpected: ReadInvoice = {
  status: "read",
  supplier: "DoctorAI",
  recognised: true,
  taxBasis: "inclusive",
  lines: [
    {
      reference: "412-0815",
      designation: "# DESINFECTANT SURFACES SANS ALCOOL 1L",
      quantity: 1,
      unitPriceCents: 2400,
      amountCents: 2400,
      vatRate: 20,
      unsure: [],
    },
    {
      reference: "512-3344",
      designation: "GANTS NITRILE NON POUDRES T.M (100) ACME",
      quantity: 3,
      unitPriceCents: 891,
      amountCents: 2673,
      vatRate: 20,
      unsure: [],
    },
    {
      reference: "233-1001",
      designation: "#LQ*ALCOOL MODIFIE 70% 5L PHARMA",
      quantity: 2,
      unitPriceCents: 1250,
      amountCents: 2500,
      vatRate: 20,
      unsure: [],
    },
    {
      reference: "233-1002",
      designation: "COMPRESSES STERILES — 7,5X7,5CM (50)",
      quantity: 1,
      unitPriceCents: 450,
      amountCents: 450,
      vatRate: 20,
      unsure: [],
    },
  ],
  otherChargesCents: 0,
  totalCents: 8023,
};
