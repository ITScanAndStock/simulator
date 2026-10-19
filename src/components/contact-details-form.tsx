import Link from "next/link";
import { Checkbox } from "./checkbox";
import styles from "./contact-details-form.module.css";

export function ContactDetailsForm() {
  return (
    <form method="post" className={styles.form}>
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
            <Checkbox name="cspMember" />
            affilié Club Santé Premium
          </label>
          <label className={styles.status}>
            <Checkbox name="scanAndStockUser" />
            utilisateur de Scan&amp;Stock
          </label>
        </div>
      </fieldset>
      <div className={styles.consents}>
        <div className={styles.consent}>
          <Checkbox id="dataInformationRead" name="dataInformationRead" />
          <span>
            <label htmlFor="dataInformationRead">
              J&apos;ai lu l&apos;information sur le traitement de mes données.
            </label>{" "}
            <a href="#">Lire l&apos;information</a>
          </span>
        </div>
        <label className={styles.consent}>
          <Checkbox name="callBack" defaultChecked />
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
    </form>
  );
}
