import { mkdirSync, writeFileSync } from "node:fs";
import { writePdf, type Page, type Text } from "./fake-pdf.mts";

// Layouts of the four real price lists; references, designations and prices are invented.
const landscape = { width: 1190, height: 842 };

function rowsFrom(
  top: number,
  rows: [x: number, text: string][][],
  step = 14,
): Text[] {
  return rows.flatMap((row, index) =>
    row.map(([x, text]): Text => [x, top - index * step, 7, text]),
  );
}

function straumann(): Page[] {
  const header: Text[] = [
    [53, 808, 9, "IEXCEL"],
    [53, 789, 9, "IMPLANTS"],
    [57, 753, 6, "RÉFÉRENCE"],
    [134, 753, 6, "DÉSIGNATION"],
    [403, 753, 6, "TARIF H .T EN"],
    [453, 753, 6, "€"],
    [478, 753, 6, "TARIF T.T.C EN"],
    [533, 753, 6, "€"],
  ];
  return [
    [
      [343, 722, 30, "IMPLANTS"],
      [261, 662, 30, "ET PROTHÈSES"],
      [366, 573, 12, "Liste des prix France 2031"],
    ],
    [
      ...header,
      [58, 738, 7, "TLC ROXOLID SLACTIVE"],
      ...rowsFrom(725, [
        [
          [58, "091.0008S"],
          [135, "Implant essai, Ø3.1mm NT, 8mm"],
          [415, "400,00 €"],
          [493, "480,00 €"],
        ],
        [
          [58, "091.0010S"],
          [135, "Implant essai, Ø3.1mm NT, 10mm"],
          [415, "410,00 €"],
          [493, "492,00 €"],
        ],
        [[59, "> PILIERS"]],
        [
          [58, "091.0200"],
          [135, "Boîtier de contrôle"],
          [411, "4 210,00 €"],
          [490, "5 052,00 €"],
        ],
      ]),
      // A designation printed on two lines, above and below its reference and prices.
      [135, 652, 7, "NT Pilier essai, avec vis, Ø 4.4mm,"],
      [59, 646, 7, "091.0300"],
      [417, 646, 7, "112,00 €"],
      [494, 646, 7, "134,40 €"],
      [135, 641, 7, "H 6mm, TIT"],
      // The page number lands on the row of the last reference.
      [23, 24, 7, "38"],
      [58, 23, 7, "091.0400"],
      [135, 23, 7, "NC Aide de finition"],
      [418, 23, 7, "69,00 €"],
      [495, 23, 7, "82,80 €"],
    ],
    [
      ...header,
      // The same reference listed again in another section, at the same price.
      ...rowsFrom(725, [
        [
          [58, "091.0008S"],
          [135, "Implant essai, Ø3.1mm NT, 8mm (rappel)"],
          [415, "400,00 €"],
          [493, "480,00 €"],
        ],
        [
          [58, "I-KX-Z"],
          [135, "Instrument, adaptateur pour pièce à main"],
          [418, "74,00 €"],
          [495, "88,80 €"],
        ],
      ]),
    ],
  ];
}

