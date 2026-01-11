"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Camera, Upload, Trash2, MapPin, Loader2, CheckCircle2 } from "lucide-react"
import { toast } from "sonner"

interface JobPhoto {
    id: string
    image_url: string
    photo_type: string
    gps_latitude: number
    gps_longitude: number
    taken_at: string
}

export function JobPhotoUpload({ bookingId, technicianId }: { bookingId: string; technicianId: string }) {
    const supabase = createClient()
    const [photos, setPhotos] = useState<JobPhoto[]>([])
    const [isUploading, setIsUploading] = useState(false)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        fetchPhotos()
    }, [bookingId])

    const fetchPhotos = async () => {
        setIsLoading(true)
        const { data, error } = await supabase
            .from("job_photos")
            .select("*")
            .eq("booking_id", bookingId)
            .order("created_at", { ascending: false })

        if (error) {
            console.error("Error fetching photos:", error)
        } else {
            setPhotos(data || [])
        }
        setIsLoading(false)
    }

    const calculateHash = async (file: File): Promise<string> => {
        const arrayBuffer = await file.arrayBuffer()
        const hashBuffer = await crypto.subtle.digest("SHA-256", arrayBuffer)
        const hashArray = Array.from(new Uint8Array(hashBuffer))
        return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("")
    }

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setIsUploading(true)
        try {
            // 1. Get GPS coordinates
            const position = await new Promise<GeolocationPosition>((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, {
                    enableHighAccuracy: true,
                    timeout: 5000,
                    maximumAge: 0,
                })
            }).catch(() => null)

            if (!position) {
                toast.error("GPS coordinates are required for job photos. Please enable location services.")
                setIsUploading(false)
                return
            }

            // 2. Calculate image hash
            const hash = await calculateHash(file)

            // 3. Upload to Supabase Storage
            const fileExt = file.name.split(".").pop()
            const fileName = `${bookingId}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`
            const filePath = `job-photos/${fileName}`

            const { error: uploadError } = await supabase.storage
                .from("job-photos")
                .upload(filePath, file)

            if (uploadError) throw uploadError

            // Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from("job-photos")
                .getPublicUrl(filePath)

            // 4. Insert into database
            const { error: dbError } = await supabase.from("job_photos").insert({
                booking_id: bookingId,
                technician_id: technicianId,
                image_url: publicUrl,
                image_hash: hash,
                gps_latitude: position.coords.latitude,
                gps_longitude: position.coords.longitude,
                gps_accuracy_meters: position.coords.accuracy,
                taken_at: new Date().toISOString(),
                photo_type: "after", // Default to 'after' for completion
            })

            if (dbError) throw dbError

            toast.success("Photo uploaded successfully")
            fetchPhotos()
        } catch (error: any) {
            console.error("Upload error:", error)
            toast.error(error.message || "Failed to upload photo")
        } finally {
            setIsUploading(false)
            if (e.target) e.target.value = ""
        }
    }

    const deletePhoto = async (photo: JobPhoto) => {
        try {
            // Extract file path from URL
            const urlParts = photo.image_url.split("/job-photos/")
            if (urlParts.length < 2) throw new Error("Invalid image URL")
            const filePath = `job-photos/${urlParts[1]}`

            const { error: storageError } = await supabase.storage
                .from("job-photos")
                .remove([filePath])

            // Even if storage delete fails, try to remove from DB (or handled via trigger/policy)
            const { error: dbError } = await supabase
                .from("job_photos")
                .delete()
                .eq("id", photo.id)

            if (dbError) throw dbError

            toast.success("Photo deleted")
            fetchPhotos()
        } catch (error: any) {
            toast.error(error.message || "Failed to delete photo")
        }
    }

    return (
        <Card className="border-none shadow-md">
            <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                    <Camera className="h-5 w-5 text-primary" />
                    Job Documentation
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                    {photos.map((photo) => (
                        <div key={photo.id} className="group relative aspect-square rounded-lg overflow-hidden border bg-muted">
                            <img
                                src={photo.image_url}
                                alt="Job documentation"
                                className="h-full w-full object-cover transition-transform group-hover:scale-105"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                                <Button
                                    variant="destructive"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => deletePhoto(photo)}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                                <div className="text-[10px] text-white flex items-center gap-1">
                                    <MapPin className="h-2 w-2" />
                                    {photo.gps_latitude.toFixed(4)}, {photo.gps_longitude.toFixed(4)}
                                </div>
                            </div>
                            <div className="absolute top-2 right-2">
                                <Badge className="bg-primary/80 text-[10px] h-4 px-1">{photo.photo_type}</Badge>
                            </div>
                        </div>
                    ))}

                    <label className="flex cursor-pointer flex-col items-center justify-center aspect-square rounded-lg border-2 border-dashed border-muted-foreground/20 hover:border-primary/50 hover:bg-primary/5 transition-all">
                        {isUploading ? (
                            <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        ) : (
                            <>
                                <Upload className="h-6 w-6 text-muted-foreground" />
                                <span className="mt-2 text-xs font-medium text-muted-foreground">Upload Photo</span>
                            </>
                        )}
                        <Input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            className="hidden"
                            onChange={handleUpload}
                            disabled={isUploading}
                        />
                    </label>
                </div>

                {!isLoading && photos.length === 0 && (
                    <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-3 flex gap-3">
                        <Camera className="h-5 w-5 text-yellow-600 shrink-0" />
                        <p className="text-xs text-yellow-800">
                            <strong>Required:</strong> You must upload at least one photo (with GPS location) before you can mark this job as completed.
                        </p>
                    </div>
                )}

                {photos.length > 0 && (
                    <div className="flex items-center gap-2 text-xs text-green-600 bg-green-500/5 p-2 rounded-md border border-green-500/10">
                        <CheckCircle2 className="h-4 w-4" />
                        Requirement met: {photos.length} photo(s) uploaded
                    </div>
                )}
            </CardContent>
        </Card>
    )
}

function Badge({ children, className }: { children: React.ReactNode; className?: string }) {
    return (
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 font-medium ${className}`}>
            {children}
        </span>
    )
}
