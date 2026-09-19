"use server";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { saveReportingMutation } from "@/lib/reporting-mutation";
async function update(
  operation: "identifiers" | "prepare" | "transition",
  form: FormData,
  requestKey: string | null,
) {
  const { supabase } = await requireUser();
  const state = await saveReportingMutation(
    operation,
    form,
    requestKey,
    (name, payload) => supabase.rpc(name, payload),
  );
  if (state.success)
    revalidatePath(`/schools/${String(form.get("slug")).trim()}/reporting`);
  return state;
}
export async function updateReportingIdentifiers(form: FormData) {
  return update("identifiers", form, null);
}
export async function prepareReporting(requestKey: string, form: FormData) {
  return update("prepare", form, requestKey);
}
export async function transitionReporting(requestKey: string, form: FormData) {
  return update("transition", form, requestKey);
}
