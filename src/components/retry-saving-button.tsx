"use client";

import { useFormStatus } from "react-dom";

export function RetrySavingButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="primary-button" disabled={pending}>
      {pending ? "Calcul en cours…" : "Réessayer"}
    </button>
  );
}
