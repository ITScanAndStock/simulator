import { afterEach, describe, expect, it, vi } from "vitest";
import {
  appEnv,
  maxInvoiceMegabytes,
  referenceSupplier,
  validateSettings,
} from "./settings";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("appEnv", () => {
  // Catches: one of the five environments of the spec refused.
  it.each(["development", "test", "technical", "staging", "production"])(
    "accepts %s",
    (value) => {
      vi.stubEnv("VERCEL", "");
      vi.stubEnv("APP_ENV", value);
      expect(appEnv()).toBe(value);
    },
  );

  // Catches: NODE_ENV's spelling, or a missing value read as development.
  it.each(["prod", "Production", ""])("refuses %j", (value) => {
    vi.stubEnv("APP_ENV", value);
    expect(appEnv).toThrow(/APP_ENV/);
  });

  // Catches: .env.example copied onto Vercel, which would let Doctor AI prices online.
  it.each(["development", "test"])("refuses %s on Vercel", (value) => {
    vi.stubEnv("VERCEL", "1");
    vi.stubEnv("APP_ENV", value);
    expect(appEnv).toThrow(/APP_ENV/);
  });

  // Catches: the Vercel guard refusing the environments it is meant for.
  it.each(["technical", "staging", "production"])(
    "accepts %s on Vercel",
    (value) => {
      vi.stubEnv("VERCEL", "1");
      vi.stubEnv("APP_ENV", value);
      expect(appEnv()).toBe(value);
    },
  );
});

describe("referenceSupplier", () => {
  // Catches: Doctor AI prices put online by a configuration mistake.
  it.each(["technical", "staging", "production"])(
    "refuses DoctorAI in %s",
    (environment) => {
      vi.stubEnv("APP_ENV", environment);
      vi.stubEnv("REFERENCE_SUPPLIER", "DoctorAI");
      expect(referenceSupplier).toThrow(/REFERENCE_SUPPLIER/);
    },
  );

  // Catches: Doctor AI refused on Robin's computer or in the journey tests.
  it.each(["development", "test"])("accepts DoctorAI in %s", (environment) => {
    vi.stubEnv("APP_ENV", environment);
    vi.stubEnv("REFERENCE_SUPPLIER", "DoctorAI");
    expect(referenceSupplier()).toBe("DoctorAI");
  });

  // Catches: GACD refused where it is the only reference allowed.
  it.each(["technical", "staging", "production"])(
    "accepts GACD in %s",
    (environment) => {
      vi.stubEnv("APP_ENV", environment);
      vi.stubEnv("REFERENCE_SUPPLIER", "GACD");
      expect(referenceSupplier()).toBe("GACD");
    },
  );

  // Catches: the journey tests unable to set a reference written nowhere in the code.
  it("accepts any supplier code in test", () => {
    vi.stubEnv("APP_ENV", "test");
    vi.stubEnv("REFERENCE_SUPPLIER", "Komet");
    expect(referenceSupplier()).toBe("Komet");
  });

  // Catches: the test-only freedom of the reference supplier reaching another environment.
  it("refuses another supplier code outside test", () => {
    vi.stubEnv("APP_ENV", "development");
    vi.stubEnv("REFERENCE_SUPPLIER", "Komet");
    expect(referenceSupplier).toThrow(/REFERENCE_SUPPLIER/);
  });

  // Catches: a misspelled supplier code sent to Coompy, which would find no reference price.
  it("refuses a value that is no supplier code, even in test", () => {
    vi.stubEnv("APP_ENV", "test");
    vi.stubEnv("REFERENCE_SUPPLIER", "Gacd");
    expect(referenceSupplier).toThrow(/REFERENCE_SUPPLIER/);
  });

  // Catches: a missing reference supplier read as a default one.
  it("refuses a missing value", () => {
    vi.stubEnv("APP_ENV", "development");
    vi.stubEnv("REFERENCE_SUPPLIER", "");
    expect(referenceSupplier).toThrow(/REFERENCE_SUPPLIER/);
  });
});

describe("maxInvoiceMegabytes", () => {
  // Catches: no maximum when the setting is left out, so screen 3 sends any file.
  it("is 4 by default", () => {
    vi.stubEnv("MAX_INVOICE_MEGABYTES", "");
    expect(maxInvoiceMegabytes()).toBe(4);
  });

  // Catches: the setting ignored in favour of the default.
  it("reads the setting", () => {
    vi.stubEnv("MAX_INVOICE_MEGABYTES", "9");
    expect(maxInvoiceMegabytes()).toBe(9);
  });

  // Catches: a maximum the server refuses (body limit 10 MB), or one no file can meet.
  it.each(["10", "0", "2.5", "4 Mo"])("refuses %j", (value) => {
    vi.stubEnv("MAX_INVOICE_MEGABYTES", value);
    expect(maxInvoiceMegabytes).toThrow(/MAX_INVOICE_MEGABYTES/);
  });
});

const validSettings = {
  APP_ENV: "staging",
  REFERENCE_SUPPLIER: "GACD",
  DATABASE_URL: "postgresql://user:password@db.example:5432/simulator",
  COOMPY_API_URL: "https://coompy.example/api",
  COOMPY_TOKEN_URL: "https://sso.example/token",
  COOMPY_CLIENT_ID: "csp-simulator",
  COOMPY_CLIENT_SECRET: "secret",
  SUSPICIOUS_SAVING_PERCENT: "",
  AVERAGE_SAVING_EUROS: "",
  CALENDLY_URL: "",
  MAX_INVOICE_MEGABYTES: "",
};

function stubSettings(overrides: Record<string, string> = {}) {
  for (const [name, value] of Object.entries({
    ...validSettings,
    ...overrides,
  })) {
    vi.stubEnv(name, value);
  }
}

describe("validateSettings", () => {
  // Catches: an optional setting left empty taken for an invalid one.
  it("accepts a complete set of settings", () => {
    stubSettings();
    expect(validateSettings).not.toThrow();
  });

  // Catches: a check that stops at the first bad setting, or one that skips a setting read later.
  it("names every invalid setting", () => {
    stubSettings({
      REFERENCE_SUPPLIER: "DoctorAI",
      DATABASE_URL: "",
      COOMPY_API_URL: "",
      COOMPY_TOKEN_URL: "",
      COOMPY_CLIENT_ID: "",
      COOMPY_CLIENT_SECRET: "",
      SUSPICIOUS_SAVING_PERCENT: "150",
      AVERAGE_SAVING_EUROS: "26 500",
      CALENDLY_URL: "http://calendly.example",
      MAX_INVOICE_MEGABYTES: "12",
    });
    for (const name of [
      "REFERENCE_SUPPLIER",
      "DATABASE_URL",
      "COOMPY_API_URL",
      "COOMPY_TOKEN_URL",
      "COOMPY_CLIENT_ID",
      "COOMPY_CLIENT_SECRET",
      "SUSPICIOUS_SAVING_PERCENT",
      "AVERAGE_SAVING_EUROS",
      "CALENDLY_URL",
      "MAX_INVOICE_MEGABYTES",
    ]) {
      expect(validateSettings).toThrow(name);
    }
  });
});
