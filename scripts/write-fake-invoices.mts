import { writeFileSync } from "node:fs";

type Text = [x: number, y: number, size: number, text: string];
type Page = Text[];

const doctorAiLines: {
  reference: string;
  designation: Text[];
  quantity: string;
  listPrice: string;
  discount: string;
  unitPrice: string;
  amount: string;
  index?: string;
  below: string[];
}[] = [
  {
    reference: "412–0815",
    designation: [[82, 0, 7, "# DESINFECTANT SURFACES SANS ALCOOL 1L"]],
    quantity: "1.0",
    listPrice: "30.00",
    discount: "20.00%",
    unitPrice: "24.00",
    amount: "24.00",
    below: ["Boite/1"],
  },
  {
    reference: "512–3344",
    designation: [
      [82, 0, 7, "GANTS NITRILE NON POUDRES T.M (100)"],
      [241, 0, 7, "ACME"],
    ],
    quantity: "3.0",
    listPrice: "9.90",
    discount: "10.00%",
    unitPrice: "8.91",
    amount: "26.73",
    below: [],
  },
  {
    reference: "233–1001",
    designation: [
      [82, 0, 7, "#LQ*ALCOOL MODIFIE 70% 5L"],
      [200, 0, 7, "PHARMA"],
    ],
    quantity: "2.0",
    listPrice: "15.00",
    discount: "16.67%",
    unitPrice: "12.50",
    amount: "25.00",
    index: "LQ",
    below: ["Boite/1", "UN code: 1170"],
  },
  {
    reference: "233–1002",
    designation: [[82, 0, 7, "COMPRESSES STERILES – 7,5X7,5CM (50)"]],
    quantity: "1.0",
    listPrice: "6.00",
    discount: "25.00%",
    unitPrice: "4.50",
    amount: "4.50",
    below: [],
  },
];

function doctorAiInvoice(lines = doctorAiLines, netToPay = "80.23 €"): Page[] {
  const first: Page = [
    ...spacedBarcode(49, 805, 15, "1E000000001"),
    [23, 795, 7, "BORDEREAU : 1000001"],
    [140, 795, 7, "PICKLIST : 2000002/R1"],
    [536, 767, 8, "Doctor AI"],
    [487, 758, 8, "88 Avenue de Wagram"],
    [23, 751, 8, "N° Client : 100000"],
    [523, 749, 8, "75017 PARIS"],
    [23, 743, 8, "N° FACTURE : 3000003"],
    [131, 743, 8, "Date : 01 / 01 / 2026"],
    [507, 740, 8, "www.doctor–ai.fr"],
    [30, 668, 8, "CABINET DENTAIRE EXEMPLE (100000)"],
    [30, 658, 8, "1 RUE DE L'EXEMPLE"],
    [30, 647, 8, "00000 VILLE"],
    [207, 592, 10, "FACTURE REGLEE A LA COMMANDE"],
    [49, 565, 7, "Code"],
    [304, 565, 7, "Qté"],
    [330, 565, 7, "Qté"],
    [357, 565, 7, "Tarif de"],
    [426, 565, 7, "Prix Unit."],
    [467, 565, 7, "Prix Total"],
    [167, 562, 7, "Désignation"],
    [393, 562, 7, "Remise"],
    [506, 562, 7, "TVA %"],
    [535, 562, 7, "Index"],
    [47, 558, 7, "Article"],
    [303, 558, 7, "Cde"],
    [325, 558, 7, "Livrée"],
    [354, 558, 7, "référence"],
    [426, 558, 7, "Net T.T.C"],
    [467, 558, 7, "Net T.T.C"],
  ];
  let y = 542;
  for (const line of lines) {
    first.push(
      [43, y, 7, line.reference],
      ...line.designation.map(([x, , size, text]): Text => [x, y, size, text]),
      [308, y, 7, line.quantity],
      [336, y, 7, line.quantity],
      [364, y, 7, line.listPrice],
      [395, y, 7, line.discount],
      [440, y, 7, line.unitPrice],
      [481, y, 7, line.amount],
      [514, y, 7, "20.0"],
    );
    if (line.index) first.push([552, y, 6, line.index]);
    for (const text of line.below) first.push([89, (y -= 11), 7, text]);
    y -= 12;
  }
  first.push(
    [83, (y -= 9), 7, "*"],
    [89, (y -= 13), 7, "SURCOUT TRANSPORT DU A L'AUGMENTATION"],
    [89, (y -= 11), 7, "DES CARBURANTS OFFERT"],
    [87, 328, 7, "MONTANT H.T."],
    [326, 328, 7, "MONTANT T.V.A."],
    [210, 325, 7, "TOTAL H.T."],
    [448, 325, 7, "TOTAL T.V.A."],
    [513, 324, 7, "NET A PAYER"],
    [32, 322, 6, "20.0"],
    [30, 310, 6, "66.86"],
    [218, 310, 7, "66.86"],
    [462, 310, 7, "13.37"],
    [523, 307, 8, netToPay],
    [23, 286, 6, "SIEGE SOCIAL : Doctor AI – 88, Avenue Wagram – 75017 PARIS"],
    [23, 280, 6, "N° CLIENT T.V.A. FR40 824 423 735 – APE : 4646Z"],
    [37, 16, 7, "Page : 1 / 1"],
  );
  const packingList: Page = [
    [315, 813, 10, "Num. Colisage :"],
    ...spacedBarcode(474, 786, 12.5, "E10000007"),
    [321, 769, 10, "CODE"],
    [418, 769, 10, "DESIGNATION"],
    [554, 769, 10, "QTE"],
    [320, 754, 7, "512–3344"],
    [358, 754, 5.6, "GANTS NITRILE NON POUDRES T.M (100)"],
    [490, 754, 5.6, "ACME"],
    [571, 754, 7, "3"],
    [320, 742, 7, "233–1001"],
    [358, 742, 5.6, "#LQ*ALCOOL MODIFIE 70% 5L"],
    [480, 742, 5.6, "PHARMA"],
    [571, 742, 7, "2"],
    [15, 299, 7.5, "Exp : Like Dental – Doctor AI"],
  ];
  return [first, packingList];
}

