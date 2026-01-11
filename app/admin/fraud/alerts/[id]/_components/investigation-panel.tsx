"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { updateFraudAlert } from "@/app/actions/fraud-protection-actions"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

interface InvestigationPanelProps {
    alertId: string
    initialStatus: string
    initialNotes: string
}

export function InvestigationPanel({
    alertId,
    initialStatus,
    initialNotes,
}: InvestigationPanelProps) {
    const [notes, setNotes] = useState(initialNotes || "")
    const [isUpdating, setIsUpdating] = useState(false)

    const handleUpdate = async (newStatus: "open" | "investigating" | "resolved" | "false_positive") => {
        setIsUpdating(true)
        try {
            const result = await updateFraudAlert(alertId, newStatus, notes)
            if (result.error) {
                toast.error(`Failed to update alert: ${result.error}`)
            } else {
                toast.success(`Alert marked as ${newStatus.replace("_", " ")}`)
            }
        } catch (error) {
            toast.error("An unexpected error occurred")
        } finally {
            setIsUpdating(false)
        }
    }

    return (
        <div className="rounded-xl border bg-card p-8 shadow-md relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4">
                <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest ${initialStatus === 'open' ? 'bg-red-500 text-white animate-pulse' :
                    initialStatus === 'investigating' ? 'bg-yellow-500 text-white' :
                        'bg-green-500 text-white'
                    }`}>
                    {initialStatus.replace('_', ' ')}
                </div>
            </div>

            <h2 className="mb-6 text-2xl font-bold font-heading">Investigation Panel</h2>

            <div className="mb-8 rounded-xl border border-blue-200 bg-blue-50/50 p-6">
                <h3 className="text-sm font-bold text-blue-900 mb-2 uppercase tracking-tight">Case Overview</h3>
                <p className="text-sm text-blue-800 leading-relaxed">
                    Review the findings and provide internal documentation below. Updates will be visible to all admins and will notify relevant stakeholders if platform actions are taken.
                </p>
            </div>

            <div className="space-y-6">
                <div>
                    <label className="text-sm font-bold mb-3 block text-foreground uppercase tracking-wider">Internal Investigation Notes</label>
                    <textarea
                        className="min-h-[200px] w-full rounded-xl border border-input bg-background px-4 py-3 text-sm shadow-inner focus:ring-2 focus:ring-primary/20 transition-all outline-none disabled:opacity-50"
                        placeholder="Document your findings, evidence details, and reasoning for the final decision..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        disabled={isUpdating}
                    />
                </div>

                <div className="flex flex-wrap items-center justify-end gap-4 pt-6 border-t mt-4">
                    <Button
                        variant="ghost"
                        className="text-destructive hover:bg-destructive/10 transition-colors font-medium"
                        onClick={() => handleUpdate("false_positive")}
                        disabled={isUpdating}
                    >
                        {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Dismiss as False Positive
                    </Button>
                    <Button
                        variant="outline"
                        className="border-primary/20 hover:border-primary transition-all"
                        onClick={() => handleUpdate("investigating")}
                        disabled={isUpdating}
                    >
                        {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Set Under Investigation
                    </Button>
                    <Button
                        className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-8 rounded-lg shadow-lg shadow-primary/20"
                        onClick={() => handleUpdate("resolved")}
                        disabled={isUpdating}
                    >
                        {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Resolve & Archive
                    </Button>
                </div>
            </div>
        </div>
    )
}
