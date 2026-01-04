import { createServerClient } from "./supabase/server";
import { Profile } from "./types";

/**
 * Service to handle customer profile data fetching and completeness checks.
 */
export async function getCustomerProfile() {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return null;

    const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

    return profile as Profile | null;
}

/**
 * Checks if a profile has all the required fields for onboarding.
 * Required fields: city, state, zip_code (pincode)
 */
export function isProfileComplete(profile: Profile | null): boolean {
    if (!profile) return false;

    const requiredFields: (keyof Profile)[] = ["city", "state", "zip_code"];

    // A profile is complete if all required fields are present and not empty
    return requiredFields.every(field => {
        const value = profile[field];
        return value !== null && value !== undefined && value.toString().trim() !== "";
    });
}
