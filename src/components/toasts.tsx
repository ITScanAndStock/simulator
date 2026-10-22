import { CrossIcon, ErrorIconPaths } from "./icons";
import styles from "./toasts.module.css";

export type Toast = { id: number; title: string; message: string };

export function Toasts({
  toasts,
  onClose,
}: {
  toasts: Toast[];
  onClose: (id: number) => void;
}) {
  return (
    <div className={styles.toasts}>
      {toasts.map((toast) => (
        <div key={toast.id} role="alert" className={styles.toast}>
          <span aria-hidden="true" className={styles.icon}>
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
              <ErrorIconPaths />
            </svg>
          </span>
          <div className={styles.text}>
            <strong className={styles.title}>{toast.title}</strong>
            <span className={styles.message}>{toast.message}</span>
          </div>
          <button
            type="button"
            aria-label="Fermer"
            className={styles.close}
            onClick={() => onClose(toast.id)}
          >
            <CrossIcon />
          </button>
        </div>
      ))}
    </div>
  );
}
