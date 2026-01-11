import { createClient } from "@/lib/supabase/server"
import AlertCard from "@/components/alert-card"
import { AdminNav } from "@/components/admin-nav"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { AlertCircle, ArrowLeft, ShieldAlert, User, Mail, Shield, Calendar, Clock } from "lucide-react"

import { InvestigationPanel } from "./_components/investigation-panel"

export default async function AlertPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const supabase = await createClient()

    // Fetch alert with user details. We try both common relation names just in case.
    const { data: alert } = await supabase
        .from("fraud_alerts")
        .select(`
            *,
            user:profiles!fraud_alerts_user_id_fkey(id, full_name, email, role)
        `)
        .eq("id", id)
        .single()

    if (!alert) {
        return (
            <div className="flex min-h-svh flex-col items-center justify-center p-4">
                <AlertCircle className="mb-4 h-12 w-12 text-destructive" />
                <h1 className="text-2xl font-bold">Alert Not Found</h1>
                <p className="text-muted-foreground">The alert you are looking for does not exist or has been removed.</p>
                <Link href="/admin/fraud" className="mt-4">
                    <Button variant="outline">Back to Fraud Monitoring</Button>
                </Link>
            </div>
        )
    }

    return (
        <div className="flex min-h-svh flex-col">
            <AdminNav />
            <main className="flex-1 bg-muted/50 pb-12">
                <div className="container mx-auto px-4 py-8">
                    <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div className="flex items-center gap-4">
                            <Link href="/admin/fraud">
                                <Button variant="ghost" size="icon">
                                    <ArrowLeft className="h-4 w-4" />
                                </Button>
                            </Link>
                            <div>
                                <h1 className="text-3xl font-bold font-heading">Investigate Alert</h1>
                                <p className="text-muted-foreground">Reviewing: {alert.alert_type}</p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <Link href={`/admin/users/${alert.user_id}`}>
                                <Button variant="outline" size="sm" className="glass hover:bg-white/20 transition-all">
                                    <User className="mr-2 h-4 w-4" />
                                    View User Profile
                                </Button>
                            </Link>
                        </div>
                    </div>

                    <div className="grid gap-8 lg:grid-cols-3">
                        <div className="space-y-6 lg:col-span-1">
                            {/* Alert Summary Card */}
                            <AlertCard alert={alert} />

                            {/* User Info Card */}
                            <div className="rounded-xl border bg-card/50 backdrop-blur-sm p-6 shadow-sm">
                                <div className="mb-4 flex items-center gap-2">
                                    <User className="h-5 w-5 text-primary" />
                                    <h2 className="font-semibold">User Information</h2>
                                </div>
                                <div className="space-y-4">
                                    <div className="flex items-start gap-3">
                                        <div className="mt-0.5 rounded-full bg-primary/10 p-1.5">
                                            <Shield className="h-4 w-4 text-primary" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium">{alert.user?.full_name}</p>
                                            <p className="text-xs text-muted-foreground capitalize">{alert.user?.role}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <div className="mt-0.5 rounded-full bg-primary/10 p-1.5">
                                            <Mail className="h-4 w-4 text-primary" />
                                        </div>
                                        <div>
                                            <p className="text-sm">{alert.user?.email}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Detection Context */}
                            <div className="rounded-xl border bg-card/50 backdrop-blur-sm p-6 shadow-sm">
                                <div className="mb-4 flex items-center gap-2">
                                    <ShieldAlert className="h-5 w-5 text-primary" />
                                    <h2 className="font-semibold">Detection Details</h2>
                                </div>
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between text-sm">
                                        <div className="flex items-center gap-2 text-muted-foreground">
                                            <Calendar className="h-4 w-4" />
                                            <span>Detected on</span>
                                        </div>
                                        <span className="font-medium">{new Date(alert.created_at).toLocaleDateString()}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <div className="flex items-center gap-2 text-muted-foreground">
                                            <Clock className="h-4 w-4" />
                                            <span>Detected at</span>
                                        </div>
                                        <span className="font-medium">{new Date(alert.created_at).toLocaleTimeString()}</span>
                                    </div>
                                    <div className="mt-4 rounded-lg bg-muted/50 p-4 text-xs border border-dashed">
                                        <p className="mb-1 font-bold text-muted-foreground uppercase tracking-wider">Alert ID</p>
                                        <code className="text-primary break-all">{id}</code>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-6 lg:col-span-2">
                            {/* Investigation Workflow */}
                            <InvestigationPanel
                                alertId={id}
                                initialStatus={alert.status}
                                initialNotes={alert.resolution_notes}
                            />

                            {/* Additional Context/History */}
                            <div className="rounded-xl border bg-card/50 backdrop-blur-sm p-6 shadow-sm border-l-4 border-l-primary">
                                <h2 className="mb-3 font-bold flex items-center gap-2 text-primary">
                                    <ShieldAlert className="h-4 w-4" />
                                    Next Recommended Steps
                                </h2>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                    {alert.severity === 'critical' ?
                                        'CRITICAL: We recommend suspending the user account immediately. Review all transactions in the last 24 hours and notify the affected parties.' :
                                        'MONITOR: Keep an eye on the account. If another alert occurs within 48 hours, escalate to critical investigation.'
                                    }
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    )
}