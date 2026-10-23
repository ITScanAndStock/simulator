import "server-only";
import type { ContactDetails, ContactDetailsErrors } from "@/contact-details";

type Checked =
  | { valid: true; details: ContactDetails }
  | { valid: false; errors: ContactDetailsErrors; values: ContactDetails };

const completeEmail = /^[^\s@]+@([^\s@.]+\.)+[A-Za-z]{2,}$/;
const emailWithoutExtension = /^[^\s@]+@[^\s@.]+\.?$/;
const internationalPrefix = String.raw`(?:\+33|0033)0?`;
const nationalNumber = /^0[1-9]\d{8}$/;
const internationalNumber = new RegExp(`^${internationalPrefix}([1-9]\\d{8})$`);
const incompleteNumber = new RegExp(
  `^(?:0\\d{0,8}|${internationalPrefix}\\d{0,8})$`,
);
const unprintableCharacter = /(?![\t\n\r\v\f\u0085])\p{Cc}/u;
const spacingControlRun = / *[\t\n\r\v\f\u0085][ \t\n\r\v\f\u0085]*/g;
const unprintableMessage = "Retirez les caractères non imprimables.";

export function checkContactDetails(formData: FormData): Checked {
  const values = readSubmittedValues(formData);
  const errors: ContactDetailsErrors = {};

  const email = values.email.trim();
  const emailError = unprintableCharacter.test(email)
    ? unprintableMessage
    : professionalEmailError(email);
  if (emailError) errors.email = emailError;

  const practice = spacedName(values.practice);
  const practiceError = nameError(practice, "Indiquez le nom du cabinet.");
  if (practiceError) errors.practice = practiceError;

  const practitioner = spacedName(values.practitioner);
  const practitionerError = nameError(
    practitioner,
    "Indiquez le nom du praticien.",
  );
  if (practitionerError) errors.practitioner = practitionerError;

  const compactPhone = values.phone.replace(/[\s.()-]/g, "");
  const phone = nationalPhoneNumber(compactPhone);
  if (unprintableCharacter.test(compactPhone)) {
    errors.phone = unprintableMessage;
  } else if (phone === undefined) {
    errors.phone = phoneNumberError(compactPhone);
  }

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

function spacedName(value: string) {
  return value.replace(spacingControlRun, " ").trim();
}

function nameError(name: string, missingMessage: string) {
  if (unprintableCharacter.test(name)) return unprintableMessage;
  if (name === "") return missingMessage;
  return undefined;
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
  if (nationalNumber.test(compact)) return compact;
  const international = internationalNumber.exec(compact);
  return international ? `0${international[1]}` : undefined;
}

function phoneNumberError(compact: string) {
  if (compact === "") return "Indiquez votre numéro de téléphone.";
  if (incompleteNumber.test(compact)) {
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
    scanAndStockUser: ticked("scanAndStockUser"),
    callBack: ticked("callBack"),
    dataInformationRead: ticked("dataInformationRead"),
  };
}
