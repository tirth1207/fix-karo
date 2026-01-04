import { z } from "zod";

/**
 * Zod schema for customer profile onboarding validation.
 */
export const profileSchema = z.object({
    full_name: z.string().min(2, "Full name must be at least 2 characters"),
    phone: z.string().regex(/^\+?[0-9]{10,15}$/, "Invalid phone number"),
    house: z.string().optional(),
    building: z.string().optional(),
    area: z.string().min(2, "Area/Locality is required"),
    city: z.string().min(2, "City is required"),
    state: z.string().min(2, "State is required"),
    country: z.string().default("India"),
    pincode: z.string().length(6, "Pincode must be exactly 6 digits"),
});

export type ProfileFormValues = z.infer<typeof profileSchema>;
