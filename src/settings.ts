// Relative imports with extensions: scripts/check-settings.mts loads this module with plain Node.
import type { CoompySettings } from "./price-lookup/coompy.ts";
import {
  groupRanges,
  type GroupAgreement,
  type GroupRange,
} from "./straumann-group/agreement.ts";
import {
  isStraumannGroupSupplier,
  supplierNames,
  type CoompySupplierCode,
  type SupplierCode,
} from "./supplier.ts";

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
  test: (Object.keys(supplierNames) as SupplierCode[]).filter(
    (code) => !isStraumannGroupSupplier(code),
  ),
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

export function referenceSupplier(): CoompySupplierCode {
  const value = process.env.REFERENCE_SUPPLIER ?? "";
  const environment = appEnv();
  const allowed = allowedReferenceSuppliers[environment];
  if (!allowed.includes(value)) {
    throw new Error(
      `REFERENCE_SUPPLIER must be ${allowed.join(" or ")} when APP_ENV is ${environment}; it is "${value}".`,
    );
  }
  return value as CoompySupplierCode;
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

// Kept under the Server Action body limit of next.config.ts (10 MB), form encoding included.
const maxAllowedInvoiceMegabytes = 9;

export function maxInvoiceMegabytes() {
  const value = process.env.MAX_INVOICE_MEGABYTES;
  if (value === undefined || value === "") return 4;
  const megabytes = Number(value);
  if (
    !/^\d+$/.test(value) ||
    megabytes < 1 ||
    megabytes > maxAllowedInvoiceMegabytes
  ) {
    throw new Error(
      `MAX_INVOICE_MEGABYTES must be a whole number of megabytes from 1 to ${maxAllowedInvoiceMegabytes}; it is "${value}".`,
    );
  }
  return megabytes;
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

const discountsName = "STRAUMANN_GROUP_DISCOUNTS";
const rebateTiersName = "STRAUMANN_GROUP_REBATE_TIERS";

export function straumannGroupAgreement(): GroupAgreement {
  return {
    discountBasisPoints: groupDiscounts(required(discountsName)),
    rebateTiers: rebateTiers(required(rebateTiersName)),
  };
}

function groupDiscounts(value: string) {
  const refused = () =>
    new Error(
      `${discountsName} must give each range of ${groupRanges.join(", ")} once, as range=percent from 0 to below 100 separated by commas (its value is confidential and not shown).`,
    );
  const discounts = new Map<string, number>();
  for (const pair of value.split(",")) {
    const [range, percent] = pair.split("=");
    const basisPoints = percentBasisPoints(percent ?? "");
    if (discounts.has(range) || basisPoints === undefined) throw refused();
    discounts.set(range, basisPoints);
  }
  if (
    discounts.size !== groupRanges.length ||
    !groupRanges.every((range) => discounts.has(range))
  ) {
    throw refused();
  }
  return Object.fromEntries(discounts) as Record<GroupRange, number>;
}

function rebateTiers(value: string) {
  const refused = () =>
    new Error(
      `${rebateTiersName} must list the tiers as implants=percent, from 1 implant up, in increasing order of implants, each percentage above 0 and below 100 (its value is confidential and not shown).`,
    );
  const tiers = value.split(",").map((pair) => {
    const [from, percent] = pair.split("=");
    const basisPoints = percentBasisPoints(percent ?? "");
    if (!/^\d+$/.test(from) || !basisPoints) throw refused();
    return { fromImplants: Number(from), basisPoints };
  });
  const ascending = tiers.every(
    (tier, index) =>
      tier.fromImplants > (index === 0 ? 0 : tiers[index - 1].fromImplants),
  );
  if (!ascending) throw refused();
  return tiers;
}

// In basis points so that the prices are computed in whole numbers; two decimals at most.
function percentBasisPoints(value: string) {
  if (!/^\d{1,2}(\.\d{1,2})?$/.test(value)) return undefined;
  const [units, decimals = ""] = value.split(".");
  return Number(units) * 100 + Number(decimals.padEnd(2, "0"));
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
    maxInvoiceMegabytes,
    () => groupDiscounts(required(discountsName)),
    () => rebateTiers(required(rebateTiersName)),
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
