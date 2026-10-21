import "server-only";
import type { CoompySettings } from "@/price-lookup/coompy";

export function suspiciousSavingPercent() {
  const value = process.env.SUSPICIOUS_SAVING_PERCENT;
  if (value === undefined || value === "") return 50;
  const percent = Number(value);
  if (!Number.isFinite(percent) || percent <= 0 || percent > 100) {
    throw new Error(
      `SUSPICIOUS_SAVING_PERCENT must be a percentage above 0 and up to 100; it is "${value}".`,
    );
  }
  return percent;
}

export function coompySettings(): CoompySettings {
  return {
    apiUrl: required("COOMPY_API_URL"),
    tokenUrl: required("COOMPY_TOKEN_URL"),
    clientId: required("COOMPY_CLIENT_ID"),
    clientSecret: required("COOMPY_CLIENT_SECRET"),
  };
}

function required(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set (see README).`);
  return value;
}
