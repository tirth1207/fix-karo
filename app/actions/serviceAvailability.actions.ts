"use server";

import { createServerClient } from "@/lib/supabase/server";
import { generateCityAvailabilityByRadius } from "@/lib/serviceAvailability/generateServiceCityAvailability";
import { revalidatePath } from "next/cache";

/**
 * Server action to manually trigger radius-based city availability sync.
 * This ensures that a technician's service is listed in all cities within their radius.
 */
export async function triggerAdvancedAvailabilitySync(
    technicianServiceId: string
) {
    const supabase = await createServerClient();

    // 1. Fetch technician service details (including radius)
    const { data: techService, error: techServiceError } = await supabase
        .from("technician_services")
        .select("technician_id, service_id, coverage_radius_km, approval_status, is_active")
        .eq("id", technicianServiceId)
        .single();

    if (techServiceError || !techService) {
        return { error: "Technician service not found" };
    }

    // 2. Only sync if approved and active
    if (techService.approval_status !== "approved" || !techService.is_active) {
        return { error: "Service must be approved and active to sync availability" };
    }

    // 3. Run the generation logic
    const result = await generateCityAvailabilityByRadius(
        techService.technician_id,
        techService.service_id,
        techService.coverage_radius_km
    );

    if (result.success) {
        revalidatePath("/dashboard/customer/browse");
        revalidatePath("/dashboard/technician/services");
    }

    return result;
}

/**
 * Admin action to bulk sync availability for a technician's approved services.
 */
export async function adminTriggerFullAvailabilitySync(technicianId: string) {
    const supabase = await createServerClient();

    // Auth check
    const { data: { user } } = await supabase.auth.getUser();
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user?.id).single();
    if (profile?.role !== "admin") return { error: "Admin access required" };

    const { data: services, error } = await supabase
        .from("technician_services")
        .select("id")
        .eq("technician_id", technicianId)
        .eq("approval_status", "approved")
        .eq("is_active", true);

    if (error || !services) return { error: "No eligible services found" };

    const results = [];
    for (const s of services) {
        results.push(await triggerAdvancedAvailabilitySync(s.id));
    }

    return { success: true, detailedResults: results };
}
