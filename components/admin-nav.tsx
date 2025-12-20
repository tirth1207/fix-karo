"use client"

import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"
import { Shield, LogOut, Users, AlertTriangle, DollarSign } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

export function AdminNav() {
  const router = useRouter()
  const supabase = createClient()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push("/")
  }

  return (
    <header className="border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/admin" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <Shield className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-semibold">ServicePro Admin</span>
        </Link>
        <nav className="flex items-center gap-4">
          <Link href="/admin">
            <Button variant="ghost">Overview</Button>
          </Link>
          <Link href="/admin/technicians">
            <Button variant="ghost">
              <Users className="mr-2 h-4 w-4" />
              Technicians
            </Button>
          </Link>
          <Link href="/admin/fraud">
            <Button variant="ghost">
              <AlertTriangle className="mr-2 h-4 w-4" />
              Fraud Monitoring
            </Button>
          </Link>
          <Link href="/admin/payments">
            <Button variant="ghost">
              <DollarSign className="mr-2 h-4 w-4" />
              Payments
            </Button>
          </Link>
          <Button variant="ghost" size="icon" onClick={handleSignOut}>
            <LogOut className="h-5 w-5" />
          </Button>
        </nav>
      </div>
    </header>
  )
}
