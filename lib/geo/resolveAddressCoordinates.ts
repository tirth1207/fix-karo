import { createServerClient } from "../supabase/server";
import { geocodeWithRealApi } from "./geocodeWithApiKey";

/**
 * Service to resolve profile coordinates using a real API and update Supabase.
 * This is the "PRO" version that replaces mock functionality where called.
 */
export async function resolveProfileCoordinatesPro(userId: string) {
    const supabase = await createServerClient();

    // 1. Fetch address fields from profile
    const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("address, city, state, zip_code")
        .eq("id", userId)
        .single();

    if (profileError || !profile) {
        console.error(`[GeoAPI] Error: Could not fetch profile for user ${userId}`);
        return { error: "Profile not found" };
    }

    // 2. Map zip_code to pincode for the geocoding service
    const { address, city, state, zip_code } = profile;

    if (!city && !state && !zip_code) {
        console.warn(`[GeoAPI] Skiping user ${userId}: Address fields are insufficient.`);
        return { error: "Insufficient address data" };
    }

    // 3. Call the REAL geocoding API
    const coords = await geocodeWithRealApi(
        address || "",
        city || "",
        state || "",
        zip_code || ""
    );

    if (!coords) {
        return { error: "Failed to resolve coordinates via Real API" };
    }

    // 4. Update the profile with new coordinates
    const { error: updateError } = await supabase
        .from("profiles")
        .update({
            latitude: coords.lat,
            longitude: coords.lng,
            updated_at: new Date().toISOString()
        })
        .eq("id", userId);

    if (updateError) {
        console.error(`[GeoAPI] Database Update Error: ${updateError.message}`);
        return { error: updateError.message };
    }

    console.log(`[GeoAPI] Success: Updated user ${userId} with real coordinates (${coords.lat}, ${coords.lng})`);
    return { success: true, coords };
}
