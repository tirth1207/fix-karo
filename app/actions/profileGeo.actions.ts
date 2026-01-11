"use server";

import { createServerClient } from "@/lib/supabase/server";
import { updateProfileCoordinates } from "@/lib/geo/geocodingService";
import { revalidatePath } from "next/cache";

/**
 * Server action to trigger coordinate synchronization for the current user.
 */
export async function syncMyCoordinates() {
    const supabase = await createServerClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return { error: "Unauthorized" };

    const result = await updateProfileCoordinates(user.id);

    if (result.success) {
        revalidatePath("/dashboard/customer");
        revalidatePath("/dashboard/technician");
    }

    return result;
}

/**
 * Admin action to trigger coordinates update for any user.
 */
export async function adminSyncUserCoordinates(userId: string) {
    const supabase = await createServerClient();

    const { data: { user } } = await supabase.auth.getUser();
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user?.id).single();

    if (profile?.role !== "admin") return { error: "Admin access required" };

    const result = await updateProfileCoordinates(userId);
    return result;
}
