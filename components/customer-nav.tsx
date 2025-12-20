"use client"

import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"
import { Shield, LogOut } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

export function CustomerNav() {
  const router = useRouter()
  const supabase = createClient()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push("/")
  }

  return (
    <header className="border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/dashboard/customer" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <Shield className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-semibold">ServicePro</span>
        </Link>
        <nav className="flex items-center gap-4">
          <Link href="/dashboard/customer">
            <Button variant="ghost">My Bookings</Button>
          </Link>
          <Link href="/dashboard/customer/browse">
            <Button variant="ghost">Browse Services</Button>
          </Link>
          <Button variant="ghost" size="icon" onClick={handleSignOut}>
            <LogOut className="h-5 w-5" />
          </Button>
        </nav>
      </div>
    </header>
  )
}
