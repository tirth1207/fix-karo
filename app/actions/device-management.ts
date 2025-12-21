"use server"

import { createClient } from "@/lib/supabase/server"

export async function registerDevice(data: {
  deviceId: string
  deviceFingerprint: string
  deviceName?: string
  ipAddress?: string
  userAgent?: string
}) {
  const supabase = await createClient()

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) throw new Error("Not authenticated")

    // Check if device exists
    const { data: existingDevice } = await supabase
      .from("device_bindings")
      .select("*")
      .eq("user_id", user.id)
      .eq("device_id", data.deviceId)
      .single()

    if (existingDevice) {
      // Update last seen
      await supabase
        .from("device_bindings")
        .update({
          last_seen_at: new Date().toISOString(),
          ip_address: data.ipAddress,
          user_agent: data.userAgent,
        })
        .eq("id", existingDevice.id)

      return { success: true, device: existingDevice, isNew: false }
    }

    // Insert new device - trigger will handle technician rules
    const { data: newDevice, error } = await supabase
      .from("device_bindings")
      .insert({
        user_id: user.id,
        device_id: data.deviceId,
        device_fingerprint: data.deviceFingerprint,
        device_name: data.deviceName,
        ip_address: data.ipAddress,
        user_agent: data.userAgent,
        is_active: true,
      })
      .select()
      .single()

    if (error) throw error

    return { success: true, device: newDevice, isNew: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function checkDeviceStatus(deviceId: string) {
  const supabase = await createClient()

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) throw new Error("Not authenticated")

    const { data: device } = await supabase
      .from("device_bindings")
      .select("*")
      .eq("user_id", user.id)
      .eq("device_id", deviceId)
      .single()

    if (!device) {
      return { success: true, allowed: false, reason: "Device not registered" }
    }

    if (device.forced_logout_at) {
      return {
        success: true,
        allowed: false,
        reason: "Device logged out - new device detected",
      }
    }

    if (!device.is_active) {
      return { success: true, allowed: false, reason: "Device deactivated" }
    }

    return { success: true, allowed: true, device }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}
