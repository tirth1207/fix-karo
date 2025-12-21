import { createServerClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { AdminNav } from "@/components/admin-nav"
import { ServiceForm } from "@/components/service-form"

export default async function NewServicePage() {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()

  if (profile?.role !== "admin") redirect("/dashboard/customer")

  const { data: categories } = await supabase.from("service_categories").select("*").order("display_order")

  return (
    <div className="min-h-screen bg-background">
      <AdminNav />
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-3xl font-bold text-foreground mb-8">Create New Service</h1>
        <ServiceForm categories={categories || []} />
      </main>
    </div>
  )
}
