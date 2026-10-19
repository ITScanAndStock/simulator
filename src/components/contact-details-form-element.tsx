"use client";

import Link from "next/link";
import {
  useActionState,
  useEffect,
  useRef,
  useState,
  type HTMLInputTypeAttribute,
} from "react";
import {
  contactTextFields,
  type ContactDetails,
  type ContactDetailsField,
  type ContactDetailsFormState,
  type ContactTextField,
} from "@/contact-details";
import { Checkbox } from "./checkbox";
import { DataInformationDialog } from "./data-information-dialog";
import styles from "./contact-details-form.module.css";

export function ContactDetailsFormElement({
  action,
  stored,
}: {
  action: (
    state: ContactDetailsFormState,
    formData: FormData,
  ) => Promise<ContactDetailsFormState>;
  stored?: ContactDetails;
}) {
  const [state, formAction] = useActionState(action, undefined);
  const [dismissedToastFor, setDismissedToastFor] =
    useState<ContactDetailsFormState>();
  const form = useRef<HTMLFormElement>(null);
  const dataInformationBox = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!state) return;
    form.current?.querySelector<HTMLElement>("[aria-invalid='true']")?.focus();
  }, [state]);

  // React resets an uncontrolled form after its action: the submitted values become the defaults it resets to.
  const values = state?.values ?? stored;
  const errors = state?.errors ?? {};
  const errorCount = contactTextFields.filter((name) => errors[name]).length;
  const showToast =
    errors.dataInformationRead !== undefined && dismissedToastFor !== state;

  const textField = (
    name: ContactTextField,
    label: string,
    type: HTMLInputTypeAttribute,
    autoComplete: string,
    placeholder: string,
  ) => (
    <ContactField
      name={name}
      label={label}
      type={type}
      autoComplete={autoComplete}
      placeholder={placeholder}
      defaultValue={values?.[name]}
      error={errors[name]}
    />
  );

  return (
    <form ref={form} action={formAction} noValidate className={styles.form}>
      <div className={styles.heading}>
        <h1 className={styles.title}>Où vous envoyer votre résultat&nbsp;?</h1>
        <p className={styles.lead}>
          Votre économie s&apos;affiche à l&apos;écran et vous est aussi envoyée
          à cette adresse. Un conseiller Club Santé Premium peut ensuite vous
          présenter le détail produit par produit.
        </p>
      </div>
      {errorCount > 0 && (
        <div role="alert" className={styles.summary}>
          <AlertIcon />
          <span>
            <strong>
              {errorCount} {errorCount === 1 ? "champ" : "champs"} à corriger
            </strong>{" "}
            avant de continuer.
          </span>
        </div>
      )}
      {textField(
        "email",
        "Email professionnel",
        "email",
        "email",
        "contact@cabinet-exemple.fr",
      )}
      {textField(
        "practice",
        "Nom du cabinet",
        "text",
        "organization",
        "Cabinet dentaire des Tilleuls",
      )}
      <div className={styles.pair}>
        {textField(
          "practitioner",
          "Nom du praticien",
          "text",
          "name",
          "Dr Claire Martin",
        )}
        {textField("phone", "Téléphone", "tel", "tel", "04 72 00 00 00")}
      </div>
      <fieldset className={styles.statuses}>
        <legend className={styles.legend}>Vous êtes déjà… (facultatif)</legend>
        <div className={styles.statusBox}>
          <label className={styles.status}>
            <Checkbox name="cspMember" defaultChecked={values?.cspMember} />
            affilié Club Santé Premium
          </label>
          <label className={styles.status}>
            <Checkbox
              name="scanAndStockUser"
              defaultChecked={values?.scanAndStockUser}
            />
            utilisateur de Scan&amp;Stock
          </label>
        </div>
      </fieldset>
      <div className={styles.consents}>
        <div className={styles.consent}>
          <Checkbox
            ref={dataInformationBox}
            id="dataInformationRead"
            name="dataInformationRead"
            defaultChecked={values?.dataInformationRead}
            required
            {...invalidAttributes(
              "dataInformationRead",
              errors.dataInformationRead,
            )}
          />
          <span>
            <label htmlFor="dataInformationRead">
              J&apos;ai lu l&apos;information sur le traitement de mes données.
            </label>{" "}
            <DataInformationDialog>
              Lire l&apos;information
            </DataInformationDialog>
            {errors.dataInformationRead && (
              <>
                <br />
                <strong
                  id={errorId("dataInformationRead")}
                  className={styles.consentError}
                >
                  {errors.dataInformationRead}
                </strong>
              </>
            )}
          </span>
        </div>
        <label className={styles.consent}>
          <Checkbox name="callBack" defaultChecked={values?.callBack ?? true} />
          J&apos;accepte d&apos;être recontacté par un conseiller Club Santé
          Premium au sujet de ma simulation.
        </label>
      </div>
      <div className={styles.actions}>
        <button type="submit" className="primary-button">
          Continuer
        </button>
        <Link href="/" className={styles.back}>
          Retour
        </Link>
      </div>
      <div role="status" className={styles.toasts}>
        {showToast && (
          <div className={styles.toast}>
            <AlertIcon />
            <div className={styles.toastBody}>
              <strong className={styles.toastTitle}>
                Information sur vos données
              </strong>
              <span className={styles.toastText}>
                Cochez la case « J&apos;ai lu l&apos;information sur le
                traitement de mes données » pour continuer.
              </span>
              <DataInformationDialog triggerClassName={styles.toastLink}>
                Lire l&apos;information
              </DataInformationDialog>
            </div>
            <button
              type="button"
              aria-label="Fermer"
              className={styles.toastClose}
              onClick={() => {
                setDismissedToastFor(state);
                dataInformationBox.current?.focus();
              }}
            >
              ×
            </button>
          </div>
        )}
      </div>
    </form>
  );
}

function ContactField({
  name,
  label,
  type,
  autoComplete,
  placeholder,
  defaultValue,
  error,
}: {
  name: ContactTextField;
  label: string;
  type: HTMLInputTypeAttribute;
  autoComplete: string;
  placeholder: string;
  defaultValue?: string;
  error?: string;
}) {
  return (
    <div className={styles.field}>
      <label htmlFor={name} className={styles.fieldLabel}>
        {label}
      </label>
      <input
        id={name}
        name={name}
        defaultValue={defaultValue}
        type={type}
        autoComplete={autoComplete}
        placeholder={placeholder}
        required
        className={
          error ? `${styles.input} ${styles.invalidInput}` : styles.input
        }
        {...invalidAttributes(name, error)}
      />
      {error && (
        <span id={errorId(name)} className={styles.error}>
          {error}
        </span>
      )}
    </div>
  );
}

function errorId(name: ContactDetailsField) {
  return `${name}-error`;
}

function invalidAttributes(name: ContactDetailsField, error?: string) {
  return error
    ? { "aria-invalid": true, "aria-describedby": errorId(name) }
    : {};
}

function AlertIcon() {
  return (
    <span aria-hidden="true" className={styles.alertIcon}>
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 8v5" />
        <path d="M12 16.5h.01" />
        <circle cx="12" cy="12" r="9" />
      </svg>
    </span>
  );
}
