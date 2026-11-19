import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getTechnicienBootstrapAction } from "@/app/actions/technicien";
import { TechnicienApp } from "@/components/technicien/TechnicienApp";

export const dynamic = "force-dynamic";

export default async function TechnicienPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login?expired=1");
  }

  const data = await getTechnicienBootstrapAction();
  return <TechnicienApp initialData={data as never} />;
}
