import { createServerClient } from "./supabase/server";

/**
 * Service to manage service availability mapping across cities based on technician coverage.
 */
export async function syncServiceCityAvailability(technicianId: string, serviceId: string) {
    const supabase = await createServerClient();

    // 1. Fetch the technician's profile to get their base location
    const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("city, state")
        .eq("id", technicianId)
        .single();

    if (profileError || !profile || !profile.city || !profile.state) {
        console.warn(`[AvailabilityGen] Could not find location for technician ${technicianId}`);
        return { error: "Technician location not found" };
    }

    // 2. Fetch the technician's service details (for radius/range check)
    const { data: techService, error: tsError } = await supabase
        .from("technician_services")
        .select("coverage_radius_km, is_active, approval_status")
        .eq("technician_id", technicianId)
        .eq("service_id", serviceId)
        .single();

    if (tsError || !techService) {
        console.warn(`[AvailabilityGen] Could not find technician service record for ${technicianId}/${serviceId}`);
        return { error: "Technician service record not found" };
    }

    // 3. Update city availability
    // Currently, we mark the technician's base city as available.
    // In a more advanced version, we would check all cities within techService.coverage_radius_km

    const { error: upsertError } = await supabase
        .from("service_city_availability")
        .upsert({
            service_id: serviceId,
            city: profile.city,
            state: profile.state,
            is_enabled: true, // Mark as enabled since we have at least one technician
        }, {
            onConflict: 'service_id, city, state'
        });

    if (upsertError) {
        console.error(`[AvailabilityGen] Upsert failed: ${upsertError.message}`);
        return { error: upsertError.message };
    }

    return { success: true };
}

/**
 * Batch syncs all services for a given technician.
 */
export async function syncAllTechnicianServices(technicianId: string) {
    const supabase = await createServerClient();

    const { data: services, error } = await supabase
        .from("technician_services")
        .select("service_id")
        .eq("technician_id", technicianId)
        .eq("approval_status", "approved");

    if (error || !services) return { error: error?.message || "No services found" };

    for (const s of services) {
        await syncServiceCityAvailability(technicianId, s.service_id);
    }

    return { success: true };
}
