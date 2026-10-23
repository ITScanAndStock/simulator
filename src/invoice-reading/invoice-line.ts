export type UnsureField = "reference" | "unitPrice";

export type InvoiceLine = {
  reference: string;
  designation: string;
  quantity: number;
  unitPriceCents: number;
  amountCents: number;
  vatRate: number | undefined;
  unsure: UnsureField[];
};
