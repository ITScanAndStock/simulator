"use client";

import { useActionState, type ReactNode } from "react";

export function ContactDetailsFormElement({
  action,
  className,
  children,
}: {
  action: (state: undefined, formData: FormData) => Promise<undefined>;
  className: string;
  children: ReactNode;
}) {
  const [, formAction] = useActionState(action, undefined);
  return (
    <form action={formAction} className={className}>
      {children}
    </form>
  );
}
