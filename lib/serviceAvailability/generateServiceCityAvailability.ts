import { createAdminClient } from "../supabase/server";
import { calculateHaversineDistance } from "../geo/haversine";

/**
 * Advanced generator that maps a technician's service to multiple cities 
 * based on a geographical coverage radius.
 */
export async function generateCityAvailabilityByRadius(
    technicianId: string,
    serviceId: string,
    radiusKm: number
) {
    // Use admin client to bypass RLS for system sync
    const supabase = await createAdminClient();

    // 1. Fetch technician's location
    const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("latitude, longitude")
        .eq("id", technicianId)
        .single();

    if (profileError || !profile || profile.latitude === null || profile.longitude === null) {
        return { error: "Technician location (lat/lng) not found in profile" };
    }

    // 2. Fetch all known cities from the reference table
    const { data: cities, error: citiesError } = await supabase
        .from("cities")
        .select("name, state, latitude, longitude");

    if (citiesError || !cities) {
        return { error: "Failed to fetch cities from reference table" };
    }

    // 3. Filter cities within coverage radius
    const nearbyCities = cities.filter((city) => {
        const distance = calculateHaversineDistance(
            Number(profile.latitude),
            Number(profile.longitude),
            Number(city.latitude),
            Number(city.longitude)
        );
        return distance <= radiusKm;
    });

    if (nearbyCities.length === 0) {
        return { success: true, count: 0, message: "No cities found within radius. Marking base city if possible." };
    }

    // 4. Batch upsert into service_city_availability
    const upserts = nearbyCities.map((city) => ({
        service_id: serviceId,
        city: city.name,
        state: city.state,
        is_enabled: true,
    }));

    const { error: upsertError } = await supabase
        .from("service_city_availability")
        .upsert(upserts, { onConflict: "service_id, city, state" });

    if (upsertError) {
        return { error: upsertError.message };
    }

    return { success: true, count: nearbyCities.length };
}
