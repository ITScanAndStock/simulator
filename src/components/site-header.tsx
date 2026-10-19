import Image from "next/image";
import styles from "./site-header.module.css";

const navigationLinks = [
  "Qui sommes-nous ?",
  "La formule club",
  "Les services à la carte",
  "Témoignages",
  "Blog",
];

export function SiteHeader() {
  return (
    <header className={styles.header}>
      <div className={styles.start}>
        <Image
          src="/logo-csp.svg"
          alt="Club Santé Premium"
          width={95}
          height={36}
          loading="eager"
        />
        <nav aria-label="Navigation principale" className={styles.navigation}>
          {navigationLinks.map((label) => (
            <a key={label} href="#" className={styles.navigationLink}>
              {label}
            </a>
          ))}
        </nav>
      </div>
      <div className={styles.end}>
        <a href="#" className={styles.memberLink}>
          Espace affilié·e
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M7 17L17 7" />
            <path d="M8 7h9v9" />
          </svg>
        </a>
        <a href="#" className={`primary-button ${styles.contactLink}`}>
          Contactez-nous
        </a>
      </div>
    </header>
  );
}
