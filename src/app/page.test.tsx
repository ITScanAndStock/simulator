import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import Home from "./page";

test("the home page asks what the practice would pay with Club Santé Premium", () => {
  render(<Home />);

  expect(
    screen.getByRole("heading", {
      level: 1,
      name: "Combien paieriez-vous vos consommables avec Club Santé Premium\u00a0?",
    }),
  ).toBeInTheDocument();
});
