import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getAdminBootstrapAction } from "@/app/actions/admin";
import { AdminShell } from "@/components/admin/AdminShell";
import type { AdminRoute } from "@/components/admin/views/PilotageViews";

export const dynamic = "force-dynamic";

const VALID_ROUTES = new Set<AdminRoute>([
  "R1", "R2", "R3", "R4", "R5", "R6", "R7", "R9", "R10",
  "R11", "R12", "R13", "R14", "R15", "R16", "R17", "R18",
]);

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await getSession();
  if (!session) {
    redirect("/login?expired=1");
  }
  if (session.role !== "RESPONSABLE") {
    redirect("/technicien");
  }

  const sp = await searchParams;
  const initialTab =
    sp.tab && VALID_ROUTES.has(sp.tab as AdminRoute)
      ? (sp.tab as AdminRoute)
      : "R1";

  const data = await getAdminBootstrapAction();
  return (
    <AdminShell
      session={session}
      initialData={data as never}
      initialRoute={initialTab}
    />
  );
}
