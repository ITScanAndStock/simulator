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

export function averageSavingEuros() {
  const value = process.env.AVERAGE_SAVING_EUROS;
  if (value === undefined || value === "") return undefined;
  const euros = Number(value);
  if (!/^\d+$/.test(value) || euros <= 0) {
    throw new Error(
      `AVERAGE_SAVING_EUROS must be a whole number of euros above 0; it is "${value}".`,
    );
  }
  return euros;
}

export function calendlyUrl() {
  const value = process.env.CALENDLY_URL;
  if (value === undefined || value === "") {
    return "https://calendly.com/clubsantepremium-rdvoffert/1h";
  }
  if (!URL.canParse(value) || new URL(value).protocol !== "https:") {
    throw new Error(`CALENDLY_URL must be an https:// link; it is "${value}".`);
  }
  return value;
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
