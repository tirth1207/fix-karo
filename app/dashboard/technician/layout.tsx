import { TechnicianDashboardShell } from "@/components/dashboard-shells";

export default function TechnicianDashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <TechnicianDashboardShell>
            {children}
        </TechnicianDashboardShell>
    );
}
