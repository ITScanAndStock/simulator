// Relative imports with extensions: scripts/check-settings.mts loads this module with plain Node.
import type { CoompySettings } from "./price-lookup/coompy.ts";
import { supplierNames, type SupplierCode } from "./supplier.ts";

const appEnvs = [
  "development",
  "test",
  "technical",
  "staging",
  "production",
] as const;

export type AppEnv = (typeof appEnvs)[number];

const allowedReferenceSuppliers: Record<AppEnv, readonly string[]> = {
  development: ["DoctorAI", "GACD"],
  test: Object.keys(supplierNames),
  technical: ["GACD"],
  staging: ["GACD"],
  production: ["GACD"],
};

export function appEnv(): AppEnv {
  const value = process.env.APP_ENV;
  const found = appEnvs.find((environment) => environment === value);
  if (!found) {
    throw new Error(
      `APP_ENV must be one of ${appEnvs.join(", ")}; it is "${value ?? ""}".`,
    );
  }
  if (process.env.VERCEL && (found === "development" || found === "test")) {
    throw new Error(
      `APP_ENV must be technical, staging or production on Vercel; it is "${found}".`,
    );
  }
  return found;
}

export function referenceSupplier(): SupplierCode {
  const value = process.env.REFERENCE_SUPPLIER ?? "";
  const environment = appEnv();
  const allowed = allowedReferenceSuppliers[environment];
  if (!allowed.includes(value)) {
    throw new Error(
      `REFERENCE_SUPPLIER must be ${allowed.join(" or ")} when APP_ENV is ${environment}; it is "${value}".`,
    );
  }
  return value as SupplierCode;
}

export function databaseUrl() {
  return required("DATABASE_URL");
}

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

const coompySettingNames = {
  apiUrl: "COOMPY_API_URL",
  tokenUrl: "COOMPY_TOKEN_URL",
  clientId: "COOMPY_CLIENT_ID",
  clientSecret: "COOMPY_CLIENT_SECRET",
} as const;

export function coompySettings(): CoompySettings {
  return {
    apiUrl: required(coompySettingNames.apiUrl),
    tokenUrl: required(coompySettingNames.tokenUrl),
    clientId: required(coompySettingNames.clientId),
    clientSecret: required(coompySettingNames.clientSecret),
    referenceSupplier: referenceSupplier(),
  };
}

export function validateSettings() {
  const checks = [
    appEnv,
    referenceSupplier,
    databaseUrl,
    ...Object.values(coompySettingNames).map((name) => () => required(name)),
    suspiciousSavingPercent,
    averageSavingEuros,
    calendlyUrl,
  ];
  const problems = checks.flatMap((check) => {
    try {
      check();
      return [];
    } catch (error) {
      return [(error as Error).message];
    }
  });
  if (problems.length > 0) {
    // A bad APP_ENV also fails the reference supplier, which depends on it: told once.
    throw new Error(
      `Invalid settings:\n- ${[...new Set(problems)].join("\n- ")}`,
    );
  }
}

function required(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set (see README).`);
  return value;
}
