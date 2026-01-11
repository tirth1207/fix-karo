"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Menu, Shield, LogOut } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

interface NavItem {
    title: string
    href: string
    icon: React.ComponentType<{ className?: string }>
    variant?: "default" | "ghost"
}

interface DashboardShellProps {
    children: React.ReactNode
    navItems: NavItem[]
    role: "customer" | "technician" | "admin"
}

export function DashboardShell({ children, navItems, role }: DashboardShellProps) {
    const pathname = usePathname()
    const router = useRouter()
    const [open, setOpen] = React.useState(false)
    const supabase = createClient()

    const handleSignOut = async () => {
        await supabase.auth.signOut()
        router.push("/")
    }

    const NavContent = () => (
        <div className="flex h-full flex-col gap-4">
            <div className="flex h-[60px] items-center px-6">
                <Link href="/" className="flex items-center gap-2 font-semibold">
                    <div className="bg-primary/10 text-primary flex h-8 w-8 items-center justify-center rounded-lg">
                        <Shield className="h-5 w-5" />
                    </div>
                    <span className="text-lg tracking-tight">ServicePro</span>
                </Link>
            </div>
            <ScrollArea className="flex-1 px-4">
                <nav className="flex flex-col gap-2 py-4">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => setOpen(false)}
                            >
                                <span
                                    className={cn(
                                        "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                                        isActive
                                            ? "bg-primary/10 text-primary"
                                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                    )}
                                >
                                    <item.icon className="h-4 w-4" />
                                    {item.title}
                                </span>
                            </Link>
                        )
                    })}
                </nav>
            </ScrollArea>
            <div className="border-t p-4">
                <div className="flex items-center justify-between gap-4">
                    <Button
                        variant="ghost"
                        className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
                        onClick={handleSignOut}
                    >
                        <LogOut className="h-4 w-4" />
                        <span>Sign Out</span>
                    </Button>
                </div>
            </div>
        </div>
    )

    return (
        <div className="flex min-h-screen">
            {/* Desktop Sidebar */}
            <aside className="border-r bg-card hidden w-[250px] flex-col md:flex fixed inset-y-0 z-50">
                <NavContent />
            </aside>

            {/* Mobile Sidebar */}
            <Sheet open={open} onOpenChange={setOpen}>
                <SheetTrigger asChild>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="md:hidden fixed top-4 left-4 z-50 h-10 w-10 border bg-background shadow-sm"
                    >
                        <Menu className="h-5 w-5" />
                        <span className="sr-only">Toggle Menu</span>
                    </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[250px] p-0">
                    <NavContent />
                </SheetContent>
            </Sheet>

            {/* Main Content */}
            <main className="flex-1 md:pl-[250px] transition-all duration-300 ease-in-out">
                <div className="container mx-auto max-w-7xl p-6 md:p-10 min-h-screen animate-fade-in">
                    {children}
                </div>
            </main>
        </div>
    )
}
