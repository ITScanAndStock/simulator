"use server";

import { notFound, redirect } from "next/navigation";
import {
  startSimulation,
  updateContactDetails,
  type ContactDetails,
} from "./simulations";

export async function saveContactDetails(
  simulationId: string | undefined,
  _state: undefined,
  formData: FormData,
): Promise<undefined> {
  const details = readContactDetails(formData);
  let id = simulationId;
  if (id === undefined) {
    id = await startSimulation(details);
  } else if (!(await updateContactDetails(id, details))) {
    notFound();
  }
  redirect(`/simulations/${id}/factures`);
}

function readContactDetails(formData: FormData): ContactDetails {
  const text = (name: string) => String(formData.get(name) ?? "");
  const ticked = (name: string) => formData.get(name) !== null;
  return {
    email: text("email"),
    practice: text("practice"),
    practitioner: text("practitioner"),
    phone: text("phone"),
    cspMember: ticked("cspMember"),
    scanAndStockUser: ticked("scanAndStockUser"),
    callBack: ticked("callBack"),
    dataInformationRead: ticked("dataInformationRead"),
  };
}
