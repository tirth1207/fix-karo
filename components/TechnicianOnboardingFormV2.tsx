"use client"

import React, { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
    completeTechnicianOnboarding,
    TechnicianOnboardingValues
} from "@/app/actions/technicianOnboarding.actions";

export function TechnicianOnboardingFormV2({ fullName }: { fullName?: string }) {
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    // Form State
    const [formData, setFormData] = useState({
        address: "",
        city: "",
        state: "",
        zip_code: "",
        business_name: "",
        specializations: "",
        years_of_experience: 0,
        license_number: "",
        insurance_policy_number: "",
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'number' ? Number(value) : value
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        const values: TechnicianOnboardingValues = {
            ...formData,
            specializations: formData.specializations ? formData.specializations.split(",").map(s => s.trim()) : [],
        };

        startTransition(async () => {
            const result = await completeTechnicianOnboarding(values);
            if (result.error) {
                setError(result.error);
            } else {
                router.push("/dashboard/technician");
            }
        });
    };

    return (
        <form onSubmit={handleSubmit} className="grid gap-6 bg-card p-6 rounded-xl border shadow-sm">
            <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-2">Location Details</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                        <label className="text-sm font-medium mb-1 block">Area</label>
                        <input
                            name="address"
                            required
                            value={formData.address}
                            onChange={handleChange}
                            className="w-full rounded-md border bg-background p-2 focus:ring-2 focus:ring-primary outline-none"
                            placeholder="123 Street, Area"
                        />
                    </div>
                    <div>
                        <label className="text-sm font-medium mb-1 block">City</label>
                        <input
                            name="city"
                            required
                            value={formData.city}
                            onChange={handleChange}
                            className="w-full rounded-md border bg-background p-2 focus:ring-2 focus:ring-primary outline-none"
                            placeholder="Mumbai"
                        />
                    </div>
                    <div>
                        <label className="text-sm font-medium mb-1 block">State</label>
                        <input
                            name="state"
                            required
                            value={formData.state}
                            onChange={handleChange}
                            className="w-full rounded-md border bg-background p-2 focus:ring-2 focus:ring-primary outline-none"
                            placeholder="Maharashtra"
                        />
                    </div>
                    <div>
                        <label className="text-sm font-medium mb-1 block">Pincode (6 digits)</label>
                        <input
                            name="zip_code"
                            required
                            maxLength={6}
                            value={formData.zip_code}
                            onChange={handleChange}
                            className="w-full rounded-md border bg-background p-2 focus:ring-2 focus:ring-primary outline-none"
                            placeholder="400001"
                        />
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-2">Business Details</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                        <label className="text-sm font-medium mb-1 block">Business Name (Optional)</label>
                        <input
                            name="business_name"
                            value={formData.business_name}
                            onChange={handleChange}
                            className="w-full rounded-md border bg-background p-2 focus:ring-2 focus:ring-primary outline-none"
                        />
                    </div>
                    <div>
                        <label className="text-sm font-medium mb-1 block">Years of Experience</label>
                        <input
                            name="years_of_experience"
                            type="number"
                            min={0}
                            required
                            value={formData.years_of_experience}
                            onChange={handleChange}
                            className="w-full rounded-md border bg-background p-2 focus:ring-2 focus:ring-primary outline-none"
                        />
                    </div>
                    <div className="sm:col-span-2">
                        <label className="text-sm font-medium mb-1 block">Specializations (comma separated)</label>
                        <input
                            name="specializations"
                            value={formData.specializations}
                            onChange={handleChange}
                            placeholder="Electrical, Plumbing, HVAC"
                            className="w-full rounded-md border bg-background p-2 focus:ring-2 focus:ring-primary outline-none"
                        />
                    </div>
                    <div>
                        <label className="text-sm font-medium mb-1 block">License Number (Optional)</label>
                        <input
                            name="license_number"
                            value={formData.license_number}
                            onChange={handleChange}
                            className="w-full rounded-md border bg-background p-2 focus:ring-2 focus:ring-primary outline-none"
                        />
                    </div>
                    <div>
                        <label className="text-sm font-medium mb-1 block">Insurance Policy (Optional)</label>
                        <input
                            name="insurance_policy_number"
                            value={formData.insurance_policy_number}
                            onChange={handleChange}
                            className="w-full rounded-md border bg-background p-2 focus:ring-2 focus:ring-primary outline-none"
                        />
                    </div>
                </div>
            </div>

            {error && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md text-destructive text-sm">
                    {error}
                </div>
            )}

            <div className="pt-4">
                <button
                    type="submit"
                    disabled={isPending}
                    className="w-full rounded-lg bg-primary px-4 py-3 text-white font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                    {isPending ? "Submitting..." : "Complete Profile & Start Working"}
                </button>
            </div>
        </form>
    )
}
