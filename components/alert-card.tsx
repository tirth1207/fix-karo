import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Link from "next/link"

interface AlertCardProps {
    alert: {
        id: string
        alert_type: string
        user_id: string
        description: string
        severity: string
        status: string
        created_at: string
        resolved_at?: string
        resolution_notes?: string
        user?: {
            full_name: string
            email: string
            role: string
        }
    }
}

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

export default function AlertCard({ alert }: AlertCardProps) {
    return (
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
                        <Badge className={severityColors[alert.severity as keyof typeof severityColors] || ""}>{alert.severity}</Badge>
                        <Badge className={statusColors[alert.status as keyof typeof statusColors] || ""}>{alert.status}</Badge>
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
}
