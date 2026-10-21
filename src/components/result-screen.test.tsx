import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Result } from "@/server/invoices";
import { ResultScreen } from "./result-screen";

function result(overrides: Partial<Result> = {}): Result {
  return {
    invoices: 1,
    paidCents: 3600,
    productsPaidCents: 15400,
    savingCents: 600,
    productLines: 4,
    comparedLines: 1,
    toStudyLines: 1,
    alreadyCheaperLines: 1,
    ...overrides,
  };
}

describe("ResultScreen", () => {
  // Catches: the share taken over the compared lines alone (100 %), or turned upside down.
  it("states the share of spending the comparison covers", () => {
    render(<ResultScreen result={result()} />);

    expect(screen.getByRole("group", { name: "Comparées" })).toHaveTextContent(
      "23 % du montant de vos factures",
    );
  });

  // Catches: a share rounded up to 100 % while some spending is left out, or an exact
  // share lost to floating point (29 / 100 × 100 is 28,999…).
  it("rounds the share down, and only below an exact percentage", () => {
    render(
      <ResultScreen
        result={result({ paidCents: 996, productsPaidCents: 1000 })}
      />,
    );
    expect(screen.getByRole("group", { name: "Comparées" })).toHaveTextContent(
      "99 % du montant de vos factures",
    );

    render(
      <ResultScreen
        result={result({ paidCents: 29, productsPaidCents: 100 })}
      />,
    );
    expect(
      screen.getAllByRole("group", { name: "Comparées" })[1],
    ).toHaveTextContent("29 % du montant de vos factures");
  });

  // Catches: "NaN %" on an invoice whose product lines were all free.
  it("states a share of zero when nothing was paid", () => {
    render(
      <ResultScreen
        result={result({ paidCents: 0, productsPaidCents: 0, savingCents: 0 })}
      />,
    );

    expect(screen.getByRole("group", { name: "Comparées" })).toHaveTextContent(
      "0 % du montant de vos factures",
    );
  });
});
