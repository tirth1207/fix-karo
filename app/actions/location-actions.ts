"use server"

import { createServerClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function updateProfileLocation(latitude: number, longitude: number) {
    const supabase = await createServerClient()
    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        return { error: "Not authenticated" }
    }

    const { error } = await supabase
        .from("profiles")
        .update({
            latitude,
            longitude,
            updated_at: new Date().toISOString(),
        })
        .eq("id", user.id)

    if (error) {
        console.error("Error updating profile location:", error)
        return { error: error.message }
    }

    revalidatePath("/dashboard/customer")
    return { success: true }
}
