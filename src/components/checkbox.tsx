import type { ComponentProps } from "react";
import styles from "./checkbox.module.css";

const particles = Array.from({ length: 12 }, (_, index) => index);
const rings = [0, 1, 2];
const sparks = [0, 1, 2, 3];
const borders = [0, 1, 2, 3];

export function Checkbox(
  props: Omit<ComponentProps<"input">, "type" | "className">,
) {
  return (
    <span className={styles.checkbox}>
      <input type="checkbox" {...props} />
      <span className={styles.frame} aria-hidden="true">
        <span className={styles.box}>
          <span className={styles.checkContainer}>
            <svg viewBox="0 0 24 24" className={styles.check}>
              <path d="M3,12.5l7,7L21,5" />
            </svg>
          </span>
          <span className={styles.glow} />
          <span className={styles.borders}>
            {borders.map((index) => (
              <span key={index} />
            ))}
          </span>
        </span>
        <span className={styles.effects}>
          <span className={styles.particles}>
            {particles.map((index) => (
              <span key={index} />
            ))}
          </span>
          <span className={styles.rings}>
            {rings.map((index) => (
              <span key={index} className={styles.ring} />
            ))}
          </span>
          <span className={styles.sparks}>
            {sparks.map((index) => (
              <span key={index} />
            ))}
          </span>
        </span>
      </span>
    </span>
  );
}
