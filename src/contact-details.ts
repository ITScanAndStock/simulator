export type ContactDetails = {
  email: string;
  practice: string;
  practitioner: string;
  phone: string;
  cspMember: boolean;
  scanAndStockUser: boolean;
  callBack: boolean;
  dataInformationRead: boolean;
};

export const contactTextFields = [
  "email",
  "practice",
  "practitioner",
  "phone",
] as const;

export type ContactTextField = (typeof contactTextFields)[number];

export type ContactDetailsField = ContactTextField | "dataInformationRead";

export type ContactDetailsErrors = Partial<Record<ContactDetailsField, string>>;

export type ContactDetailsFormState =
  { errors: ContactDetailsErrors; values: ContactDetails } | undefined;
