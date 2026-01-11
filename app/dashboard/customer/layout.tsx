import { getCustomerProfile, isProfileComplete } from "@/lib/customerProfileService";
import { CustomerProfileGuardClient } from "@/lib/CustomerProfileGuardClient";
import { CustomerDashboardShell } from "@/components/dashboard-shells";

export default async function CustomerDashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const profile = await getCustomerProfile();
    const complete = profile ? isProfileComplete(profile) : false;

    return (
        <CustomerDashboardShell>
            <CustomerProfileGuardClient isComplete={complete} />
            {children}
        </CustomerDashboardShell>
    );
}
