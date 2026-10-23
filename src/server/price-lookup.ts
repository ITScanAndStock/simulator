import "server-only";
import { coompyPriceLookup } from "@/price-lookup/coompy";
import { routedPriceLookup } from "@/price-lookup/routed";
import { straumannGroupPriceLookup } from "@/price-lookup/straumann-group";
import { findGroupPrices } from "@/straumann-group/price-list-store";
import { databasePool } from "./db";
import { coompySettings, straumannGroupAgreement } from "./settings";

export function priceLookup({
  implantsPerYear,
}: {
  implantsPerYear: number | undefined;
}) {
  return routedPriceLookup({
    coompy: coompyPriceLookup(coompySettings()),
    straumannGroup: straumannGroupPriceLookup({
      findPrices: (reference) => findGroupPrices(databasePool(), reference),
      agreement: straumannGroupAgreement(),
      implantsPerYear,
    }),
  });
}
