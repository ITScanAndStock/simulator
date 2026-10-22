import { createServer } from "node:http";

const token = "e2e-token";

const askedProviders: string[][] = [];

// A reference starting with "PANNE-" makes Coompy fail once, then is unknown: Coompy is back.
const failedOnce = new Set<string>();

// Reference prices of the references of test-invoices/doctor-ai-fake.pdf; a reference left out is unknown.
const prices: Record<string, number> = {
  "412-0815": 25,
  "512-3344": 8,
  "233-1002": 4.05,
};

createServer((request, response) => {
  const url = new URL(request.url ?? "/", "http://fake-coompy");
  if (request.method === "POST" && url.pathname === "/token") {
    return json(response, 200, {
      access_token: token,
      expires_in: 3600,
    });
  }
  // Answers the readiness check of Playwright.
  if (url.pathname === "/") return json(response, 200, {});
  if (url.pathname === "/requests") return json(response, 200, askedProviders);
  if (request.headers.authorization !== `Bearer ${token}`) {
    return json(response, 401, {});
  }
  if (url.pathname !== "/api/compare/products") return json(response, 404, {});
  const reference = url.searchParams.get("q") ?? "";
  const providers = url.searchParams.get("providers")?.split(",") ?? [];
  askedProviders.push(providers);
  if (reference.startsWith("PANNE-") && !failedOnce.has(reference)) {
    failedOnce.add(reference);
    return json(response, 503, {});
  }
  const price = prices[reference];
  const content =
    price === undefined
      ? []
      : [
          {
            id: 1,
            designation: "Produit",
            offers: [...new Set(providers)].map((provider, index) =>
              // The invoices' supplier carries the line's reference, at another price than the
              // reference supplier's, so that a saving taken on its offer shows.
              provider === "DoctorAI"
                ? {
                    id: index + 1,
                    provider,
                    price: price * 2,
                    currency: "EUR",
                    matchedRef: reference,
                  }
                : { id: index + 1, provider, price, currency: "EUR" },
            ),
          },
        ];
  json(response, 200, {
    content,
    page: 0,
    size: 50,
    total: content.length,
    totalOffers: content.length,
  });
}).listen(Number(process.env.FAKE_COOMPY_PORT), "127.0.0.1");

function json(
  response: import("node:http").ServerResponse,
  status: number,
  body: unknown,
) {
  response.writeHead(status, { "content-type": "application/json" });
  response.end(JSON.stringify(body));
}
