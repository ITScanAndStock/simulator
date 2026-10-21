import { cleanup, render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";
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

type Props = ComponentProps<typeof ResultScreen>;

function show({
  result: overrides,
  ...props
}: { result?: Partial<Result> } & Partial<Omit<Props, "result">> = {}) {
  return render(
    <ResultScreen
      result={result(overrides)}
      scanAndStockUser={false}
      averageSavingEuros={undefined}
      calendlyUrl="https://calendly.example/default"
      {...props}
    />,
  );
}

const footnote = /^\* Certains produits n'ont pas pu être comparés/;

describe("ResultScreen", () => {
  // Catches: the share taken over the compared lines alone (100 %), or turned upside down.
  it("states the share of spending the comparison covers", () => {
    show();

    expect(screen.getByRole("group", { name: "Comparées" })).toHaveTextContent(
      "23 % du montant de vos factures",
    );
  });

  // Catches: a share rounded up to 100 % while some spending is left out, or an exact
  // share lost to floating point (29 / 100 × 100 is 28,999…).
  it("rounds the share down, and only below an exact percentage", () => {
    show({
      result: { paidCents: 996, productsPaidCents: 1000 },
    });
    expect(screen.getByRole("group", { name: "Comparées" })).toHaveTextContent(
      "99 % du montant de vos factures",
    );
    cleanup();

    show({ result: { paidCents: 29, productsPaidCents: 100 } });
    expect(screen.getByRole("group", { name: "Comparées" })).toHaveTextContent(
      "29 % du montant de vos factures",
    );
  });

  // Catches: "NaN %" on an invoice whose product lines were all free.
  it("states a share of zero when nothing was paid", () => {
    show({ result: { paidCents: 0, productsPaidCents: 0, savingCents: 0 } });

    expect(screen.getByRole("group", { name: "Comparées" })).toHaveTextContent(
      "0 % du montant de vos factures",
    );
  });

  // Catches: a saving read as covering every product while some could not be compared,
  // or an asterisk explaining a gap that does not exist.
  it("marks the saving with an asterisk only when some products are to study", () => {
    show({ result: { toStudyLines: 1 } });
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      /de moins\*$/,
    );
    expect(screen.getByRole("group", { name: "À étudier" })).toHaveTextContent(
      "1 produit*",
    );
    expect(screen.getByText(footnote)).toBeInTheDocument();
    cleanup();

    show({ result: { toStudyLines: 0 } });
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      /de moins$/,
    );
    expect(
      screen.getByRole("group", { name: "À étudier" }),
    ).not.toHaveTextContent("*");
    expect(screen.queryByText(footnote)).not.toBeInTheDocument();
  });

  // Catches: the Scan&Stock message shown to a prospect, or kept from a Scan&Stock user.
  it("speaks to a Scan&Stock user, and says nothing more to a prospect", () => {
    const message =
      "Vous utilisez déjà Scan&Stock : l’adhésion Club Santé Premium vous donnerait accès à ces tarifs.";

    show({ scanAndStockUser: true });
    expect(screen.getByText(message)).toBeInTheDocument();
    cleanup();

    show({ scanAndStockUser: false });
    expect(screen.queryByText(message)).not.toBeInTheDocument();
  });

  // Catches: the average figure written in the code instead of taken from the settings,
  // or a line shown with no figure set.
  it("puts the saving in perspective with the average figure, only when it is set", () => {
    show({ averageSavingEuros: 18400 });
    expect(screen.getByText(/^En moyenne/)).toHaveTextContent(
      "En moyenne, nos affiliés économisent 18 400 € par an",
    );
    cleanup();

    show({ averageSavingEuros: undefined });
    expect(screen.queryByText(/En moyenne/)).not.toBeInTheDocument();
  });

  // Catches: the Calendly link written in the code instead of taken from the settings,
  // or the meeting band without its title.
  it("books a meeting with an advisor at the configured link", () => {
    show({ calendlyUrl: "https://calendly.example/rendez-vous" });

    expect(
      screen.getByRole("link", {
        name: "Prendre rendez-vous avec un conseiller",
      }),
    ).toHaveAttribute("href", "https://calendly.example/rendez-vous");
    expect(
      screen.getByText("Obtenez le détail produit par produit"),
    ).toBeInTheDocument();
  });

  // Catches: "aux 1 produits à étudier", or alternatives promised when nothing is to study.
  it("offers alternatives to the products to study, when there are some", () => {
    const sentence = /^Un conseiller Club Santé Premium vous le présente/;
    show({ result: { toStudyLines: 3 } });
    expect(screen.getByText(sentence)).toHaveTextContent(
      "Un conseiller Club Santé Premium vous le présente et cherche avec vous des alternatives aux 3 produits à étudier.",
    );
    cleanup();

    show({ result: { toStudyLines: 1 } });
    expect(screen.getByText(sentence)).toHaveTextContent(
      "Un conseiller Club Santé Premium vous le présente et cherche avec vous des alternatives au produit à étudier.",
    );
    cleanup();

    show({ result: { toStudyLines: 0 } });
    expect(screen.getByText(sentence)).toHaveTextContent(
      /^Un conseiller Club Santé Premium vous le présente\.$/,
    );
  });

  // Catches: amounts compared without saying they are tax-inclusive.
  it("says the prices compared are tax-inclusive", () => {
    show();

    expect(
      screen.getByText(
        "Comparaison sur les prix unitaires des produits identiques, prix TTC, hors frais de port. Estimation non contractuelle.",
      ),
    ).toBeInTheDocument();
  });

  // Catches: Doctor AI amounts taken for Club Santé Premium prices during the trial.
  it("says the reference price is Doctor AI pending GACD", () => {
    show();

    expect(
      screen.getByText(
        "Version d'essai : le prix de référence est celui de Doctor AI, en attendant les tarifs GACD. Les montants ne sont pas des tarifs Club Santé Premium.",
      ),
    ).toBeInTheDocument();
  });
});
