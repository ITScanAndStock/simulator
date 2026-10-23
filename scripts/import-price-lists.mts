import { readFile } from "node:fs/promises";
import path from "node:path";
import pg from "pg";
import { replacePriceLists } from "../src/straumann-group/price-list-store.ts";
import {
  priceListFiles,
  readPriceList,
  type PriceList,
  type PriceListName,
} from "../src/straumann-group/read-price-list.ts";

function refuse(message: string): never {
  console.error(message);
  process.exit(1);
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) refuse("DATABASE_URL is not set (see README).");
const folder = process.env.STRAUMANN_PRICE_LISTS_DIR;
if (!folder) refuse("STRAUMANN_PRICE_LISTS_DIR is not set (see README).");

// Every list is read before anything is written: a missing or unreadable one leaves the previous import in place.
const lists: PriceList[] = [];
for (const [list, file] of Object.entries(priceListFiles) as [
  PriceListName,
  string,
][]) {
  let bytes: Buffer;
  try {
    bytes = await readFile(path.join(folder, file));
  } catch {
    refuse(`Cannot read ${file} in ${folder}. Nothing was imported.`);
  }
  try {
    lists.push(await readPriceList(new Uint8Array(bytes), list));
  } catch (error) {
    refuse(`${file}: ${(error as Error).message} Nothing was imported.`);
  }
}

const client = new pg.Client({ connectionString });
await client.connect();
try {
  await client.query("BEGIN");
  await replacePriceLists(client, lists);
  await client.query("COMMIT");
} catch (error) {
  await client
    .query("ROLLBACK")
    .catch((rollbackError: unknown) =>
      console.error("ROLLBACK failed:", rollbackError),
    );
  throw error;
} finally {
  await client.end();
}
for (const { list, year, rows } of lists) {
  console.log(`${list}: ${rows.length} references (price list ${year})`);
}
