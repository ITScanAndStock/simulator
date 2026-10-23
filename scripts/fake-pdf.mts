export type Text = [x: number, y: number, size: number, text: string];
export type Page = Text[];

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

export function writePdf(pages: Page[], { width = 595, height = 842 } = {}) {
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
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${width} ${height}] /Resources << /Font << /F1 3 0 R >> >> /Contents ${objects.length} 0 R >>`,
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
