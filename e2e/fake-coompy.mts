import { createServer } from "node:http";

const token = "e2e-token";

// Prices of the references of test-invoices/doctor-ai-fake.pdf; a reference left out is unknown.
const doctorAiPrices: Record<string, number> = {
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
  if (request.headers.authorization !== `Bearer ${token}`) {
    return json(response, 401, {});
  }
  if (url.pathname !== "/api/compare/products") return json(response, 404, {});
  const reference = url.searchParams.get("q") ?? "";
  const price = doctorAiPrices[reference];
  const content =
    price === undefined
      ? []
      : [
          {
            id: 1,
            designation: "Produit",
            offers: [
              {
                id: 1,
                provider: "DoctorAI",
                price,
                currency: "EUR",
                matchedRef: reference,
              },
            ],
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
