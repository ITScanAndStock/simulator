import { ContactDetailsForm } from "@/components/contact-details-form";
import { SimulationScreen } from "@/components/simulation-screen";

export default function ContactDetails() {
  return (
    <SimulationScreen step={1}>
      <ContactDetailsForm />
    </SimulationScreen>
  );
}
