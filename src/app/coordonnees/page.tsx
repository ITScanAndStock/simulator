import { ContactDetailsForm } from "@/components/contact-details-form";
import { StepBand } from "@/components/step-band";
import styles from "./page.module.css";

export default function ContactDetails() {
  return (
    <div className={styles.page}>
      <div className={styles.subtitleStrip}>
        <span>Simulateur d&apos;économies</span>
        <span className={styles.badge}>Étape 1 sur 4</span>
      </div>
      <main className={styles.main}>
        <StepBand />
        <ContactDetailsForm />
      </main>
    </div>
  );
}
