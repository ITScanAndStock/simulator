export type CoompySupplierCode =
  | "DPI"
  | "DentalGoodDeal"
  | "Dentalclick"
  | "Dentalprive"
  | "Dentaltix"
  | "DoctorStrong"
  | "DoctorAI"
  | "GACD"
  | "Godentaire"
  | "HenrySchein"
  | "Komet"
  | "Megadental"
  | "Pred";

// Priced from the group's price lists and the CSP agreement, never through Coompy.
const straumannGroupSuppliers = ["Straumann", "Anthogyr", "Neodent"] as const;

export type StraumannGroupSupplier = (typeof straumannGroupSuppliers)[number];

export type SupplierCode = CoompySupplierCode | StraumannGroupSupplier;

export function isStraumannGroupSupplier(
  supplier: SupplierCode,
): supplier is StraumannGroupSupplier {
  return (straumannGroupSuppliers as readonly string[]).includes(supplier);
}

export const supplierNames: Record<SupplierCode, string> = {
  DPI: "DPI",
  DentalGoodDeal: "Dental Good Deal",
  Dentalclick: "Dentalclick",
  Dentalprive: "Dentalprive",
  Dentaltix: "Dentaltix",
  DoctorStrong: "Doctor Strong",
  DoctorAI: "Doctor AI",
  GACD: "GACD",
  Godentaire: "Go!dentaire",
  HenrySchein: "Henry Schein",
  Komet: "Komet",
  Megadental: "Mega Dental",
  Pred: "Pred",
  Straumann: "Straumann",
  Anthogyr: "Anthogyr",
  Neodent: "Neodent",
};
