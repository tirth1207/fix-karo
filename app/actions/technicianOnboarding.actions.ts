"use server";

import { createServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { syncProfileCoordinatesPro } from "./profileGeoSync.actions";

const technicianOnboardingSchema = z.object({
    // Profile fields
    address: z.string().min(5, "Address must be at least 5 characters"),
    city: z.string().min(2, "City is required"),
    state: z.string().min(2, "State is required"),
    zip_code: z.string().length(6, "Pincode must be exactly 6 digits"),

    // Technician info
    business_name: z.string().optional().nullable(),
    specializations: z.array(z.string()).default([]),
    years_of_experience: z.number().min(0, "Years of experience is required"),
    license_number: z.string().optional().nullable(),
    insurance_policy_number: z.string().optional().nullable(),
});

export type TechnicianOnboardingValues = z.infer<typeof technicianOnboardingSchema>;

/**
 * Combined action to complete technician onboarding.
 * Updates the 'profiles' table with address info and creates the 'technician_profiles' entry.
 */
export async function completeTechnicianOnboarding(values: TechnicianOnboardingValues) {
    const supabase = await createServerClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return { error: "Unauthorized" };

    // 1. Update Profile table
    const { error: profileError } = await supabase
        .from("profiles")
        .update({
            address: values.address,
            city: values.city,
            state: values.state,
            zip_code: values.zip_code,
            updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

    if (profileError) {
        console.error("[Onboarding] Profile update error:", profileError.message);
        return { error: profileError.message };
    }

    // 2. Create/Update Technician Profile
    // We use upsert because the row might already exist from a previous failed attempt
    const { error: techError } = await supabase
        .from("technician_profiles")
        .upsert({
            id: user.id,
            business_name: values.business_name,
            specializations: values.specializations,
            years_of_experience: values.years_of_experience,
            license_number: values.license_number,
            insurance_policy_number: values.insurance_policy_number,
            verification_status: "pending",
            is_active: false,
            updated_at: new Date().toISOString(),
        });

    if (techError) {
        console.error("[Onboarding] Technician profile update error:", techError.message);
        return { error: techError.message };
    }

    // 3. Trigger Real Geocoding Sync (Pro)
    try {
        await syncProfileCoordinatesPro();
    } catch (err) {
        console.error("[Onboarding] Post-onboarding geocoding failed:", err);
        // We don't return an error here as the profile is already saved
    }

    revalidatePath("/dashboard/technician");
    return { success: true };
}
