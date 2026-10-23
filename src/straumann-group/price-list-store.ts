// Relative imports with extensions: scripts/import-price-lists.mts loads this module with plain Node.
import type { ClientBase, Pool } from "pg";
import type { GroupRange } from "./agreement.ts";
import type { PriceList, PriceListName } from "./read-price-list.ts";

export type GroupPrice = {
  list: PriceListName;
  range: GroupRange;
  cataloguePriceCents: number;
};

// Inside the caller's transaction: the previous import is replaced as a whole or not at all.
export async function replacePriceLists(
  client: ClientBase,
  lists: PriceList[],
) {
  await client.query("DELETE FROM group_price");
  for (const { list, year, rows } of lists) {
    await client.query(
      `INSERT INTO group_price
         (list, reference, designation, range, catalogue_price_cents, vat_rate, price_list_year)
       SELECT $1, reference, designation, range, price, vat_rate, $2
       FROM unnest($3::text[], $4::text[], $5::text[], $6::int[], $7::numeric[])
         AS row(reference, designation, range, price, vat_rate)`,
      [
        list,
        year,
        rows.map((row) => row.reference),
        rows.map((row) => row.designation),
        rows.map((row) => row.range),
        rows.map((row) => row.cataloguePriceCents),
        rows.map((row) => row.vatRate ?? null),
      ],
    );
  }
}

export async function findGroupPrices(
  db: Pool | ClientBase,
  reference: string,
): Promise<GroupPrice[]> {
  const { rows } = await db.query<GroupPrice>(
    `SELECT list, range, catalogue_price_cents AS "cataloguePriceCents"
     FROM group_price WHERE reference = $1`,
    [reference],
  );
  return rows;
}
