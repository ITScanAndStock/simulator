import { writeFileSync } from "node:fs";

// Kept in step with the cases of src/price-lookup/coompy.test.ts.
const cases = [
  { name: "exact", supplier: "Dentaltix", reference: "3M006053" },
  { name: "prefix-only", supplier: "Dentaltix", reference: "0000100" },
  { name: "several-products", supplier: "Dentaltix", reference: "10020" },
  {
    name: "no-doctor-ai-offer",
    supplier: "Dentaltix",
    reference: "HF-0660I-R2",
  },
  { name: "none", supplier: "Dentaltix", reference: "ZZZ-NOTHING-123" },
  {
    name: "doctor-ai-reference-only",
    supplier: "Dentaltix",
    reference: "890-9385",
  },
  { name: "pack-sizes", supplier: "Komet", reference: "9641.104.100 VPE 100" },
];

type Offer = Record<string, unknown> & { provider: string; packQty?: number };
type Product = Record<string, unknown> & { id: number; offers: Offer[] };
type Answer = Record<string, unknown> & { content: Product[] };

function setting(name: string) {
  const value = process.env[name];
  if (!value) {
    console.error(`${name} is not set (see README).`);
    process.exit(1);
  }
  return value;
}

const tokenResponse = await fetch(setting("COOMPY_TOKEN_URL"), {
  method: "POST",
  headers: { "content-type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams({
    grant_type: "client_credentials",
    client_id: setting("COOMPY_CLIENT_ID"),
    client_secret: setting("COOMPY_CLIENT_SECRET"),
  }),
});
if (!tokenResponse.ok) {
  console.error(`The token request answered ${tokenResponse.status}.`);
  process.exit(1);
}
const { access_token: token } = await tokenResponse.json();

// Doctor AI prices must stay on this computer (legal note J9): every price is
// replaced, and the supplier's own wording, links and images are left out.
let fakePriceCents = 1000;
function anonymised(answer: Answer): Answer {
  return {
    ...answer,
    content: answer.content.map((product, index) => ({
      id: product.id,
      designation: `Produit ${index + 1}`,
      offers: product.offers.map((offer) => {
        fakePriceCents += 137;
        return {
          id: offer.id,
          provider: offer.provider,
          price: fakePriceCents / 100,
          currency: offer.currency,
          ...(offer.packQty === undefined ? {} : { packQty: offer.packQty }),
          ...(offer.matchedRef === undefined
            ? {}
            : { matchedRef: offer.matchedRef }),
        };
      }),
    })),
  };
}

for (const { name, supplier, reference } of cases) {
  const url = new URL(`${setting("COOMPY_API_URL")}/compare/products`);
  url.searchParams.set("q", reference);
  url.searchParams.set("providers", `${supplier},DoctorAI`);
  url.searchParams.set("size", "50");
  const response = await fetch(url, {
    headers: { authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    console.error(`${name}: GET /products answered ${response.status}.`);
    process.exit(1);
  }
  const answer = anonymised(await response.json());
  writeFileSync(
    `test-coompy/${name}.json`,
    `${JSON.stringify({ supplier, reference, answer }, null, 2)}\n`,
  );
  console.log(`${name}: ${answer.content.length} products`);
}
