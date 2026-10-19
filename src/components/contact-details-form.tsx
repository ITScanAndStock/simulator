import { saveContactDetails } from "@/server/contact-details-actions";
import type { ContactDetails } from "@/contact-details";
import { ContactDetailsFormElement } from "./contact-details-form-element";

export function ContactDetailsForm({
  simulationId,
  stored,
}: {
  simulationId?: string;
  stored?: ContactDetails;
}) {
  return (
    <ContactDetailsFormElement
      action={saveContactDetails.bind(null, simulationId)}
      stored={stored}
    />
  );
}
