"use server";

import { createServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { profileSchema, ProfileFormValues } from "@/lib/customerProfileSchema";

import { syncProfileCoordinatesPro } from "./profileGeoSync.actions";

/**
 * Server action to update customer profile data during onboarding.
 */
export async function updateCustomerProfile(values: ProfileFormValues) {
    const supabase = await createServerClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return { error: "Authentication required" };
    }

    // 1. Update the profile in Supabase
    // We map specialized fields to a single address string for database compatibility
    const combinedAddress = [values.house, values.building, values.area].filter(Boolean).join(", ");

    const { error: updateError } = await supabase
        .from("profiles")
        .update({
            full_name: values.full_name,
            phone: values.phone,
            address: combinedAddress,
            city: values.city,
            area: values.area,
            state: values.state,
            zip_code: values.pincode,
            updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

    if (updateError) {
        return { error: updateError.message };
    }

    // 2. Trigger REAL geocoding server-side BEFORE redirect
    try {
        await syncProfileCoordinatesPro();
    } catch (geoError) {
        console.error("[Onboarding] Geocoding background sync failed:", geoError);
        // We continue with the redirect even if geocoding fails to avoid blocking the user
    }

    // 3. Revalidate and redirect
    revalidatePath("/dashboard/customer");
    redirect("/dashboard/customer");
}
