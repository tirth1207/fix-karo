"use server";

import { createServerClient } from "@/lib/supabase/server";
import { syncServiceCityAvailability, syncAllTechnicianServices } from "@/lib/service-availability-gen";
import { revalidatePath } from "next/cache";

/**
 * Server action to manually trigger availability synchronization for a technician service.
 * This can be called after creating or updating a technician service.
 */
export async function triggerAvailabilitySync(serviceId: string) {
    const supabase = await createServerClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return { error: "Unauthorized" };

    const result = await syncServiceCityAvailability(user.id, serviceId);

    if (result.success) {
        revalidatePath("/dashboard/technician/services");
        revalidatePath("/dashboard/customer/browse");
    }

    return result;
}

/**
 * Server action to sync all approved services for the current technician.
 * Useful for troubleshooting or initial setup.
 */
export async function syncAllMyServices() {
    const supabase = await createServerClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return { error: "Unauthorized" };

    const result = await syncAllTechnicianServices(user.id);

    if (result.success) {
        revalidatePath("/dashboard/customer/browse");
    }

    return result;
}

/**
 * Admin-only: Sync availability for a specific technician after approval.
 */
export async function adminSyncTechnicianAvailability(technicianId: string) {
    const supabase = await createServerClient();

    const { data: { user } } = await supabase.auth.getUser();
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user?.id).single();

    if (profile?.role !== "admin") return { error: "Admin access required" };

    const result = await syncAllTechnicianServices(technicianId);
    return result;
}