function spacedBarcode(x: number, y: number, step: number, code: string) {
  return [...code].map((char, i): Text => [x + i * step, y, 7, char]);
}

function doctorAiWithoutLines(): Page[] {
  return [
    [
      [536, 767, 8, "Doctor AI"],
      [23, 280, 6, "N° CLIENT T.V.A. FR40 824 423 735 – APE : 4646Z"],
    ],
  ];
}

function stockExport(): Page[] {
  return [
    [
      [30, 800, 9, "STOCK EN DATE DU: 01-01-2026"],
      [30, 780, 8, "Référence"],
      [100, 780, 8, "Désignation"],
      [300, 780, 8, "Fournisseur"],
      [400, 780, 8, "Prix"],
      [450, 780, 8, "Stock"],
      [30, 765, 8, "412–0815"],
      [100, 765, 8, "DESINFECTANT SURFACES SANS ALCOOL 1L"],
      [300, 765, 8, "Doctor AI"],
      [400, 765, 8, "24.00"],
      [450, 765, 8, "2"],
    ],
  ];
}

const winAnsi = new Map([
  ["€", 0x80],
  ["’", 0x92],
  ["–", 0x96],
]);

function encode(text: string) {
  const bytes = [...text].map((char) => {
    const code = winAnsi.get(char) ?? char.codePointAt(0)!;
    if (code > 0xff || (code >= 0x80 && code < 0xa0 && !winAnsi.has(char))) {
      throw new Error(`No WinAnsi byte for "${char}"`);
    }
    return code;
  });
  return Buffer.from(bytes)
    .toString("latin1")
    .replace(/[\\()]/g, (char) => `\\${char}`);
}

function writePdf(pages: Page[]) {
  const objects: string[] = [];
  const add = (body: string) => objects.push(body);
  add("<< /Type /Catalog /Pages 2 0 R >>");
  add("");
  add(
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
  );
  const pageIds: number[] = [];
  for (const page of pages) {
    const stream = page
      .map(
        ([x, y, size, text]) =>
          `BT /F1 ${size} Tf ${x} ${y} Td (${encode(text)}) Tj ET`,
      )
      .join("\n");
    add(
      `<< /Length ${Buffer.byteLength(stream, "latin1")} >>\nstream\n${stream}\nendstream`,
    );
    add(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents ${objects.length} 0 R >>`,
    );
    pageIds.push(objects.length);
  }
  objects[1] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pages.length} >>`;

  let pdf = "%PDF-1.4\n";
  const offsets = objects.map((body, index) => {
    const offset = Buffer.byteLength(pdf, "latin1");
    pdf += `${index + 1} 0 obj\n${body}\nendobj\n`;
    return offset;
  });
  const xref = Buffer.byteLength(pdf, "latin1");
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  pdf += offsets
    .map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`)
    .join("");
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(pdf, "latin1");
}

writeFileSync("test-invoices/doctor-ai-fake.pdf", writePdf(doctorAiInvoice()));
writeFileSync(
  "test-invoices/doctor-ai-misread-quantity-fake.pdf",
  writePdf(
    doctorAiInvoice(
      doctorAiLines.map((line) =>
        line.reference === "512–3344" ? { ...line, quantity: "2.0" } : line,
      ),
    ),
  ),
);
writeFileSync(
  "test-invoices/doctor-ai-without-lines-fake.pdf",
  writePdf(doctorAiWithoutLines()),
);
writeFileSync(
  "test-invoices/doctor-ai-total-off-fake.pdf",
  writePdf(doctorAiInvoice(doctorAiLines, "85.00 €")),
);
writeFileSync("test-invoices/stock-export-fake.pdf", writePdf(stockExport()));
