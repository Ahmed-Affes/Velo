import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getAdminBootstrapAction } from "@/app/actions/admin";
import { AdminShell } from "@/components/admin/AdminShell";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login?expired=1");
  }
  if (session.role !== "RESPONSABLE") {
    redirect("/technicien");
  }

  const data = await getAdminBootstrapAction();
  return <AdminShell session={session} initialData={data as never} />;
}
