import { createServerClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { TechnicianNav } from "@/components/technician-nav"
import { TechnicianServiceForm } from "@/components/technician-service-form"

interface PageProps {
    params: Promise<{ id: string }>
}

export default async function EditTechnicianServicePage({ params }: PageProps) {
    const { id } = await params
    const supabase = await createServerClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()
    if (!user) redirect("/auth/login")

    const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()
    if (profile?.role !== "technician") redirect("/dashboard/customer")

    // Verify ownership and get service details
    const { data: techService } = await supabase
        .from("technician_services")
        .select("*")
        .eq("id", id)
        .single()

    if (!techService) {
        redirect("/dashboard/technician/services")
    }

    if (techService.technician_id !== user.id) {
        redirect("/dashboard/technician/services")
    }

    // Fetch the specific service details needed for the form
    const { data: service } = await supabase
        .from("services")
        .select(
            `
      *,
      category:service_categories(name, icon_name)
    `,
        )
        .eq("id", techService.service_id)
        .single()

    // We pass it as an array because the form expects a list of services
    const services = service ? [service] : []

    return (
        <div className="min-h-screen bg-background">
            <TechnicianNav />
            <main className="container mx-auto px-4 py-8 max-w-4xl">
                <h1 className="text-3xl font-bold text-foreground mb-8">Edit Service</h1>
                <TechnicianServiceForm services={services} technicianService={techService} />
            </main>
        </div>
    )
}
