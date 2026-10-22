import type { SupplierCode } from "@/supplier";

export type PriceLookupResult =
  | {
      outcome: "matched";
      productId: number;
      referenceUnitPriceCents: number;
      issuingPackQty: number | undefined;
      referencePackQty: number | undefined;
    }
  | { outcome: "unknownReference" }
  | { outcome: "ambiguous" }
  | { outcome: "absentAtReference" };

export type PriceLookup = (
  supplier: SupplierCode,
  reference: string,
) => Promise<PriceLookupResult>;

export class PricesUnavailable extends Error {}

// Whatever made the lookup fail (network, status, answer), the prices cannot be had for now.
export function unavailableOnFailure(lookup: PriceLookup): PriceLookup {
  return (supplier, reference) =>
    lookup(supplier, reference).catch((cause: unknown) => {
      throw new PricesUnavailable("The price lookup failed.", { cause });
    });
}
