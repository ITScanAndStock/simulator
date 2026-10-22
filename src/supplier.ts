export type SupplierCode =
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
};
