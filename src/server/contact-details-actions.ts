"use server";

import { notFound, redirect } from "next/navigation";
import type { ContactDetailsFormState } from "@/contact-details";
import { checkContactDetails } from "./contact-details-validation";
import { startSimulation, updateContactDetails } from "./simulations";

export async function saveContactDetails(
  simulationId: string | undefined,
  _state: ContactDetailsFormState,
  formData: FormData,
): Promise<ContactDetailsFormState> {
  // Anyone can call a Server Action with any arguments, not only this form.
  if (!(formData instanceof FormData)) return undefined;
  const checked = checkContactDetails(formData);
  if (!checked.valid) return { errors: checked.errors, values: checked.values };

  let id = simulationId;
  if (id === undefined) {
    id = await startSimulation(checked.details);
  } else if (!(await updateContactDetails(id, checked.details))) {
    notFound();
  }
  redirect(`/simulations/${id}/factures`);
}
