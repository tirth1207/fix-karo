import { createServerClient } from "../supabase/server";

/**
 * Service to handle geocoding of addresses and updating profile coordinates.
 */
export async function updateProfileCoordinates(userId: string) {
    const supabase = await createServerClient();

    // 1. Fetch the profile details
    const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("city, state, address, zip_code")
        .eq("id", userId)
        .single();

    if (profileError || !profile) {
        console.error(`[GeoSync] Profile not found for user ${userId}`);
        return { error: "Profile not found" };
    }

    // 2. Perform geocoding
    // In a production app, use Google Maps Geocoding API or similar.
    // For this prototype, we'll generate semi-random coordinates for the city
    // or use a mock lookup.
    const { latitude, longitude } = await mockGeocodeAddress(
        profile.city,
        profile.state,
        profile.address
    );

    // 3. Update the profiles table
    const { error: updateError } = await supabase
        .from("profiles")
        .update({
            latitude,
            longitude,
            updated_at: new Date().toISOString(),
        })
        .eq("id", userId);

    if (updateError) {
        console.error(`[GeoSync] Failed to update coordinates: ${updateError.message}`);
        return { error: updateError.message };
    }

    console.log(`[GeoSync] Successfully updated coordinates for ${userId}: ${latitude}, ${longitude}`);
    return { success: true, latitude, longitude };
}

/**
 * Mock geocoding function.
 * Replace with real API call (e.g., fetch(`https://maps.googleapis.com/...`))
 */
async function mockGeocodeAddress(city: string | null, state: string | null, address: string | null) {
    // Use a simple hash-like logic to deterministic coordinates for specific cities
    // This allows the demo to be consistent
    const cityStr = city || "Default";
    const stateStr = state || "Default";

    // Seed-based random coordinates around a common center
    let lat = 20.5937; // India center approx
    let lon = 78.9629;

    if (cityStr === "Mumbai") { lat = 19.0760; lon = 72.8777; }
    else if (cityStr === "Delhi") { lat = 28.6139; lon = 77.2090; }
    else if (cityStr === "Bangalore") { lat = 12.9716; lon = 77.5946; }
    else {
        // Generate slight offset based on string length to simulate variety
        lat += (cityStr.length % 10) * 0.1;
        lon += (stateStr.length % 10) * 0.1;
    }

    return { latitude: lat, longitude: lon };
}
