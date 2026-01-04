import { createServerClient } from "../supabase/server";
import { geocodeWithMapsCo } from "./geocodeWithMapsCo";

/**
 * Service to resolve profile coordinates using geocode.maps.co and update Supabase.
 */
export async function resolveProfileWithMapsCo(userId: string) {
    const supabase = await createServerClient();

    // 1. Fetch address fields
    const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("area, city, state, zip_code")
        .eq("id", userId)
        .single();

    if (profileError || !profile) {
        console.error(`[GeoAPI] Error: Profile not found for ${userId}`);
        return { error: "Profile not found" };
    }

    // 2. Resolve coordinates via MapsCo
    const coords = await geocodeWithMapsCo(
        profile.area || "",
        profile.city || "",
        profile.state || "",
        profile.zip_code || ""
    );

    if (!coords) {
        return { error: "Failed to resolve coordinates via MapsCo API" };
    }

    // 3. Update database
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

    return { success: true, coords };
}
