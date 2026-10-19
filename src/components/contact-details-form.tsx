import Link from "next/link";
import { saveContactDetails } from "@/server/contact-details-actions";
import type { ContactDetails } from "@/server/simulations";
import { Checkbox } from "./checkbox";
import { ContactDetailsFormElement } from "./contact-details-form-element";
import { DataInformationDialog } from "./data-information-dialog";
import styles from "./contact-details-form.module.css";

export function ContactDetailsForm({
  simulationId,
  stored,
}: {
  simulationId?: string;
  stored?: ContactDetails;
}) {
  return (
    <ContactDetailsFormElement
      action={saveContactDetails.bind(null, simulationId)}
      className={styles.form}
    >
      <div className={styles.heading}>
        <h1 className={styles.title}>Où vous envoyer votre résultat&nbsp;?</h1>
        <p className={styles.lead}>
          Votre économie s&apos;affiche à l&apos;écran et vous est aussi envoyée
          à cette adresse. Un conseiller Club Santé Premium peut ensuite vous
          présenter le détail produit par produit.
        </p>
      </div>
      <div className={styles.field}>
        <label htmlFor="email" className={styles.fieldLabel}>
          Email professionnel
        </label>
        <input
          id="email"
          name="email"
          defaultValue={stored?.email}
          type="email"
          autoComplete="email"
          placeholder="contact@cabinet-exemple.fr"
          className={styles.input}
        />
      </div>
      <div className={styles.field}>
        <label htmlFor="practice" className={styles.fieldLabel}>
          Nom du cabinet
        </label>
        <input
          id="practice"
          name="practice"
          defaultValue={stored?.practice}
          type="text"
          autoComplete="organization"
          placeholder="Cabinet dentaire des Tilleuls"
          className={styles.input}
        />
      </div>
      <div className={styles.pair}>
        <div className={styles.field}>
          <label htmlFor="practitioner" className={styles.fieldLabel}>
            Nom du praticien
          </label>
          <input
            id="practitioner"
            name="practitioner"
            defaultValue={stored?.practitioner}
            type="text"
            autoComplete="name"
            placeholder="Dr Claire Martin"
            className={styles.input}
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="phone" className={styles.fieldLabel}>
            Téléphone
          </label>
          <input
            id="phone"
            name="phone"
            defaultValue={stored?.phone}
            type="tel"
            autoComplete="tel"
            placeholder="04 72 00 00 00"
            className={styles.input}
          />
        </div>
      </div>
      <fieldset className={styles.statuses}>
        <legend className={styles.legend}>Vous êtes déjà… (facultatif)</legend>
        <div className={styles.statusBox}>
          <label className={styles.status}>
            <Checkbox name="cspMember" defaultChecked={stored?.cspMember} />
            affilié Club Santé Premium
          </label>
          <label className={styles.status}>
            <Checkbox
              name="scanAndStockUser"
              defaultChecked={stored?.scanAndStockUser}
            />
            utilisateur de Scan&amp;Stock
          </label>
        </div>
      </fieldset>
      <div className={styles.consents}>
        <div className={styles.consent}>
          <Checkbox
            id="dataInformationRead"
            name="dataInformationRead"
            defaultChecked={stored?.dataInformationRead}
          />
          <span>
            <label htmlFor="dataInformationRead">
              J&apos;ai lu l&apos;information sur le traitement de mes données.
            </label>{" "}
            <DataInformationDialog>
              Lire l&apos;information
            </DataInformationDialog>
          </span>
        </div>
        <label className={styles.consent}>
          <Checkbox name="callBack" defaultChecked={stored?.callBack ?? true} />
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
    </ContactDetailsFormElement>
  );
}