function anthogyr(): Page[] {
  const left = (y: number, cells: [string, string, string]): Text[] => [
    [33, y, 6, cells[0]],
    [106, y, 6, cells[1]],
    [528, y, 6, cells[2]],
  ];
  const right = (y: number, cells: [string, string, string]): Text[] => [
    [628, y, 6, cells[0]],
    [702, y, 6, cells[1]],
    [1124, y, 6, cells[2]],
  ];
  return [
    [
      [57, 739, 20, "TARIF FRANCE"],
      [57, 674, 20, "2031"],
    ],
    [
      [33, 648, 7, "IMPLANTS AXIOM® TL PLATEFORME N/4.0 MM"],
      [522, 648, 7, "PRIX € TTC"],
      [628, 648, 7, "IMPLANTS AXIOM® PX TL PLATEFORME R/4.8 MM"],
      [1120, 648, 7, "PRIX € TTC"],
      // The two columns print their rows at nearly the same height.
      ...left(634, [
        "TXA40100N1",
        "IMPLANT ESSAI TL N - Ø4.1 X 10",
        "263,40 €",
      ]),
      ...right(635, [
        "TPA34080R1",
        "IMPLANT ESSAI PX R - Ø3.6 X 8",
        "243,60 €",
      ]),
      ...left(621, ["MUKAP", "COIFFE DE GARDE MULTI-UNIT R", "53,40 €"]),
      ...right(621, ["EXA_KIT", "KIT 4 LEVIERS + 1 BOÎTE", "791,40 €"]),
      ...left(608, ["INMODOPS9", "TROUSSE DE CHIRURGIE ESSAI®", "4471,20 €"]),
      [618, 608, 6, "3.4. Conditions générales de vente, article"],
      [804, 608, 6, "8.1. Le retour de marchandise"],
    ],
  ];
}

function neodent(): Page[] {
  return [
    [[46, 759, 30, "Tarifs 2031"]],
    [
      [61, 748, 12, "IMPLANTS GRAND MORSE"],
      [38, 647, 8, "IMPLANTS HELIX GM® NEOPOROS"],
      [497, 647, 8, "PRIX (€)"],
      ...rowsFrom(633, [
        [
          [38, "190.943"],
          [112, "IMPLANT ESSAI GM, TI, 3.6X8"],
          [497, "166,80"],
        ],
        [
          [38, "190.1009"],
          [112, "IMPLANT ESSAI GM, TI, 6.1X8MM"],
          [497, "176,40"],
        ],
        [
          [38, "190.305"],
          [112, "KIT ESSAI PROTHÉTIQUE COMPLET GM"],
          [497, "1.012,80"],
        ],
      ]),
    ],
  ];
}

function biomaterials(): Page[] {
  const header = (x: number, y: number): Text[] => [
    [x, y, 6, "RÉFÉRENCE"],
    [x + 76, y, 6, "DÉSIGNATION"],
    [x + 331, y, 6, "TARIF H.T EN"],
    [x + 381, y, 6, "€"],
    [x + 416, y, 6, "TARIF T.T.C EN"],
    [x + 471, y, 6, "€"],
  ];
  return [
    [
      [28, 604, 20, "BIOMATÉRIAUX"],
      [28, 575, 12, "Liste des prix France 2031"],
    ],
    [
      [46, 797, 9, "RÉGÉNÉRATION"],
      [642, 797, 9, "RÉGÉNÉRATION"],
      ...header(57, 742),
      ...header(652, 742),
      ...rowsFrom(729, [
        [
          [58, "095.127W"],
          [135, "Gel essai 0.2 ml - 1 seringue"],
          [404, "97,00 €"],
          [490, "116,40 €"],
          [654, "S1-9210-025"],
          [730, "XenoGraft 300-900micron, 0.3g"],
          [1000, "80,00 €"],
          [1086, "84,40 €"],
        ],
        [
          [654, "NI-9110-005"],
          [730, "Straumann® XenoFlex 5x5x3mm, 40mg"],
          [1000, "70,00 €"],
          [1086, "73,85 €"],
        ],
        [
          [635, "SYNTHÉTIQUE"],
          [654, "BO-90120"],
          [730, "Granules essai 0.7-1.4mm(L), 2.5cc"],
          [999, "150,00 €"],
          [1086, "158,25 €"],
        ],
      ]),
    ],
  ];
}

mkdirSync("test-price-lists", { recursive: true });
writeFileSync(
  "test-price-lists/catalogue_straumann.pdf",
  writePdf(straumann()),
);
writeFileSync(
  "test-price-lists/catalogue_anthogyr.pdf",
  writePdf(anthogyr(), landscape),
);
writeFileSync("test-price-lists/catalogue_neodent.pdf", writePdf(neodent()));
writeFileSync(
  "test-price-lists/catalogue_biomateriaux.pdf",
  writePdf(biomaterials(), landscape),
);
