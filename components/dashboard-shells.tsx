"use client"

import { DashboardShell } from "@/components/ui/dashboard-shell"
import { Home, Search, Calendar, Users, Briefcase, User } from "lucide-react"

export function CustomerDashboardShell({ children }: { children: React.ReactNode }) {
    const navItems = [
        { title: "Dashboard", href: "/dashboard/customer", icon: Home },
        { title: "Browse Services", href: "/dashboard/customer/browse", icon: Search },
        { title: "My Bookings", href: "/dashboard/customer/bookings", icon: Calendar },
        { title: "My Technicians", href: "/dashboard/customer/technicians", icon: Users },
    ]

    return (
        <DashboardShell navItems={navItems} role="customer">
            {children}
        </DashboardShell>
    )
}

export function TechnicianDashboardShell({ children }: { children: React.ReactNode }) {
    const navItems = [
        { title: "Dashboard", href: "/dashboard/technician", icon: Home },
        { title: "My Bookings", href: "/dashboard/technician/bookings", icon: Calendar },
        { title: "Services", href: "/dashboard/technician/services", icon: Briefcase },
        { title: "Profile", href: "/dashboard/technician/profile", icon: User },
    ]

    return (
        <DashboardShell navItems={navItems} role="technician">
            {children}
        </DashboardShell>
    )
}
