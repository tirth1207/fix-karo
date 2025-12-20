"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import crypto from "crypto"

export async function uploadJobPhoto(data: {
  bookingId: string
  imageUrl: string
  imageData: string // base64 or buffer for hashing
  gpsLatitude: number
  gpsLongitude: number
  gpsAccuracyMeters?: number
  photoType: "before" | "during" | "after" | "issue"
  notes?: string
}) {
  const supabase = await createClient()

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) throw new Error("Not authenticated")

    // Verify user is the technician for this booking
    const { data: booking } = await supabase.from("bookings").select("technician_id").eq("id", data.bookingId).single()

    if (!booking || booking.technician_id !== user.id) {
      throw new Error("Unauthorized")
    }

    // Calculate SHA-256 hash of image
    const imageHash = crypto.createHash("sha256").update(data.imageData).digest("hex")

    // Insert photo - DB triggers will detect fraud
    const { error } = await supabase.from("job_photos").insert({
      booking_id: data.bookingId,
      technician_id: user.id,
      image_url: data.imageUrl,
      image_hash: imageHash,
      gps_latitude: data.gpsLatitude,
      gps_longitude: data.gpsLongitude,
      gps_accuracy_meters: data.gpsAccuracyMeters,
      taken_at: new Date().toISOString(),
      photo_type: data.photoType,
      notes: data.notes,
    })

    if (error) throw error

    revalidatePath(`/dashboard/technician/bookings/${data.bookingId}`)

    return { success: true, imageHash }
  } catch (error: any) {
    console.error("[v0] Job photo upload error:", error.message)
    return { success: false, error: error.message }
  }
}

export async function getJobPhotos(bookingId: string) {
  const supabase = await createClient()

  try {
    const { data: photos, error } = await supabase
      .from("job_photos")
      .select("*")
      .eq("booking_id", bookingId)
      .order("taken_at", { ascending: true })

    if (error) throw error

    return { success: true, photos: photos || [] }
  } catch (error: any) {
    return { success: false, error: error.message, photos: [] }
  }
}
