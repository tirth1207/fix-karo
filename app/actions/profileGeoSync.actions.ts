"use server";

import { createServerClient } from "@/lib/supabase/server";
import { resolveProfileWithMapsCo } from "@/lib/geo/resolveAddressWithMapsCo";
import { revalidatePath } from "next/cache";

/**
 * Server action to trigger REAL geocoding for the current user using geocode.maps.co.
 */
export async function syncProfileCoordinatesPro() {
    const supabase = await createServerClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return { error: "Unauthorized" };
    }

    const result = await resolveProfileWithMapsCo(user.id);

    if (result.success) {
        revalidatePath("/dashboard/customer");
        revalidatePath("/dashboard/technician");
    }

    return result;
}

/**
 * Admin action to trigger REAL geocoding for a specific user using geocode.maps.co.
 */
export async function adminSyncProfileCoordinatesPro(userId: string) {
    const supabase = await createServerClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Unauthorized" };

    const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

    if (profile?.role !== "admin") {
        return { error: "Admin access required" };
    }

    return await resolveProfileWithMapsCo(userId);
}
