import type { PriceLookup } from "./price-lookup";

export type CoompySettings = {
  apiUrl: string;
  tokenUrl: string;
  clientId: string;
  clientSecret: string;
};

type Offer = {
  provider: string;
  price: number;
  packQty?: number;
  matchedRef?: string;
};

type SearchPage = { content: { id: number; offers: Offer[] }[] };

export function coompyPriceLookup(
  settings: CoompySettings,
  fetchImpl: typeof fetch = fetch,
): PriceLookup {
  let token: { value: string; expiresAt: number } | undefined;
  return async (supplier, reference) => {
    if (!token || Date.now() >= token.expiresAt) {
      token = await requestToken(settings, fetchImpl);
    }
    const url = new URL(`${settings.apiUrl}/compare/products`);
    url.searchParams.set("q", reference);
    url.searchParams.set("providers", `${supplier},DoctorAI`);
    url.searchParams.set("size", "50");
    const response = await fetchImpl(url, {
      headers: { authorization: `Bearer ${token.value}` },
    });
    if (!response.ok) throw new Error(`Coompy answered ${response.status}`);
    const page: SearchPage = await response.json();
    const found = page.content.flatMap((product) => {
      const issuingOffer = product.offers.find(
        (offer) =>
          offer.provider === supplier &&
          offer.matchedRef !== undefined &&
          normalizedRef(offer.matchedRef) === normalizedRef(reference),
      );
      return issuingOffer ? [{ product, issuingOffer }] : [];
    });
    if (found.length === 0) return { outcome: "unknownReference" };
    if (found.length > 1) return { outcome: "ambiguous" };
    const [{ product, issuingOffer }] = found;
    const referenceOffer = product.offers.find(
      (o) => o.provider === "DoctorAI",
    );
    if (!referenceOffer) return { outcome: "absentAtReference" };
    return {
      outcome: "matched",
      productId: product.id,
      referenceUnitPriceCents: Math.round(referenceOffer.price * 100),
      issuingPackQty: issuingOffer.packQty,
      referencePackQty: referenceOffer.packQty,
    };
  };
}

async function requestToken(settings: CoompySettings, fetchImpl: typeof fetch) {
  const response = await fetchImpl(settings.tokenUrl, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: settings.clientId,
      client_secret: settings.clientSecret,
    }),
  });
  if (!response.ok) {
    throw new Error(`The identity server answered ${response.status}`);
  }
  const { access_token, expires_in } = await response.json();
  // Renewed a minute early, so that a token never expires on its way to Coompy.
  return {
    value: access_token as string,
    expiresAt: Date.now() + (expires_in - 60) * 1000,
  };
}

// Coompy's own normalisation (ScrapperUtils.normalizeRef): no accents, upper case, letters and digits only.
function normalizedRef(reference: string) {
  return reference
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}
