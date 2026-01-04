"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

interface CustomerProfileGuardClientProps {
    isComplete: boolean;
}

/**
 * Client-side component to handle redirection for incomplete profiles.
 * This component is used within the layout to ensure we don't redirect
 * infinitely when already on the onboarding page.
 */
export function CustomerProfileGuardClient({ isComplete }: CustomerProfileGuardClientProps) {
    const pathname = usePathname();
    const router = useRouter();

    useEffect(() => {
        // Redirect if profile is incomplete AND we are not already on the onboarding page
        if (!isComplete && pathname !== "/dashboard/customer/onboarding") {
            router.push("/dashboard/customer/onboarding");
        }

        // Also, if the profile IS complete and we are trying to access onboarding, 
        // redirect back to dashboard
        if (isComplete && pathname === "/dashboard/customer/onboarding") {
            router.push("/dashboard/customer/browse");
        }
    }, [isComplete, pathname, router]);

    return null;
}
