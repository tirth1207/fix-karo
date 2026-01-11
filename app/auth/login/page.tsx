"use client"

import type React from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { Shield } from "lucide-react"

export default function LoginPage() {
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [error, setError] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const router = useRouter()

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        const supabase = createClient()
        setIsLoading(true)
        setError(null)

        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            })

            if (error) throw error

            // Get user profile to determine role
            const { data: profile } = await supabase.from("profiles").select("role").eq("id", data.user.id).single()

            // Redirect based on role; for technicians check onboarding status
            if (profile?.role === "admin") {
                router.push("/admin")
            } else if (profile?.role === "technician") {
                try {
                    const res = await fetch("/api/technician/profile/check")
                    const json = await res.json()
                    if (json.isTechnician && json.hasProfile === false) {
                        router.push("/dashboard/technician/onboarding")
                    } else {
                        router.push("/dashboard/technician")
                    }
                } catch (e) {
                    // Fallback: navigate to technician dashboard and let server guard handle enforcement
                    router.push("/dashboard/technician")
                }
            } else {
                router.push("/dashboard/customer")
            }
        } catch (error: unknown) {
            setError(error instanceof Error ? error.message : "An error occurred")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="flex min-h-screen w-full flex-col items-center justify-center bg-gradient-to-br from-background to-muted p-6 md:p-10">
            <div className="absolute top-8 left-8">
                <Link href="/" className="flex items-center gap-2 font-semibold">
                    <div className="bg-primary/10 text-primary flex h-8 w-8 items-center justify-center rounded-lg">
                        <Shield className="h-5 w-5" />
                    </div>
                    <span className="text-lg tracking-tight">ServicePro</span>
                </Link>
            </div>
            <div className="w-full max-w-sm md:max-w-md animate-fade-in">
                <Card className="border-border shadow-lg">
                    <CardHeader className="space-y-1 text-center">
                        <CardTitle className="text-2xl font-bold tracking-tight">Welcome back</CardTitle>
                        <CardDescription>Enter your email to sign in to your account</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleLogin} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="name@example.com"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="bg-background"
                                />
                            </div>
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="password">Password</Label>
                                    <Link
                                        href="/auth/forgot-password"
                                        className="text-xs text-primary hover:underline hover:text-primary/80"
                                    >
                                        Forgot password?
                                    </Link>
                                </div>
                                <Input
                                    id="password"
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="bg-background"
                                />
                            </div>
                            {error && <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
                            <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
                                {isLoading ? "Signing in..." : "Sign in"}
                            </Button>
                        </form>
                        <div className="mt-6 text-center text-sm text-muted-foreground">
                            Don&apos;t have an account?{" "}
                            <Link href="/auth/signup" className="font-medium text-primary hover:underline">
                                Sign up
                            </Link>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
