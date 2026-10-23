"use client";

import Link from "next/link";
import { StatePage } from "@/components/state-page";

export default function ErrorPage({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <StatePage
      tone="error"
      title="Un problème est survenu de notre côté"
      message="Le simulateur a rencontré une erreur inattendue. Vos réponses déjà envoyées sont gardées : réessayez dans quelques minutes."
      note={
        error.digest &&
        `Code de l'incident à donner au support : ${error.digest}`
      }
      actions={
        <>
          <button type="button" className="primary-button" onClick={retry}>
            Réessayer
          </button>
          <Link href="/" className="secondary-button">
            Retour à l&apos;accueil
          </Link>
        </>
      }
    />
  );
}
