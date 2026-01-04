import { getCustomerProfile, isProfileComplete } from "@/lib/customerProfileService";
import { CustomerProfileGuardClient } from "@/lib/CustomerProfileGuardClient";

export default async function CustomerDashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const profile = await getCustomerProfile();

    // We check completeness on the server
    // If no profile (guest), we consider it incomplete for the guard purposes 
    // (though auth middleware usually handles session enforcement)
    const complete = profile ? isProfileComplete(profile) : false;

    return (
        <>
            <CustomerProfileGuardClient isComplete={complete} />
            {children}
        </>
    );
}
