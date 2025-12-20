import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { AdminNav } from "@/components/admin-nav"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Link from "next/link"
import { AlertTriangle, TrendingUp, Users, Activity } from "lucide-react"

export default async function FraudMonitoringPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()

  if (profile?.role !== "admin") {
    redirect("/")
  }

  // Fetch all fraud alerts
  const { data: alerts } = await supabase
    .from("fraud_alerts")
    .select(
      `
      *,
      user:profiles(full_name, email, role)
    `,
    )
    .order("created_at", { ascending: false })

  const openAlerts = alerts?.filter((a) => a.status === "open")
  const investigatingAlerts = alerts?.filter((a) => a.status === "investigating")
  const resolvedAlerts = alerts?.filter((a) => a.status === "resolved")
  const falsePositives = alerts?.filter((a) => a.status === "false_positive")

  // Fetch fraud metrics
  const { data: metrics } = await supabase
    .from("fraud_metrics")
    .select(
      `
      *,
      user:profiles(full_name, email, role)
    `,
    )
    .eq("threshold_exceeded", true)
    .order("detected_at", { ascending: false })
    .limit(50)

  // Fetch suspicious users (multiple threshold violations)
  const { data: suspiciousUsers } = await supabase.rpc("get_suspicious_users" as any).limit(20)

  const severityColors = {
    critical: "bg-red-500/10 text-red-700 dark:text-red-400",
    high: "bg-orange-500/10 text-orange-700 dark:text-orange-400",
    medium: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
    low: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  }

  const statusColors = {
    open: "bg-red-500/10 text-red-700 dark:text-red-400",
    investigating: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
    resolved: "bg-green-500/10 text-green-700 dark:text-green-400",
    false_positive: "bg-gray-500/10 text-gray-700 dark:text-gray-400",
  }

  const AlertCard = ({ alert }: { alert: any }) => (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg">{alert.alert_type}</CardTitle>
            <CardDescription>
              {alert.user?.full_name} ({alert.user?.role})
            </CardDescription>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Badge className={severityColors[alert.severity as keyof typeof severityColors]}>{alert.severity}</Badge>
            <Badge className={statusColors[alert.status as keyof typeof statusColors]}>{alert.status}</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="mb-4 text-sm">{alert.description}</p>
        <div className="space-y-2 text-xs text-muted-foreground">
          <div className="flex justify-between">
            <span>Created:</span>
            <span>{new Date(alert.created_at).toLocaleString()}</span>
          </div>
          {alert.resolved_at && (
            <div className="flex justify-between">
              <span>Resolved:</span>
              <span>{new Date(alert.resolved_at).toLocaleString()}</span>
            </div>
          )}
          {alert.resolution_notes && (
            <div className="mt-2 rounded-lg border bg-muted/50 p-2">
              <p className="text-sm">{alert.resolution_notes}</p>
            </div>
          )}
        </div>
        <div className="mt-4 flex gap-2">
          <Link href={`/admin/fraud/alerts/${alert.id}`}>
            <Button size="sm" variant="outline">
              Investigate
            </Button>
          </Link>
          <Link href={`/admin/users/${alert.user_id}`}>
            <Button size="sm" variant="outline">
              View user
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  )

  return (
    <div className="flex min-h-svh flex-col">
      <AdminNav />

      <main className="flex-1 bg-muted/50">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold">Fraud Monitoring</h1>
            <p className="text-muted-foreground">Monitor and investigate suspicious activity</p>
          </div>

          {/* Stats */}
          <div className="mb-8 grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Open Alerts</CardTitle>
                <AlertTriangle className="h-4 w-4 text-destructive" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{openAlerts?.length || 0}</div>
                <p className="text-xs text-muted-foreground">Requiring immediate action</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Under Investigation</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{investigatingAlerts?.length || 0}</div>
                <p className="text-xs text-muted-foreground">Being reviewed</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Resolved</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{resolvedAlerts?.length || 0}</div>
                <p className="text-xs text-muted-foreground">Action taken</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">False Positives</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{falsePositives?.length || 0}</div>
                <p className="text-xs text-muted-foreground">Cleared</p>
              </CardContent>
            </Card>
          </div>

          {/* Alerts tabs */}
          <Tabs defaultValue="open" className="space-y-4">
            <TabsList>
              <TabsTrigger value="open">Open ({openAlerts?.length || 0})</TabsTrigger>
              <TabsTrigger value="investigating">Investigating ({investigatingAlerts?.length || 0})</TabsTrigger>
              <TabsTrigger value="metrics">Metrics</TabsTrigger>
              <TabsTrigger value="resolved">Resolved ({resolvedAlerts?.length || 0})</TabsTrigger>
            </TabsList>

            <TabsContent value="open" className="space-y-4">
              {openAlerts && openAlerts.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {openAlerts.map((alert) => (
                    <AlertCard key={alert.id} alert={alert} />
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="py-8 text-center">
                    <p className="text-muted-foreground">No open fraud alerts</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="investigating" className="space-y-4">
              {investigatingAlerts && investigatingAlerts.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {investigatingAlerts.map((alert) => (
                    <AlertCard key={alert.id} alert={alert} />
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="py-8 text-center">
                    <p className="text-muted-foreground">No alerts under investigation</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="metrics" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Threshold Violations</CardTitle>
                  <CardDescription>Users who exceeded normal activity thresholds</CardDescription>
                </CardHeader>
                <CardContent>
                  {metrics && metrics.length > 0 ? (
                    <div className="space-y-2">
                      {metrics.map((metric: any) => (
                        <div key={metric.id} className="flex items-center justify-between rounded-lg border p-3">
                          <div className="flex-1">
                            <p className="font-medium">{metric.user?.full_name}</p>
                            <p className="text-sm text-muted-foreground">{metric.metric_type.replace(/_/g, " ")}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold">{metric.metric_value}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(metric.detected_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground">No threshold violations detected</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="resolved" className="space-y-4">
              {resolvedAlerts && resolvedAlerts.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {resolvedAlerts.map((alert) => (
                    <AlertCard key={alert.id} alert={alert} />
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="py-8 text-center">
                    <p className="text-muted-foreground">No resolved alerts</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  )
}
