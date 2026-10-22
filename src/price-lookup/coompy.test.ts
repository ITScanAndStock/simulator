import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { SupplierCode } from "@/supplier";
import { coompyPriceLookup } from "./coompy";

const settings = {
  apiUrl: "http://coompy.test/api",
  tokenUrl: "http://sso.test/token",
  clientId: "csp-simulator",
  clientSecret: "test-secret",
  referenceSupplier: "DoctorAI" as const,
};

type Recording = { supplier: SupplierCode; reference: string; answer: unknown };

function recording(name: string): Recording {
  return JSON.parse(readFileSync(`test-coompy/${name}.json`, "utf8"));
}

// Plays the recorded answer only to the request that was recorded: same query,
// both suppliers in scope, a token from the token endpoint.
function fakeCoompy({ supplier, reference, answer }: Recording) {
  return async (input: string | URL | Request, init?: RequestInit) => {
    const url = new URL(input instanceof Request ? input.url : input);
    if (url.href === settings.tokenUrl) {
      return Response.json({ access_token: "token-1", expires_in: 300 });
    }
    const recorded =
      url.pathname === "/api/compare/products" &&
      new Headers(init?.headers).get("authorization") === "Bearer token-1" &&
      url.searchParams.get("q") === reference &&
      new Set(
        url.searchParams.get("providers")?.split(","),
      ).symmetricDifference(new Set([supplier, "DoctorAI"])).size === 0;
    return recorded
      ? Response.json(answer)
      : new Response(null, { status: 404 });
  };
}

async function lookUp(name: string) {
  const recorded = recording(name);
  const lookup = coompyPriceLookup(settings, fakeCoompy(recorded));
  return lookup(recorded.supplier, recorded.reference);
}

describe("coompyPriceLookup", () => {
  // Catches: the supplier's own price taken for the reference price.
  it("matches a reference carried by exactly one product, at its Doctor AI price", async () => {
    expect(await lookUp("exact")).toEqual({
      outcome: "matched",
      productId: 1020,
      referenceUnitPriceCents: 1274,
      issuingPackQty: undefined,
      referencePackQty: undefined,
    });
  });

  // Catches: Coompy's prefix match taken for the line's product.
  it("does not take a reference found only by its prefix", async () => {
    expect(await lookUp("prefix-only")).toEqual({
      outcome: "unknownReference",
    });
  });

  // Catches: an empty answer read as a product.
  it("reports a reference Coompy does not know", async () => {
    expect(await lookUp("none")).toEqual({ outcome: "unknownReference" });
  });

  // Catches: the first of two products carrying "10020" and "10/020" taken as the line's product,
  // or the separator kept so that only one of them counts.
  it("does not choose between several products carrying the reference", async () => {
    expect(await lookUp("several-products")).toEqual({ outcome: "ambiguous" });
  });

  // Catches: a product with no Doctor AI offer priced at its supplier's own price.
  it("reports a product that has no Doctor AI offer", async () => {
    expect(await lookUp("no-doctor-ai-offer")).toEqual({
      outcome: "absentAtReference",
    });
  });

  // Catches: a reference that only the Doctor AI offer carries taken as found at the issuing supplier.
  it("does not take a reference carried only by the Doctor AI offer", async () => {
    expect(await lookUp("doctor-ai-reference-only")).toEqual({
      outcome: "unknownReference",
    });
  });

  // Catches: the pack size of the product's other Komet offer (10) taken for the
  // one found by the reference (100), or the pack sizes not passed on at all.
  it("gives the pack sizes of the offer found and of the Doctor AI offer", async () => {
    expect(await lookUp("pack-sizes")).toMatchObject({
      outcome: "matched",
      issuingPackQty: 100,
      referencePackQty: 10,
    });
  });

  // Catches: one of several Doctor AI prices of the product picked as the reference price.
  it("does not choose between several Doctor AI prices of the product", async () => {
    expect(await lookUp("several-doctor-ai-prices")).toEqual({
      outcome: "ambiguous",
    });
  });

  // Catches: a Doctor AI line priced at another Doctor AI offer of the same product.
  it("prices a Doctor AI line at the Doctor AI offer it was found by", async () => {
    expect(await lookUp("doctor-ai-line-among-several")).toMatchObject({
      outcome: "matched",
      referenceUnitPriceCents: 3603,
    });
  });

  // Catches: a new token asked to the identity server for every line of the invoice.
  it("asks for one token for several lines", async () => {
    const recorded = recording("exact");
    const coompy = fakeCoompy(recorded);
    const requested: string[] = [];
    const lookup = coompyPriceLookup(settings, async (input, init) => {
      requested.push(new URL(String(input)).pathname);
      return coompy(input, init);
    });

    await lookup(recorded.supplier, recorded.reference);
    await lookup(recorded.supplier, recorded.reference);

    expect(requested).toEqual([
      "/token",
      "/api/compare/products",
      "/api/compare/products",
    ]);
  });

  // Catches: a refused request read as an answer with no product, so as a reference to study.
  it("fails when Coompy refuses the request", async () => {
    const recorded = recording("exact");
    const lookup = coompyPriceLookup(settings, fakeCoompy(recorded));

    await expect(lookup("Dentaltix", "NOT-RECORDED")).rejects.toThrow(
      "Coompy answered 404",
    );
  });
});
