export const groupRanges = [
  "straumann",
  "anthogyr",
  "neodent",
  "biomaterials",
  "xenograft",
] as const;

export type GroupRange = (typeof groupRanges)[number];

export type GroupAgreement = {
  discountBasisPoints: Record<GroupRange, number>;
  rebateTiers: { fromImplants: number; basisPoints: number }[];
};

const rebatedRanges: readonly GroupRange[] = [
  "straumann",
  "anthogyr",
  "neodent",
];

export function cspUnitPriceCents(
  agreement: GroupAgreement,
  range: GroupRange,
  cataloguePriceCents: number,
) {
  return Math.round(
    (cataloguePriceCents * (10000 - agreement.discountBasisPoints[range])) /
      10000,
  );
}

export function rebateUnitCents(
  agreement: GroupAgreement,
  range: GroupRange,
  cataloguePriceCents: number,
  implantsPerYear: number | undefined,
) {
  if (!rebatedRanges.includes(range) || implantsPerYear === undefined) return 0;
  const tier = agreement.rebateTiers.findLast(
    (t) => implantsPerYear >= t.fromImplants,
  );
  if (!tier) return 0;
  return Math.round((cataloguePriceCents * tier.basisPoints) / 10000);
}

export function isClearCorrect(designation: string) {
  return /clear\s*correct/i.test(designation);
}
