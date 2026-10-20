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
