import {
  cspUnitPriceCents,
  rebateUnitCents,
  type GroupAgreement,
} from "@/straumann-group/agreement";
import type { GroupPrice } from "@/straumann-group/price-list-store";
import type { PriceListName } from "@/straumann-group/read-price-list";
import type { StraumannGroupSupplier } from "@/supplier";
import type { PriceLookupResult } from "./price-lookup";

export type StraumannGroupPriceLookup = (
  supplier: StraumannGroupSupplier,
  reference: string,
) => Promise<PriceLookupResult>;

const issuerLists: Record<StraumannGroupSupplier, readonly PriceListName[]> = {
  Straumann: ["straumann", "biomaterials"],
  Anthogyr: ["anthogyr"],
  Neodent: ["neodent"],
};

export function straumannGroupPriceLookup({
  findPrices,
  agreement,
  implantsPerYear,
}: {
  findPrices: (reference: string) => Promise<GroupPrice[]>;
  agreement: GroupAgreement;
  implantsPerYear: number | undefined;
}): StraumannGroupPriceLookup {
  return async (supplier, reference) => {
    const prices = await findPrices(reference);
    const fromIssuer = prices.filter((p) =>
      issuerLists[supplier].includes(p.list),
    );
    // A reference that only other brands of the group list: their smaller discount, never a saving overstated.
    const [price] = (fromIssuer.length > 0 ? fromIssuer : prices).toSorted(
      (a, b) =>
        agreement.discountBasisPoints[a.range] -
        agreement.discountBasisPoints[b.range],
    );
    if (!price) return { outcome: "unknownReference" };
    return {
      outcome: "agreement",
      cspUnitPriceCents: cspUnitPriceCents(
        agreement,
        price.range,
        price.cataloguePriceCents,
      ),
      rebateUnitCents: rebateUnitCents(
        agreement,
        price.range,
        price.cataloguePriceCents,
        implantsPerYear,
      ),
    };
  };
}
