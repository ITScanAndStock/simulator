import { isStraumannGroupSupplier } from "@/supplier";
import type { PriceLookup } from "./price-lookup";
import type { StraumannGroupPriceLookup } from "./straumann-group";

export function routedPriceLookup({
  coompy,
  straumannGroup,
}: {
  coompy: PriceLookup;
  straumannGroup: StraumannGroupPriceLookup;
}): PriceLookup {
  return (supplier, reference) =>
    isStraumannGroupSupplier(supplier)
      ? straumannGroup(supplier, reference)
      : coompy(supplier, reference);
}
