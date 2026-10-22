import type { ReactNode } from "react";
import { ErrorIconPaths } from "./icons";
import screenStyles from "./simulation-screen.module.css";
import styles from "./state-page.module.css";

const icons = {
  warning: (
    <>
      <path d="M12 4l9 16H3z" />
      <path d="M12 10v4" />
      <path d="M12 17h.01" />
    </>
  ),
  error: <ErrorIconPaths />,
};

export function StatePage({
  tone,
  title,
  message,
  note,
  actions,
}: {
  tone: keyof typeof icons;
  title: string;
  message: string;
  note?: string;
  actions: ReactNode;
}) {
  return (
    <div className={screenStyles.page}>
      <div className={screenStyles.subtitleStrip}>
        Simulateur d&apos;économies
      </div>
      <main className={styles.main}>
        <section className={styles.content}>
          <span aria-hidden="true" className={styles[tone]}>
            <svg
              width="36"
              height="36"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {icons[tone]}
            </svg>
          </span>
          <h1 className={styles.title}>{title}</h1>
          <p className={styles.message}>{message}</p>
          {note && <span className={styles.note}>{note}</span>}
          <div className={styles.actions}>{actions}</div>
        </section>
      </main>
    </div>
  );
}
