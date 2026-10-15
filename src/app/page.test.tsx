import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import Home from "./page";

test("the home page names the simulator in its main heading", () => {
  render(<Home />);

  expect(
    screen.getByRole("heading", { level: 1, name: "Simulateur d'économies Club Santé Premium" }),
  ).toBeInTheDocument();
});
