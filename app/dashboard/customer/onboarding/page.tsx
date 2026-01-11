"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { updateCustomerProfile } from "@/app/actions/customerProfile.actions";
import { syncProfileCoordinatesPro } from "@/app/actions/profileGeoSync.actions";

import {
    profileSchema,
    ProfileFormValues,
} from "@/lib/customerProfileSchema";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardContent,
    CardFooter,
} from "@/components/ui/card";

export default function OnboardingPage() {
    const [isPending, startTransition] = useTransition();

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<ProfileFormValues>({
        resolver: zodResolver(profileSchema),
        defaultValues: {
            full_name: "",
            phone: "",
            house: "",
            building: "",
            area: "",
            city: "",
            state: "",
            country: "India",
            pincode: "",
        },
    });

    const onSubmit = (values: ProfileFormValues) => {
        startTransition(async () => {
            const result = await updateCustomerProfile(values);

            if (result?.error) {
                console.error(result.error);
                alert(result.error);
                return;
            }

            // Fire-and-forget geo sync (non-blocking) in the background
            // Note: The server action updateCustomerProfile already handles this, 
            // but keeping it here as per user request if extra sync is desired.
            await syncProfileCoordinatesPro();
        });
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-muted/50 p-4">
            <Card className="w-full max-w-2xl shadow-lg">
                <CardHeader className="space-y-1">
                    <CardTitle className="text-2xl font-bold">
                        Complete Your Profile
                    </CardTitle>
                    <CardDescription>
                        We need your details to match you with nearby verified technicians.
                    </CardDescription>
                </CardHeader>

                <form onSubmit={handleSubmit(onSubmit)}>
                    <CardContent className="space-y-6">

                        {/* PERSONAL INFO */}
                        <section className="space-y-4">
                            <h3 className="font-semibold text-sm text-muted-foreground">
                                Personal Information
                            </h3>

                            <div className="space-y-2">
                                <Label htmlFor="full_name">Full Name</Label>
                                <Input
                                    id="full_name"
                                    placeholder="John Doe"
                                    disabled={isPending}
                                    {...register("full_name")}
                                />
                                {errors.full_name && (
                                    <p className="text-sm text-destructive">
                                        {errors.full_name.message}
                                    </p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="phone">Phone Number</Label>
                                <Input
                                    id="phone"
                                    placeholder="9876543210"
                                    disabled={isPending}
                                    {...register("phone")}
                                />
                                {errors.phone && (
                                    <p className="text-sm text-destructive">
                                        {errors.phone.message}
                                    </p>
                                )}
                            </div>
                        </section>

                        {/* ADDRESS INFO */}
                        <section className="space-y-4">
                            <h3 className="font-semibold text-sm text-muted-foreground">
                                Address Details
                            </h3>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="house">House / Flat No.</Label>
                                    <Input
                                        id="house"
                                        placeholder="C-505"
                                        disabled={isPending}
                                        {...register("house")}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="building">Building / Society</Label>
                                    <Input
                                        id="building"
                                        placeholder="Ridham Residency"
                                        disabled={isPending}
                                        {...register("building")}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="area">Area / Locality</Label>
                                <Input
                                    id="area"
                                    placeholder="Narol"
                                    disabled={isPending}
                                    {...register("area")}
                                />
                                {errors.area && (
                                    <p className="text-sm text-destructive">
                                        {errors.area.message}
                                    </p>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="city">City</Label>
                                    <Input
                                        id="city"
                                        placeholder="Ahmedabad"
                                        disabled={isPending}
                                        {...register("city")}
                                    />
                                    {errors.city && (
                                        <p className="text-sm text-destructive">
                                            {errors.city.message}
                                        </p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="state">State</Label>
                                    <Input
                                        id="state"
                                        placeholder="Gujarat"
                                        disabled={isPending}
                                        {...register("state")}
                                    />
                                    {errors.state && (
                                        <p className="text-sm text-destructive">
                                            {errors.state.message}
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="country">Country</Label>
                                    <Input
                                        id="country"
                                        {...register("country")}
                                        disabled
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="pincode">Pincode</Label>
                                    <Input
                                        id="pincode"
                                        placeholder="382405"
                                        maxLength={6}
                                        disabled={isPending}
                                        {...register("pincode")}
                                    />
                                    {errors.pincode && (
                                        <p className="text-sm text-destructive">
                                            {errors.pincode.message}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </section>
                    </CardContent>

                    <CardFooter>
                        <Button type="submit" className="w-full" disabled={isPending}>
                            {isPending ? "Saving..." : "Complete Setup"}
                        </Button>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
}
