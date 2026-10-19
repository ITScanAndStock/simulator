import "server-only";
import type { ContactDetails, ContactDetailsErrors } from "@/contact-details";

type Checked =
  | { valid: true; details: ContactDetails }
  | { valid: false; errors: ContactDetailsErrors; values: ContactDetails };

const completeEmail = /^[^\s@]+@([^\s@.]+\.)+[A-Za-z]{2,}$/;
const emailWithoutExtension = /^[^\s@]+@[^\s@.]+\.?$/;

export function checkContactDetails(formData: FormData): Checked {
  const values = readSubmittedValues(formData);
  const errors: ContactDetailsErrors = {};

  const email = values.email.trim();
  const emailError = professionalEmailError(email);
  if (emailError) errors.email = emailError;

  const practice = values.practice.trim();
  if (practice === "") errors.practice = "Indiquez le nom du cabinet.";

  const practitioner = values.practitioner.trim();
  if (practitioner === "")
    errors.practitioner = "Indiquez le nom du praticien.";

  const compactPhone = values.phone.replace(/[\s.()-]/g, "");
  const phone = nationalPhoneNumber(compactPhone);
  if (phone === undefined) errors.phone = phoneNumberError(compactPhone);

  if (!values.dataInformationRead) {
    errors.dataInformationRead = "Cochez cette case pour continuer.";
  }

  if (Object.keys(errors).length > 0 || phone === undefined) {
    return { valid: false, errors, values };
  }
  return {
    valid: true,
    details: { ...values, email, practice, practitioner, phone },
  };
}

function professionalEmailError(email: string) {
  if (email === "") return "Indiquez votre email professionnel.";
  if (completeEmail.test(email)) return undefined;
  if (emailWithoutExtension.test(email)) {
    return "Adresse incomplète : il manque l'extension (.fr, .com…).";
  }
  return "Vérifiez l'adresse : elle doit ressembler à nom@cabinet.fr.";
}

function nationalPhoneNumber(compact: string) {
  if (/^0\d{9}$/.test(compact)) return compact;
  const international = /^(?:\+33|0033)0?([1-9]\d{8})$/.exec(compact);
  return international ? `0${international[1]}` : undefined;
}

function phoneNumberError(compact: string) {
  if (compact === "") return "Indiquez votre numéro de téléphone.";
  if (/^(?:0\d{0,8}|(?:\+33|0033)0?\d{0,8})$/.test(compact)) {
    return "Numéro incomplet : 10 chiffres attendus.";
  }
  return "Numéro non reconnu : indiquez un numéro français à 10 chiffres.";
}

function readSubmittedValues(formData: FormData): ContactDetails {
  const text = (name: string) => String(formData.get(name) ?? "");
  const ticked = (name: string) => formData.get(name) !== null;
  return {
    email: text("email"),
    practice: text("practice"),
    practitioner: text("practitioner"),
    phone: text("phone"),
    cspMember: ticked("cspMember"),
    scanAndStockUser: ticked("scanAndStockUser"),
    callBack: ticked("callBack"),
    dataInformationRead: ticked("dataInformationRead"),
  };
}
