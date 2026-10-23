import "server-only";
import type { ContactDetails } from "@/contact-details";
import { databasePool } from "./db";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// A bound id forged in the no-JS form can be any JSON value,
// and test() would coerce ["<uuid>"] to a match.
function isSimulationId(id: unknown) {
  return typeof id === "string" && uuidPattern.test(id);
}

export async function startSimulation(details: ContactDetails) {
  const { rows } = await databasePool().query<{ id: string }>(
    `INSERT INTO simulation
       (email, practice, practitioner, phone, scan_and_stock_user, call_back,
        data_information_read_at)
     VALUES ($1, $2, $3, $4, $5, $6, CASE WHEN $7 THEN now() END)
     RETURNING id`,
    toParameters(details),
  );
  return rows[0].id;
}

export async function updateContactDetails(
  id: string,
  details: ContactDetails,
) {
  if (!isSimulationId(id)) return false;
  const { rowCount } = await databasePool().query(
    `UPDATE simulation SET
       email = $1, practice = $2, practitioner = $3, phone = $4,
       scan_and_stock_user = $5, call_back = $6,
       data_information_read_at = CASE WHEN $7 THEN coalesce(data_information_read_at, now()) END,
       updated_at = now()
     WHERE id = $8`,
    [...toParameters(details), id],
  );
  return rowCount === 1;
}

export async function findContactDetails(
  id: string,
): Promise<ContactDetails | undefined> {
  if (!isSimulationId(id)) return undefined;
  const { rows } = await databasePool().query<{
    email: string;
    practice: string;
    practitioner: string;
    phone: string;
    scan_and_stock_user: boolean;
    call_back: boolean;
    data_information_read: boolean;
  }>(
    `SELECT email, practice, practitioner, phone, scan_and_stock_user, call_back,
            data_information_read_at IS NOT NULL AS data_information_read
     FROM simulation WHERE id = $1`,
    [id],
  );
  const row = rows[0];
  if (!row) return undefined;
  return {
    email: row.email,
    practice: row.practice,
    practitioner: row.practitioner,
    phone: row.phone,
    scanAndStockUser: row.scan_and_stock_user,
    callBack: row.call_back,
    dataInformationRead: row.data_information_read,
  };
}

export async function simulationExists(id: string) {
  if (!isSimulationId(id)) return false;
  const { rowCount } = await databasePool().query(
    "SELECT 1 FROM simulation WHERE id = $1",
    [id],
  );
  return rowCount === 1;
}

function toParameters(details: ContactDetails) {
  return [
    details.email,
    details.practice,
    details.practitioner,
    details.phone,
    details.scanAndStockUser,
    details.callBack,
    details.dataInformationRead,
  ];
}
