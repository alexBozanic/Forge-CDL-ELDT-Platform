"use server";

import { redirect } from "next/navigation";
import { requiredString } from "@/lib/forms";
import { getSiteUrl } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function requestPasswordRecovery(formData: FormData) {
  const supabase = await createSupabaseServerClient(true);
  await supabase.auth.resetPasswordForEmail(
    requiredString(formData, "email").toLowerCase(),
    {
      redirectTo: `${getSiteUrl()}/auth/confirm?next=/password/update`,
    },
  );
  redirect("/password/recover?sent=1");
}
