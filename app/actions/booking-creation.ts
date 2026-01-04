"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export type BookingInput = {
    technicianId: string
    serviceId: string // technician_service_id
    scheduledDate: string
    address: string
    city: string
    state: string
    zipCode: string
    notes?: string
    totalAmount: number
}

export async function createBooking(input: BookingInput) {
    const supabase = await createClient()

    try {
        const {
            data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
            throw new Error("You must be logged in to book a service")
        }

        // Fetch service details for duration
        const { data: service, error: serviceError } = await supabase
            .from("technician_services")
            .select("*, service:services(estimated_duration_minutes)")
            .eq("id", input.serviceId)
            .single()

        if (serviceError || !service) {
            throw new Error("Service details not found")
        }

        const { error: bookingError } = await supabase.from("bookings").insert({
            customer_id: user.id,
            technician_id: input.technicianId,
            service_id: input.serviceId,
            scheduled_date: input.scheduledDate,
            service_address: input.address,
            service_city: input.city,
            estimated_duration_minutes: (service.service as any)?.estimated_duration_minutes || 60,
            service_state: input.state,
            service_zip_code: input.zipCode,
            customer_notes: input.notes || null,
            total_amount: input.totalAmount,
            status: "pending",
        })

        if (bookingError) {
            console.error("[BookingCreation] Error:", bookingError)
            throw new Error(bookingError.message)
        }

        revalidatePath("/dashboard/customer")
        revalidatePath("/dashboard/technician")

        return { success: true }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}
